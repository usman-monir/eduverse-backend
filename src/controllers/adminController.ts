import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { Types } from 'mongoose';
import { ClassSession, IClassSession } from '../models/ClassSession';
import { StudyMaterial, IStudyMaterial } from '../models/StudyMaterial';

import EmailService from  '../services/emailService';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getSystemStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTutors,
      totalSessions,
      totalMaterials,
      pendingSlotRequests,
      completedSessions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'tutor' }),
      ClassSession.countDocuments(),
      StudyMaterial.countDocuments(),
      ClassSession.countDocuments({ type: 'slot_request', status: 'pending' }),
      ClassSession.countDocuments({ status: 'completed' }),
    ]);

    // Get recent activity
    const recentSessions = await ClassSession.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('tutorId', 'name')
      .populate('studentId', 'name');

    const recentSlotRequests = await ClassSession.find({ type: 'slot_request' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name')
      .populate('tutor', 'name');

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          students: totalStudents,
          tutors: totalTutors,
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
        },
        materials: {
          total: totalMaterials,
        },
        slotRequests: {
          pending: pendingSlotRequests,
        },
        recentActivity: {
          sessions: recentSessions,
          slotRequests: recentSlotRequests,
        },
      },
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching system statistics',
    });
  }
};

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

    const filter: any = {};

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
export const getUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user',
    });
  }
};

// @desc    Update user role and status
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
export const updateUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, isActive, subjects, experience } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Prevent admin from changing their own role
    if (
      (user._id as Types.ObjectId).toString() ===
      (req.user?._id as Types.ObjectId).toString()
    ) {
      res.status(400).json({
        success: false,
        message: 'You cannot modify your own role',
      });
      return;
    }

    if (role) user.role = role;
    if (typeof isActive === 'boolean')
      user.status = isActive ? 'active' : 'inactive';
    if (subjects) user.subjects = subjects;
    if (experience) user.experience = experience;

    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user',
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (
      (user._id as Types.ObjectId).toString() ===
      (req.user?._id as Types.ObjectId).toString()
    ) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
      return;
    }

    // Check if user has associated data
    const [sessions, materials, slotRequests] = await Promise.all([
      ClassSession.countDocuments({
        $or: [{ tutor: user._id }, { studentId: user._id }],
      }),
      StudyMaterial.countDocuments({ uploadedBy: user._id }),
      ClassSession.countDocuments({
        type: 'slot_request',
        $or: [{ createdBy: user._id }, { tutor: user._id }],
      }),
    ]);

    if (sessions > 0 || materials > 0 || slotRequests > 0) {
      res.status(400).json({
        success: false,
        message:
          'Cannot delete user with associated data. Consider deactivating instead.',
      });
      return;
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user',
    });
  }
};

// @desc    Approve pending user
// @route   PUT /api/admin/users/:id/approve
// @access  Private (Admin only)
export const approveUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'User is not pending approval',
      });
      return;
    }

    // Update user status to active
    user.status = 'active';
    await user.save();

    // Send approval email
    try {
      await EmailService.sendApprovalEmail({
        email: user.email,
        name: user.name,
        loginUrl: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login`,
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Continue with approval even if email fails
    }

    res.json({
      success: true,
      data: user,
      message: 'User approved successfully',
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving user',
    });
  }
};

// @desc    Invite new user (Admin only)
// @route   POST /api/admin/users/invite
// @access  Private (Admin only)
export const inviteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email, role, temporaryPassword, phone, subjects, experience } = req.body;

    // Validate required fields
    if (!name || !email || !role || !temporaryPassword) {
      res.status(400).json({
        success: false,
        message: 'Name, email, role, and temporary password are required',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // Create user with active status (no approval needed for admin-created users)
    const user = new User({
      name,
      email,
      password: temporaryPassword,
      role,
      phone,
      subjects: role === 'tutor' ? subjects : undefined,
      experience: role === 'tutor' ? experience : undefined,
      status: 'active', // Admin-created users are automatically active
    });

    await user.save();

    // Send invitation email
    try {
      const loginUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login`;
      
      await EmailService.sendInvitationEmail({
        email: user.email,
        name: user.name,
        role: user.role,
        temporaryPassword,
        loginUrl,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue with user creation even if email fails
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          joinedDate: user.joinedDate,
        },
      },
      message: 'User invited successfully. Invitation email sent.',
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while inviting user',
    });
  }
};

// @desc    Get all sessions with filters
// @route   GET /api/admin/sessions
// @access  Private (Admin)
export const getAdminSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      status,
      subject,
      tutorId,
      studentId,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (subject) filter.subject = { $regex: subject as string, $options: 'i' };
    if (tutorId) filter.tutorId = tutorId;
    if (studentId) filter.studentId = studentId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sessions = await ClassSession.find(filter)
      .populate('tutorId', 'name email')
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await ClassSession.countDocuments(filter);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sessions',
    });
  }
};

// @desc    Get all materials with filters
// @route   GET /api/admin/materials
// @access  Private (Admin)
export const getAdminMaterials = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { subject, uploadedBy, page = 1, limit = 10 } = req.query;

    const filter: any = {};

    if (subject) filter.subject = { $regex: subject as string, $options: 'i' };
    if (uploadedBy) filter.uploadedBy = uploadedBy;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const materials = await StudyMaterial.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await StudyMaterial.countDocuments(filter);

    res.json({
      success: true,
      data: materials,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get admin materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching materials',
    });
  }
};

// @desc    Get all tutors with their subjects
// @route   GET /api/tutors
// @access  Public
export const getAllTutorsWithSubjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tutors = await User.find({ role: 'tutor' }, 'name email subjects');
    res.json({
      success: true,
      data: tutors,
    });
  } catch (error) {
    console.error('Get tutors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tutors',
    });
  }
};

// @desc    Restrict student access until a given date
// @route   PUT /api/admin/users/:id/restrict-access
// @access  Private (Admin only)
export const updateUserAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { accessTill } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.role === 'admin') {
      res.status(400).json({ success: false, message: 'admin cannot be restricted' });
      return;
    }
    user.accessTill = accessTill ? new Date(accessTill) : null;
    await user.save();
    res.json({ success: true, data: user, message: 'Access updated' });
  } catch (error) {
    console.error('Restrict access error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating access' });
  }
};

// @desc    Enable student access (remove restriction)
// @route   PUT /api/admin/users/:id/enable-access
// @access  Private (Admin only)
export const enableUserAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    user.accessTill = null;
    await user.save();
    res.json({ success: true, data: user, message: 'Access enabled' });
  } catch (error) {
    console.error('Enable access error:', error);
    res.status(500).json({ success: false, message: 'Server error while enabling access' });
  }
};
