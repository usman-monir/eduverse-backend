import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SmartQuad, ISmartQuad } from '../models/SmartQuad';
import { User, IUser } from '../models/User';
import { ClassSession } from '../models/ClassSession';
import EmailService from '../services/emailService';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Create a new Smart Quad batch
// @route   POST /api/smart-quad
// @access  Private (Admin)
export const createSmartQuad = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      tutor,
      courseType,
      preferredLanguage,
      desiredScore,
      examDeadline,
      courseDuration,
      totalSessions,
      courseExpiryDate,
      weeklySchedule,
    } = req.body;

    // Validate required fields with specific error messages
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!tutor) missingFields.push('tutor');
    if (!courseType) missingFields.push('courseType');
    if (!preferredLanguage) missingFields.push('preferredLanguage');
    if (!desiredScore) missingFields.push('desiredScore');
    if (!examDeadline) missingFields.push('examDeadline');
    if (!courseDuration) missingFields.push('courseDuration');
    if (!totalSessions) missingFields.push('totalSessions');
    if (!courseExpiryDate) missingFields.push('courseExpiryDate');

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
      });
      return;
    }

    // Verify tutor exists
    const tutorUser = await User.findById(tutor);
    if (!tutorUser || tutorUser.role !== 'tutor') {
      res.status(400).json({
        success: false,
        message: 'Invalid tutor ID',
      });
      return;
    }

    const smartQuad = new SmartQuad({
      name,
      description,
      tutor,
      tutorName: tutorUser.name,
      courseType,
      preferredLanguage,
      desiredScore,
      examDeadline: new Date(examDeadline),
      courseDuration,
      totalSessions,
      courseExpiryDate: new Date(courseExpiryDate),
      weeklySchedule: weeklySchedule || [],
      createdBy: req.user?._id,
    });

    await smartQuad.save();

    res.status(201).json({
      success: true,
      data: smartQuad,
      message: 'Smart Quad batch created successfully',
    });
  } catch (error) {
    console.error('Create Smart Quad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating Smart Quad batch',
    });
  }
};

// @desc    Get all Smart Quad batches (Admin only)
// @route   GET /api/smart-quad
// @access  Private (Admin)
export const getSmartQuads = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, tutor, courseType, page = 1, limit = 10 } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (tutor) filter.tutor = tutor;
    if (courseType) filter.courseType = courseType;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const smartQuads = await SmartQuad.find(filter)
      .populate('tutor', 'name email')
      .populate('students.studentId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await SmartQuad.countDocuments(filter);

    res.json({
      success: true,
      data: smartQuads,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get Smart Quads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Smart Quad batches',
    });
  }
};

// @desc    Get Smart Quad batches for current student
// @route   GET /api/smart-quad/my-smart-quads
// @access  Private (Student)
export const getMySmartQuads = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Find Smart Quads where the current student is enrolled
    const smartQuads = await SmartQuad.find({
      'students.studentId': userId
    })
      .populate('tutor', 'name email')
      .populate('students.studentId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: smartQuads,
    });
  } catch (error) {
    console.error('Get My Smart Quads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Smart Quad batches',
    });
  }
};

// @desc    Get Smart Quad by ID
// @route   GET /api/smart-quad/:id
// @access  Private
export const getSmartQuadById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const smartQuad = await SmartQuad.findById(id)
      .populate('tutor', 'name email phone')
      .populate('students.studentId', 'name email phone');

    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    res.json({
      success: true,
      data: smartQuad,
    });
  } catch (error) {
    console.error('Get Smart Quad by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Smart Quad batch',
    });
  }
};

// @desc    Add student to Smart Quad batch
// @route   POST /api/smart-quad/:id/add-student
// @access  Private (Admin)
export const addStudentToSmartQuad = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
      return;
    }

    const smartQuad = await SmartQuad.findById(id);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Check if batch is full
    if (smartQuad.currentStudents >= smartQuad.maxStudents) {
      res.status(400).json({
        success: false,
        message: 'Smart Quad batch is full',
      });
      return;
    }

    // Check if student is already in the batch
    const studentExists = smartQuad.students.some(
      (student) => student.studentId.toString() === studentId
    );

    if (studentExists) {
      res.status(400).json({
        success: false,
        message: 'Student is already in this batch',
      });
      return;
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
      return;
    }

    // Add student to batch
    smartQuad.students.push({
      studentId: student._id as any,
      studentName: student.name,
      email: student.email,
      phone: student.phone,
    });

    smartQuad.currentStudents += 1;

    // If batch is full, change status to active
    if (smartQuad.currentStudents >= smartQuad.maxStudents) {
      smartQuad.status = 'active';
    }

    await smartQuad.save();

    // Send notification email to student
    try {
      await EmailService.sendSmartQuadAssignment({
        studentEmail: student.email,
        studentName: student.name,
        batchName: smartQuad.name,
        tutorName: smartQuad.tutorName,
        courseType: smartQuad.courseType,
        preferredLanguage: smartQuad.preferredLanguage,
        examDeadline: smartQuad.examDeadline,
        courseExpiryDate: smartQuad.courseExpiryDate,
      });
    } catch (emailError) {
      console.error('Failed to send Smart Quad assignment email:', emailError);
    }

    res.json({
      success: true,
      data: smartQuad,
      message: 'Student added to Smart Quad batch successfully',
    });
  } catch (error) {
    console.error('Add student to Smart Quad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding student to Smart Quad batch',
    });
  }
};

