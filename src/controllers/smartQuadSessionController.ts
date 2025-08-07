import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ClassSession } from '../models/ClassSession';
import { SmartQuad } from '../models/SmartQuad';
import { User } from '../models/User';
import { generateGoogleMeetLink } from '../utils/googleMeet';

// @desc    Create sessions for a Smart Quad
// @route   POST /api/smart-quad/:id/sessions
// @access  Private (Admin, Tutor)

export const createSmartQuadSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { smartQuadId } = req.params;
    const { weeklySchedule } = req.body;

    // Validate Smart Quad exists
    const smartQuad = await SmartQuad.findById(smartQuadId)
      .populate('students.studentId', 'name email')
      .populate('tutor', 'name email');

    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad not found',
      });
      return;
    }

    // Check if user has permission
    const user = await User.findById(req.user?._id);
    if (!user || (user.role !== 'admin' && user.role !== 'tutor')) {
      res.status(403).json({
        success: false,
        message: 'Only admins and tutors can create Smart Quad sessions',
      });
      return;
    }

    // If tutor, verify they are the assigned tutor
    if (user.role === 'tutor' && smartQuad.tutor.toString() !== (user._id as string).toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only create sessions for Smart Quads assigned to you',
      });
      return;
    }

    // Validate required fields
    if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
      res.status(400).json({
        success: false,
        message: 'Weekly schedule is required',
      });
      return;
    }

    // Generate sessions starting from today
    const createdSessions = [];
    let sessionNumber = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    for (const schedule of weeklySchedule) {
      if (sessionNumber > smartQuad.totalSessions) break;

      // Find the next occurrence of this day starting from today
      const targetDayIndex = getDayOffset(schedule.day);
      let currentDate = new Date(today);
      
      // Move to the next occurrence of the target day
      while (currentDate.getDay() !== targetDayIndex) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create only ONE session for this day
      const sessionStart = new Date(currentDate);
      const [hours, minutes] = schedule.time.split(':').map(Number);
      sessionStart.setHours(hours, minutes, 0, 0);

      const sessionEnd = new Date(sessionStart.getTime() + schedule.duration * 60 * 1000);

      const { meetLink } = await generateGoogleMeetLink(
        `${smartQuad.name} - Session ${sessionNumber}`,
        sessionStart.toISOString(),
        sessionEnd.toISOString()
      );

      // Create session
      const session = new ClassSession({
        subject: smartQuad.name,
        tutor: smartQuad.tutor,
        tutorName: (smartQuad.tutor as any).name,
        students: smartQuad.students.map(student => ({
          studentId: student.studentId,
          studentName: (student.studentId as any).name,
        })),
        date: sessionStart,
        time: schedule.time,
        duration: `${schedule.duration} minutes`,
        status: 'booked', // Smart Quad sessions are pre-booked
        meetingLink: meetLink,
        description: `${smartQuad.description || 'Smart Quad Group Session'} - Session ${sessionNumber}`,
        type: 'smart_quad',
        smartQuadId: smartQuad._id,
        sessionNumber,
        createdBy: req.user!._id,
      });

      await session.save();
      createdSessions.push(session);
      sessionNumber++;
    }

    // Update Smart Quad status to active if it was forming
    if (smartQuad.status === 'forming') {
      smartQuad.status = 'active';
      await smartQuad.save();
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdSessions.length} sessions for Smart Quad`,
      data: {
        smartQuad: smartQuad.name,
        sessionsCreated: createdSessions.length,
        totalSessions: smartQuad.totalSessions,
        sessions: createdSessions,
      },
    });
  } catch (error) {
    console.error('Create Smart Quad sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating Smart Quad sessions',
    });
  }
};

// @desc    Get all sessions for a Smart Quad
// @route   GET /api/smart-quad/:id/sessions
// @access  Private (Admin, Tutor, Student)

export const getSmartQuadSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { smartQuadId } = req.params;

    // Validate Smart Quad exists
    const smartQuad = await SmartQuad.findById(smartQuadId);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad not found',
      });
      return;
    }

    // Check if user has access
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Verify access based on role
    let hasAccess = false;
    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'tutor') {
      hasAccess = smartQuad.tutor.toString() === (user._id as string).toString();
    } else if (user.role === 'student') {
      hasAccess = smartQuad.students.some(student => 
        student.studentId.toString() === (user._id as string).toString()
      );
    }

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view these sessions.',
      });
      return;
    }

    // Get sessions
    const sessions = await ClassSession.find({ smartQuadId })
      .sort({ sessionNumber: 1, date: 1 })
      .populate('students.studentId', 'name email');

    const completedSessionsCount = sessions.filter(s => s.status === 'completed').length;
    const upcomingSessionsCount = sessions.filter(s => s.status === 'booked' && new Date(s.date) > new Date()).length;

    res.status(200).json({
      success: true,
      data: {
        smartQuad: {
          _id: smartQuad._id,
          name: smartQuad.name,
          description: smartQuad.description,
          status: smartQuad.status,
          totalSessions: smartQuad.totalSessions,
          completedSessions: completedSessionsCount,
        },
        sessions,
        totalSessions: sessions.length,
        completedSessions: completedSessionsCount,
        upcomingSessions: upcomingSessionsCount,
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

// @desc    Update a Smart Quad session
// @route   PUT /api/smart-quad/:smartQuadId/sessions/:sessionId
// @access  Private (Admin, Tutor)

export const updateSmartQuadSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { smartQuadId, sessionId } = req.params;
    const updateData = req.body;

    // Validate Smart Quad exists
    const smartQuad = await SmartQuad.findById(smartQuadId);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad not found',
      });
      return;
    }

    // Validate session exists and belongs to Smart Quad
    const session = await ClassSession.findOne({ _id: sessionId, smartQuadId });
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found or does not belong to this Smart Quad',
      });
      return;
    }

    // Check permissions
    const user = await User.findById(req.user?._id);
    if (!user || (user.role !== 'admin' && user.role !== 'tutor')) {
      res.status(403).json({
        success: false,
        message: 'Only admins and tutors can update Smart Quad sessions',
      });
      return;
    }

    if (user.role === 'tutor' && smartQuad.tutor.toString() !== (user._id as string).toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only update sessions for Smart Quads assigned to you',
      });
      return;
    }

    // Update session
    const updatedSession = await ClassSession.findByIdAndUpdate(
      sessionId,
      updateData,
      { new: true, runValidators: true }
    ).populate('students.studentId', 'name email');

    // If status was changed to completed, update the Smart Quad completed sessions count
    if (updateData.status === 'completed') {
      const completedSessions = await ClassSession.countDocuments({
        smartQuadId,
        status: 'completed',
      });

      smartQuad.completedSessions = completedSessions;
      
      // Update status to completed if all sessions are done
      if (completedSessions >= smartQuad.totalSessions) {
        smartQuad.status = 'completed';
      }
      
      await smartQuad.save();
    }

    res.status(200).json({
      success: true,
      message: 'Session updated successfully',
      data: updatedSession,
    });
  } catch (error) {
    console.error('Update Smart Quad session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating session',
    });
  }
};

// @desc    Delete all sessions for a Smart Quad
// @route   DELETE /api/smart-quad/:id/sessions
// @access  Private (Admin, Tutor)

export const deleteSmartQuadSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { smartQuadId } = req.params;

    // Validate Smart Quad exists
    const smartQuad = await SmartQuad.findById(smartQuadId);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad not found',
      });
      return;
    }

    // Check permissions
    const user = await User.findById(req.user?._id);
    if (!user || (user.role !== 'admin' && user.role !== 'tutor')) {
      res.status(403).json({
        success: false,
        message: 'Only admins and tutors can delete Smart Quad sessions',
      });
      return;
    }

    if (user.role === 'tutor' && smartQuad.tutor.toString() !== (user._id as string).toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only delete sessions for Smart Quads assigned to you',
      });
      return;
    }

    // Delete all sessions for this Smart Quad
    const result = await ClassSession.deleteMany({ smartQuadId });

    // Update Smart Quad status back to forming if no sessions exist
    if (result.deletedCount > 0) {
      smartQuad.status = 'forming';
      await smartQuad.save();
    }

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} sessions`,
      data: {
        deletedCount: result.deletedCount,
        smartQuadStatus: smartQuad.status,
      },
    });
  } catch (error) {
    console.error('Delete Smart Quad sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting sessions',
    });
  }
};

