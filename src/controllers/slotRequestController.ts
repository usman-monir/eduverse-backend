import { Request, Response } from 'express';
import { SlotRequest, ISlotRequest } from '../models/SlotRequest';
import { User, IUser } from '../models/User';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Get all slot requests (with filters)
// @route   GET /api/slot-requests
// @access  Private (with role-based filtering)
export const getSlotRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      status,
      subject,
      studentId,
      assignedTutor,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = {};

    // Apply filters
    if (status) filter.status = status;
    if (subject) filter.subject = { $regex: subject as string, $options: 'i' };
    if (studentId) filter.studentId = studentId;
    if (assignedTutor) filter.assignedTutor = assignedTutor;

    // Role-based filtering
    if (req.user?.role === 'student') {
      filter.studentId = (req.user._id as any).toString();
    } else if (req.user?.role === 'tutor') {
      filter.assignedTutor = (req.user._id as any).toString();
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const requests = await SlotRequest.find(filter)
      .populate('studentId', 'name email phone')
      .populate('assignedTutor', 'name email phone subjects')
      .populate('requestedTutor', 'name email phone subjects')
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await SlotRequest.countDocuments(filter);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get slot requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching slot requests',
    });
  }
};

// @desc    Get slot request by ID
// @route   GET /api/slot-requests/:id
// @access  Private
export const getSlotRequestById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const request = await SlotRequest.findById(req.params.id)
      .populate('studentId', 'name email phone')
      .populate('assignedTutor', 'name email phone subjects experience')
      .populate('requestedTutor', 'name email phone subjects experience');

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Slot request not found',
      });
      return;
    }

    // Check access permissions
    if (
      req.user?.role === 'student' &&
      request.studentId.toString() !==
        (req.user._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    if (
      req.user?.role === 'tutor' &&
      request.assignedTutor?.toString() !==
        (req.user._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Get slot request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching slot request',
    });
  }
};

// @desc    Create slot request (Students only)
// @route   POST /api/slot-requests
// @access  Private (Student)
export const createSlotRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { subject, preferredDate, preferredTime, duration, description, tutor } =
      req.body;

    if (req.user?.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only students can create slot requests',
      });
      return;
    }

    // Find the requested tutor
    let requestedTutor = null;
    let requestedTutorName = '';
    
    if (tutor) {
      const tutorUser = await User.findOne({ email: tutor, role: 'tutor' });
      if (tutorUser) {
        requestedTutor = tutorUser._id;
        requestedTutorName = tutorUser.name;
      }
    }

    const request = new SlotRequest({
      studentId: req.user._id,
      studentName: req.user.name,
      subject,
      preferredDate: new Date(preferredDate),
      preferredTime,
      duration,
      description,
      requestedTutor,
      requestedTutorName,
    });

    await request.save();

    res.status(201).json({
      success: true,
      data: request,
      message: 'Slot request created successfully',
    });
  } catch (error) {
    console.error('Create slot request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating slot request',
    });
  }
};

// @desc    Update slot request status (Tutors & Admins only)
// @route   PUT /api/slot-requests/:id/status
// @access  Private (Tutor, Admin)
export const updateSlotRequestStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, assignedTutorId, rejectionReason } = req.body;

    const request = await SlotRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Slot request not found',
      });
      return;
    }

    // Check if user can update this request
    if (
      req.user?.role === 'tutor' &&
      request.assignedTutor?.toString() !==
        (req.user._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only update requests assigned to you',
      });
      return;
    }

    request.status = status;

    if (status === 'approved') {
      if (assignedTutorId) {
        const tutor = await User.findById(assignedTutorId);
        if (tutor && tutor.role === 'tutor') {
          request.assignedTutor = assignedTutorId;
          request.assignedTutorName = tutor.name;
        }
      }
      request.approvedAt = new Date();
    } else if (status === 'rejected') {
      request.rejectedAt = new Date();
      if (rejectionReason) {
        request.rejectionReason = rejectionReason;
      }
    } else if (status === 'completed') {
      request.completedAt = new Date();
    }

    await request.save();

    res.json({
      success: true,
      data: request,
      message: 'Slot request status updated successfully',
    });
  } catch (error) {
    console.error('Update slot request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating slot request status',
    });
  }
};

// @desc    Delete slot request (Owner & Admins only)
// @route   DELETE /api/slot-requests/:id
// @access  Private (Owner, Admin)
export const deleteSlotRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const request = await SlotRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Slot request not found',
      });
      return;
    }

    // Check if user can delete this request
    if (
      req.user?.role !== 'admin' &&
      request.studentId.toString() !==
        (req.user?._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own requests',
      });
      return;
    }
    console.log(req.params.id);
    await SlotRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Slot request deleted successfully',
    });
  } catch (error) {
    console.error('Delete slot request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting slot request',
    });
  }
};
