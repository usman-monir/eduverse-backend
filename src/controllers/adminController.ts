import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { ClassSession, IClassSession } from '../models/ClassSession';
import { StudyMaterial, IStudyMaterial } from '../models/StudyMaterial';
import { SlotRequest, ISlotRequest } from '../models/SlotRequest';

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
      totalRequests,
      pendingRequests,
      completedSessions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'tutor' }),
      ClassSession.countDocuments(),
      StudyMaterial.countDocuments(),
      SlotRequest.countDocuments(),
      SlotRequest.countDocuments({ status: 'pending' }),
      ClassSession.countDocuments({ status: 'completed' }),
    ]);

    // Get recent activity
    const recentSessions = await ClassSession.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('tutorId', 'name')
      .populate('studentId', 'name');

    const recentRequests = await SlotRequest.find()
      .sort({ requestedAt: -1 })
      .limit(5)
      .populate('studentId', 'name');

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
        requests: {
          total: totalRequests,
          pending: pendingRequests,
        },
        recentActivity: {
          sessions: recentSessions,
          requests: recentRequests,
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
    if (user._id.toString() === req.user?._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot modify your own role',
      });
      return;
    }

    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
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
    if (user._id.toString() === req.user?._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
      return;
    }

    // Check if user has associated data
    const [sessions, materials, requests] = await Promise.all([
      ClassSession.countDocuments({
        $or: [{ tutorId: user._id }, { studentId: user._id }],
      }),
      StudyMaterial.countDocuments({ uploadedBy: user._id }),
      SlotRequest.countDocuments({
        $or: [{ studentId: user._id }, { assignedTutor: user._id }],
      }),
    ]);

    if (sessions > 0 || materials > 0 || requests > 0) {
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
