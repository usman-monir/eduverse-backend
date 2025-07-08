import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ClassSession, IClassSession } from '../models/ClassSession';
import { User, IUser } from '../models/User';

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
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = {};

    // Apply filters
    if (status) filter.status = status;
    if (subject) filter.subject = { $regex: subject as string, $options: 'i' };
    if (tutor) filter.tutorName = { $regex: tutor as string, $options: 'i' };
    if (date) filter.date = new Date(date as string);
    if (studentId) filter.studentId = studentId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sessions = await ClassSession.find(filter)
      .populate('tutor', 'name email')
      .populate('studentId', 'name email')
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
      .populate('studentId', 'name email phone');

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
    const { subject, date, time, duration, description, meetingLink, price } =
      req.body;

    // Validate tutor exists
    const tutor = await User.findById(req.user?._id);
    if (!tutor || (tutor.role !== 'tutor' && tutor.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Only tutors and admins can create sessions',
      });
      return;
    }

    const session = new ClassSession({
      subject,
      tutor: req.user?._id,
      tutorName: tutor.name,
      date: new Date(date),
      time,
      duration,
      description,
      meetingLink,
      price,
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

    if (session.status !== 'available') {
      res.status(400).json({
        success: false,
        message: 'Session is not available for booking',
      });
      return;
    }

    // Update session
    session.status = 'booked';
    session.studentId = req.user?._id as mongoose.Types.ObjectId;
    session.studentName = req.user?.name;

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
    if (
      req.user?.role === 'tutor' &&
      session.tutor.toString() !==
        (req.user._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own sessions',
      });
      return;
    }

    session.status = status;

    // Update user stats if session is completed
    if (status === 'completed' && session.studentId) {
      await User.findByIdAndUpdate(session.studentId, {
        $inc: { completedSessions: 1, enrolledSessions: -1 },
      });
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
    if (
      req.user?.role === 'tutor' &&
      session.tutor.toString() !==
        (req.user._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own sessions',
      });
      return;
    }

    // Update allowed fields
    const allowedFields = [
      'subject',
      'date',
      'time',
      'duration',
      'status',
      'studentId',
      'meetingLink',
      'description',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (
          field === 'studentId' &&
          (!req.body[field] || req.body[field] === '')
        ) {
          (session as any)[field] = undefined;
        } else {
          (session as any)[field] = req.body[field];
        }
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
    if (
      req.user?.role === 'tutor' &&
      session.tutor.toString() !==
        (req.user._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own sessions',
      });
      return;
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