// @desc    Complete a Smart Quad session and update progress
// @route   PUT /api/smart-quad/:smartQuadId/sessions/:sessionId/complete
// @access  Private (Admin, Tutor)

export const completeSmartQuadSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { smartQuadId, sessionId } = req.params;

    // Validate Smart Quad exists
    const smartQuad = await SmartQuad.findById(smartQuadId);
    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad not found',
      });
      return;
    }

    // Validate session exists and belongs to Smart Quad
    const session = await ClassSession.findOne({ _id: sessionId, smartQuadId });
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found or does not belong to this Smart Quad',
      });
      return;
    }

    // Check permissions
    const user = await User.findById(req.user?._id);
    if (!user || (user.role !== 'admin' && user.role !== 'tutor')) {
      res.status(403).json({
        success: false,
        message: 'Only admins and tutors can complete Smart Quad sessions',
      });
      return;
    }

    if (user.role === 'tutor' && smartQuad.tutor.toString() !== (user._id as string).toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only complete sessions for Smart Quads assigned to you',
      });
      return;
    }

    // Update session status
    session.status = 'completed';
    await session.save();

    // Update Smart Quad completed sessions count
    const completedSessions = await ClassSession.countDocuments({
      smartQuadId,
      status: 'completed',
    });

    smartQuad.completedSessions = completedSessions;
    
    // Update status to completed if all sessions are done
    if (completedSessions >= smartQuad.totalSessions) {
      smartQuad.status = 'completed';
    }
    
    await smartQuad.save();

    res.status(200).json({
      success: true,
      message: 'Session completed successfully',
      data: {
        session: session,
        smartQuad: {
          _id: smartQuad._id,
          name: smartQuad.name,
          completedSessions: smartQuad.completedSessions,
          totalSessions: smartQuad.totalSessions,
          status: smartQuad.status,
        },
      },
    });
  } catch (error) {
    console.error('Complete Smart Quad session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing session',
    });
  }
};

// Helper function to get day offset
function getDayOffset(day: string): number {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const index = days.indexOf(day);
  if (index === -1) {
    return 0; // Default to Sunday if invalid
  }
  return index;
} 