// @desc    Remove student from Smart Quad batch
// @route   DELETE /api/smart-quad/:id/remove-student/:studentId
// @access  Private (Admin)
export const removeStudentFromSmartQuad = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id, studentId } = req.params;

    const smartQuad = await SmartQuad.findById(id);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Find and remove student
    const studentIndex = smartQuad.students.findIndex(
      (student) => student.studentId.toString() === studentId
    );

    if (studentIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Student not found in this batch',
      });
      return;
    }

    const removedStudent = smartQuad.students[studentIndex];
    smartQuad.students.splice(studentIndex, 1);
    smartQuad.currentStudents -= 1;

    // If batch is no longer full, change status back to forming
    if (smartQuad.currentStudents < smartQuad.maxStudents && smartQuad.status === 'active') {
      smartQuad.status = 'forming';
    }

    await smartQuad.save();

    // Send notification email to student
    try {
      await EmailService.sendSmartQuadRemoval({
        studentEmail: removedStudent.email,
        studentName: removedStudent.studentName,
        batchName: smartQuad.name,
      });
    } catch (emailError) {
      console.error('Failed to send Smart Quad removal email:', emailError);
    }

    res.json({
      success: true,
      data: smartQuad,
      message: 'Student removed from Smart Quad batch successfully',
    });
  } catch (error) {
    console.error('Remove student from Smart Quad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing student from Smart Quad batch',
    });
  }
};

// @desc    Update Smart Quad batch
// @route   PUT /api/smart-quad/:id
// @access  Private (Admin)
export const updateSmartQuad = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const smartQuad = await SmartQuad.findById(id);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (key !== '_id' && key !== 'students' && key !== 'currentStudents') {
        (smartQuad as any)[key] = updateData[key];
      }
    });

    await smartQuad.save();

    res.json({
      success: true,
      data: smartQuad,
      message: 'Smart Quad batch updated successfully',
    });
  } catch (error) {
    console.error('Update Smart Quad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating Smart Quad batch',
    });
  }
};

// @desc    Delete Smart Quad batch
// @route   DELETE /api/smart-quad/:id
// @access  Private (Admin)
export const deleteSmartQuad = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const smartQuad = await SmartQuad.findById(id);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Send notification emails to all students
    for (const student of smartQuad.students) {
      try {
        await EmailService.sendSmartQuadCancellation({
          studentEmail: student.email,
          studentName: student.studentName,
          batchName: smartQuad.name,
        });
      } catch (emailError) {
        console.error('Failed to send Smart Quad cancellation email:', emailError);
      }
    }

    await SmartQuad.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Smart Quad batch deleted successfully',
    });
  } catch (error) {
    console.error('Delete Smart Quad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting Smart Quad batch',
    });
  }
};

// @desc    Get available Smart Quad batches for student matching
// @route   GET /api/smart-quad/available
// @access  Private (Admin)
export const getAvailableSmartQuads = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { preferredLanguage, desiredScore, examDeadline, courseType } = req.query;

    const filter: any = {
      status: { $in: ['forming', 'active'] },
      currentStudents: { $lt: 4 }, // Not full
    };

    if (preferredLanguage) filter.preferredLanguage = preferredLanguage;
    if (courseType) filter.courseType = courseType;
    if (desiredScore) {
      // Find batches with similar desired scores (±5 points)
      const score = parseInt(desiredScore as string);
      filter.desiredScore = { $gte: score - 5, $lte: score + 5 };
    }
    if (examDeadline) {
      // Find batches with similar exam deadlines (±30 days)
      const deadline = new Date(examDeadline as string);
      const thirtyDaysFromNow = new Date(deadline.getTime() + 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(deadline.getTime() - 30 * 24 * 60 * 60 * 1000);
      filter.examDeadline = { $gte: thirtyDaysAgo, $lte: thirtyDaysFromNow };
    }

    const smartQuads = await SmartQuad.find(filter)
      .populate('tutor', 'name email')
      .populate('students.studentId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: smartQuads,
    });
  } catch (error) {
    console.error('Get available Smart Quads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available Smart Quad batches',
    });
  }
};

// @desc    Get Smart Quad sessions
// @route   GET /api/smart-quad/:id/sessions
// @access  Private
export const getSmartQuadSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const smartQuad = await SmartQuad.findById(id);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get sessions for this batch
    const sessions = await ClassSession.find({
      'students.studentId': { $in: smartQuad.students.map(s => s.studentId) },
      tutor: smartQuad.tutor,
    })
      .populate('tutor', 'name email')
      .populate('students.studentId', 'name email')
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await ClassSession.countDocuments({
      'students.studentId': { $in: smartQuad.students.map(s => s.studentId) },
      tutor: smartQuad.tutor,
    });

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
    console.error('Get Smart Quad sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Smart Quad sessions',
    });
  }
}; 