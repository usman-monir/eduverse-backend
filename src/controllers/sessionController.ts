import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ClassSession, IClassSession } from '../models/ClassSession';
import { User, IUser } from '../models/User';
import EmailService from '../services/emailService';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Get all sessions (with filters)
// @route   GET /api/sessions
// @access  Public (with role-based filtering)
export const getSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      status,
      subject,
      tutor,
      date,
      studentId,
      type,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = {};

    // Role-based filtering if authenticated
    // @ts-ignore
    const user = req.user;
    if (user) {
      if (user.role === 'tutor') {
        filter.$or = [
          { tutor: user._id },
          { createdBy: user._id }
        ];
      }
      // Students see all sessions; Admin sees all sessions
    }

    // Apply filters
    if (status) filter.status = status;
    if (subject) filter.subject = { $regex: subject as string, $options: 'i' };
    if (tutor) filter.tutorName = { $regex: tutor as string, $options: 'i' };
    if (date) filter.date = new Date(date as string);
    if (studentId) filter['enrolledStudents.studentId'] = studentId;
    if (type) filter.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sessions = await ClassSession.find(filter)
      .populate('tutor', 'name email')
      .populate('enrolledStudents.studentId', 'name email')
      .sort({ date: 1, time: 1 })
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
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sessions',
    });
  }
};

// @desc    Get sessions for current user (role-based)
// @route   GET /api/sessions/my
// @access  Private
export const getMySessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const filter: any = {};

    // Role-based filtering
    if (req.user?.role === 'student') {
      // Students see their enrolled sessions and their slot requests
      filter.$or = [
        { 'enrolledStudents.studentId': userId },
        { createdBy: userId, type: 'slot_request' }
      ];
    } else if (req.user?.role === 'tutor') {
      // Tutors see their created sessions and slot requests for them
      filter.$or = [
        { tutor: userId },
        { createdBy: userId }
      ];
    } else if (req.user?.role === 'admin') {
      // Admins see all sessions
      // No additional filtering needed
    }

    // Apply additional filters
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sessions = await ClassSession.find(filter)
      .populate('tutor', 'name email')
      .populate('enrolledStudents.studentId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ date: 1, time: 1 })
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
    console.error('Get my sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sessions',
    });
  }
};

// @desc    Get session by ID
// @route   GET /api/sessions/:id
// @access  Public
export const getSessionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const session = await ClassSession.findById(req.params.id)
      .populate('tutor', 'name email phone subjects experience')
      .populate('enrolledStudents.studentId', 'name email phone');

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching session',
    });
  }
};

// @desc    Create new session (Tutors & Admins only)
// @route   POST /api/sessions
// @access  Private (Tutor, Admin)
export const createSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { subject, date, time, duration, status, description, meetingLink, price, tutorId } =
      req.body;

    // Validate user can create sessions
    const user = await User.findById(req.user?._id);
    if (!user || (user.role !== 'tutor' && user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Only tutors and admins can create sessions',
      });
      return;
    }

    // Determine which tutor to assign
    let sessionTutor;
    let sessionTutorName;

    if (user.role === 'admin' && tutorId) {
      // Admin can assign any tutor
      const selectedTutor = await User.findById(tutorId);
      if (!selectedTutor || (selectedTutor.role !== 'tutor' && selectedTutor.role !== 'admin')) {
        res.status(400).json({
          success: false,
          message: 'Invalid tutor selected',
        });
        return;
      }
      sessionTutor = selectedTutor._id;
      sessionTutorName = selectedTutor.name;
    } else {
      // Tutors can only create sessions for themselves
      sessionTutor = req.user?._id;
      sessionTutorName = user.name;
    }

    // Determine session type based on user role
    const sessionType = user.role === 'admin' ? 'admin_created' : 'tutor_created';

    const session = new ClassSession({
      subject,
      tutor: sessionTutor,
      tutorName: sessionTutorName,
      date: new Date(date),
      status,
      time,
      duration,
      description,
      meetingLink,
      price,
      type: sessionType,
      createdBy: req.user?._id as mongoose.Types.ObjectId,
    });

    await session.save();

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully',
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating session',
    });
  }
};

// @desc    Create slot request session (Students only)
// @route   POST /api/sessions/request
// @access  Private (Student)
export const createSlotRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { subject, date, time, duration, description, tutorId } = req.body;

    // Validate user is a student
    const user = await User.findById(req.user?._id);
    if (!user || user.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only students can request slots',
      });
      return;
    }

    // Validate tutor exists and is a tutor
    const tutor = await User.findById(tutorId);
    if (!tutor || (tutor.role !== 'tutor' && tutor.role !== 'admin')) {
      res.status(400).json({
        success: false,
        message: 'Invalid tutor selected',
      });
      return;
    }

    // Check if tutor teaches the subject
    if (!tutor.subjects?.includes(subject)) {
      res.status(400).json({
        success: false,
        message: 'Selected tutor does not teach this subject',
      });
      return;
    }

    const session = new ClassSession({
      subject,
      tutor: tutor._id,
      tutorName: tutor.name,
      date: new Date(date),
      time,
      duration,
      description,
      status: 'pending',
      type: 'slot_request',
      createdBy: req.user?._id as mongoose.Types.ObjectId,
    });

    await session.save();

    // Send email notification to tutor about the new slot request
    try {
      console.log('Attempting to send slot request notification to tutor...');
      console.log('Tutor found:', tutor ? 'Yes' : 'No');
      
      if (tutor) {
        console.log('Sending slot request notification to tutor:', tutor.email);
        const emailData = {
          studentName: user.name,
          tutorName: tutor.email, // Email address for the tutor
          subject: session.subject,
          date: session.date.toISOString().split('T')[0],
          time: session.time,
          duration: session.duration,
          description: session.description || '',
        };
        console.log('Email data:', emailData);
        
        const emailResult = await EmailService.sendSessionRequestNotification(emailData);
        console.log('Slot request notification sent successfully:', emailResult);
      } else {
        console.log('Tutor not found, skipping email notification');
      }
    } catch (emailError) {
      console.error('Failed to send slot request notification:', emailError);
      // Continue with slot request creation even if email fails
    }

    res.status(201).json({
      success: true,
      data: session,
      message: 'Slot request created successfully. Waiting for approval.',
    });
  } catch (error) {
    console.error('Create slot request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating slot request',
    });
  }
};

// @desc    Book a session (Students only)
// @route   PUT /api/sessions/:id/book
// @access  Private (Student)
export const bookSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const session = await ClassSession.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    if (session.status !== 'available' && session.status !== 'booked') {
      res.status(400).json({
        success: false,
        message: 'Session is not available for booking',
      });
      return;
    }

    // Check if student is already enrolled
    const isAlreadyEnrolled = session.enrolledStudents.some(
      (enrollment) => enrollment.studentId.toString() === req.user?._id?.toString()
    );

    if (isAlreadyEnrolled) {
      res.status(400).json({
        success: false,
        message: 'You are already enrolled in this session',
      });
      return;
    }

    // Add student to enrolled students
    session.enrolledStudents.push({
      studentId: req.user?._id as mongoose.Types.ObjectId,
      studentName: req.user?.name || '',
      enrolledAt: new Date(),
    });

    // Update session status to booked if it has students
    if (session.enrolledStudents.length > 0) {
      session.status = 'booked';
    }

    await session.save();

    // Update user stats
    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id.toString(), {
        $inc: { enrolledSessions: 1 },
      });
    }

    res.json({
      success: true,
      data: session,
      message: 'Session booked successfully',
    });
  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while booking session',
    });
  }
};

// @desc    Approve/Reject slot request (Tutors & Admins only)
// @route   PUT /api/sessions/:id/approve
// @access  Private (Tutor, Admin)
export const approveSlotRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { approved, notes } = req.body;

    const session = await ClassSession.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    if (session.type !== 'slot_request') {
      res.status(400).json({
        success: false,
        message: 'This is not a slot request',
      });
      return;
    }

    if (session.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'This slot request has already been processed',
      });
      return;
    }

    // Check if user can approve this request
    const canApprove = 
      req.user?.role === 'admin' || 
      (req.user?.role === 'tutor' && session.tutor.toString() === (req.user._id as mongoose.Types.ObjectId).toString());

    if (!canApprove) {
      res.status(403).json({
        success: false,
        message: 'You can only approve requests for your own sessions',
      });
      return;
    }

    if (approved) {
      session.status = 'approved';
      
      // Send approval email to student
      try {
        console.log('Attempting to send approval email...');
        const student = await User.findById(session.createdBy);
        const tutor = await User.findById(session.tutor);
        
        console.log('Student found:', student ? 'Yes' : 'No');
        console.log('Tutor found:', tutor ? 'Yes' : 'No');
        
        if (student && tutor) {
          console.log('Sending approval email to:', student.email);
          const emailData = {
            studentEmail: student.email,
            studentName: student.name,
            tutorName: tutor.name,
            subject: session.subject,
            date: session.date.toISOString().split('T')[0],
            time: session.time,
            duration: session.duration,
            description: session.description,
            meetingLink: session.meetingLink,
            approvedBy: req.user?.name || 'Admin',
          };
          console.log('Email data:', emailData);
          
          const emailResult = await EmailService.sendSlotRequestApprovalEmail(emailData);
          console.log('Email sent successfully:', emailResult);
        } else {
          console.log('Student or tutor not found, skipping email');
        }
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Continue with approval even if email fails
      }
    } else {
      session.status = 'cancelled';
      
      // Send rejection email to student
      try {
        console.log('Attempting to send rejection email...');
        const student = await User.findById(session.createdBy);
        const tutor = await User.findById(session.tutor);
        
        console.log('Student found:', student ? 'Yes' : 'No');
        console.log('Tutor found:', tutor ? 'Yes' : 'No');
        
        if (student && tutor) {
          console.log('Sending rejection email to:', student.email);
          const emailData = {
            studentEmail: student.email,
            studentName: student.name,
            tutorName: tutor.name,
            subject: session.subject,
            date: session.date.toISOString().split('T')[0],
            time: session.time,
            duration: session.duration,
            description: session.description,
            rejectedBy: req.user?.name || 'Admin',
            rejectionReason: notes,
          };
          console.log('Email data:', emailData);
          
          const emailResult = await EmailService.sendSlotRequestRejectionEmail(emailData);
          console.log('Email sent successfully:', emailResult);
        } else {
          console.log('Student or tutor not found, skipping email');
        }
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Continue with rejection even if email fails
      }
    }

    await session.save();

    res.json({
      success: true,
      data: session,
      message: approved ? 'Slot request approved successfully' : 'Slot request rejected',
    });
  } catch (error) {
    console.error('Approve slot request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing slot request',
    });
  }
};

// @desc    Update session status (Tutors & Admins only)
// @route   PUT /api/sessions/:id/status
// @access  Private (Tutor, Admin)
export const updateSessionStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.body;

    const session = await ClassSession.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    // Check if user can update this session
    if (req.user?.role === 'tutor') {
      const userId = req.user?._id?.toString?.() || req.user?._id;
      const createdById = session.createdBy?.toString?.() || session.createdBy;
      const tutorId = session.tutor?.toString?.() || session.tutor;
      const isCreator = createdById === userId;
      const isTutor = tutorId === userId;
      if (!isCreator && !isTutor) {
      res.status(403).json({
        success: false,
          message: 'You can only update sessions you created or where you are the tutor',
      });
      return;
      }
    }

    session.status = status;

    // Update user stats if session is completed
    if (status === 'completed' && session.enrolledStudents.length > 0) {
      const studentIds = session.enrolledStudents.map(enrollment => enrollment.studentId);
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $inc: { completedSessions: 1, enrolledSessions: -1 } }
      );
    }

    await session.save();

    res.json({
      success: true,
      data: session,
      message: 'Session status updated successfully',
    });
  } catch (error) {
    console.error('Update session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating session status',
    });
  }
};

// @desc    Update session (Tutors & Admins only)
// @route   PUT /api/sessions/:id
// @access  Private (Tutor, Admin)
export const updateSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const session = await ClassSession.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    // Check if user can update this session
    if (req.user?.role === 'tutor') {
      const userId = req.user?._id?.toString?.() || req.user?._id;
      const createdById = session.createdBy?.toString?.() || session.createdBy;
      const tutorId = session.tutor?.toString?.() || session.tutor;
      const isCreator = createdById === userId;
      const isTutor = tutorId === userId;
      if (!isCreator && !isTutor) {
      res.status(403).json({
        success: false,
          message: 'You can only update sessions you created or where you are the tutor',
      });
      return;
      }
    }

    // Update allowed fields (removed studentId since we now use enrolledStudents array)
    const allowedFields = [
      'subject',
      'date',
      'time',
      'duration',
      'status',
      'meetingLink',
      'description',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
          (session as any)[field] = req.body[field];
      }
    });

    await session.save();

    res.json({
      success: true,
      data: session,
      message: 'Session updated successfully',
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating session',
    });
  }
};

// @desc    Delete session (Tutors & Admins only)
// @route   DELETE /api/sessions/:id
// @access  Private (Tutor, Admin)
export const deleteSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const session = await ClassSession.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    // Check if user can delete this session
    if (req.user?.role === 'tutor') {
      const userId = req.user?._id?.toString?.() || req.user?._id;
      const createdById = session.createdBy?.toString?.() || session.createdBy;
      const tutorId = session.tutor?.toString?.() || session.tutor;
      console.log('session.createdBy:', createdById);
      console.log('session.tutor:', tutorId);
      console.log('req.user._id:', userId);
      const isCreator = createdById === userId;
      const isTutor = tutorId === userId;
      if (!isCreator && !isTutor) {
      res.status(403).json({
        success: false,
          message: 'You can only delete sessions you created or where you are the tutor',
      });
      return;
      }
    }

    await ClassSession.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting session',
    });
  }
};

// @desc    Get all available tutors for session creation
// @route   GET /api/sessions/tutors/available
// @access  Private (Admin only)
export const getAvailableTutors = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Removed admin-only check; any authenticated user can access
    const tutors = await User.find(
      { 
        role: { $in: ['tutor', 'admin'] },
        status: 'active'
      },
      'name email role subjects experience'
    ).sort({ name: 1 });

    // Map the subjects array to subject names for consistency
    const tutorsWithSubjectNames = tutors.map(tutor => ({
      ...tutor.toObject(),
      subjects: tutor.subjects || [] // subjects are already stored as names in User model
    }));

    res.json({
      success: true,
      data: tutorsWithSubjectNames,
    });
  } catch (error) {
    console.error('Get available tutors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tutors',
    });
  }
};
