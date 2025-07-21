import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ClassSession, IClassSession } from '../models/ClassSession';
import { User, IUser } from '../models/User';
import EmailService from '../services/emailService';
import { generateGoogleMeetLink } from '../utils/googleMeet'
interface AuthRequest extends Request {
  user?: IUser;
}


function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');

  if (modifier.toLowerCase() === 'pm' && hours !== '12') {
    hours = String(parseInt(hours) + 12);
  }

  if (modifier.toLowerCase() === 'am' && hours === '12') {
    hours = '00';
  }

  return `${hours}:${minutes}`;
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

    // Apply filters
    if (status) filter.status = status;
    if (subject) filter.subject = { $regex: subject as string, $options: 'i' };
    if (tutor) filter.tutorName = { $regex: tutor as string, $options: 'i' };
    if (date) filter.date = new Date(date as string);
    if (studentId) {
      filter['students.studentId'] = studentId;
    }

    if (type) filter.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sessions = await ClassSession.find(filter)
      .populate('tutor', 'name email')
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
      // Match if student is in the `students` array
      filter.$or = [
        { 'students.studentId': userId },
        { createdBy: userId, type: 'slot_request' },
      ];
    } else if (req.user?.role === 'tutor') {
      filter.$or = [
        { tutor: userId },
        { createdBy: userId },
      ];
    }

    // Admin sees all: no additional filter

    // Apply additional filters
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sessions = await ClassSession.find(filter)
      .populate('tutor', 'name email')
      .populate('createdBy', 'name email')
      .populate('students.studentId', 'name email') // ✅ FIXED
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
  return;
};
// @desc    Create new session (Tutors & Admins only)
// @route   POST /api/sessions
// @access  Private (Tutor, Admin)

export const createSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      subject,
      date,
      time,
      duration = '60 minutes',
      status = 'available',
      description,
      price,
      tutorId,
      students = [],
    } = req.body;

    console.log('Creating session with data:')
    const user = await User.findById(req.user?._id);
    if (!user || (user.role !== 'tutor' && user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Only tutors and admins can create sessions',
      });
      return;
    }

    // ✅ Determine which tutor this session is for
    let sessionTutor: mongoose.Types.ObjectId;
    let sessionTutorName: string;

    if (user.role === 'admin') {
      if (!tutorId) {
        res.status(400).json({
          success: false,
          message: 'Admin must select a tutor to assign the session to.',
        });
        return;
      }

      const selectedTutor = await User.findById(tutorId);
      if (!selectedTutor || selectedTutor.role !== 'tutor') {
        res.status(400).json({
          success: false,
          message: 'Invalid tutor selected. Must be a tutor.',
        });
        return;
      }

      sessionTutor = new mongoose.Types.ObjectId(tutorId);
      sessionTutorName = selectedTutor.name;
    } else {
      sessionTutor = new mongoose.Types.ObjectId(req.user!._id as string);
      sessionTutorName = user.name;
    }

    // ✅ Validate and map students
    const validStudents = [];
    for (const studentId of students) {
      const student = await User.findById(studentId);
      if (!student || student.role !== 'student') {
        res.status(400).json({
          success: false,
          message: `Invalid student ID: ${studentId}`,
        });
        return;
      }
      validStudents.push({
        studentId: student._id,
        studentName: student.name,
      });
    }

    // ✅ Validate date/time
    if (!date || !time) {
      res.status(400).json({
        success: false,
        message: 'Missing required date or time fields',
      });
      return;
    }

    const startDateTime = new Date(`${date.split('T')[0]}T${time}`);
    if (isNaN(startDateTime.getTime())) {
      console.error('Invalid startDateTime:', date, time, `${date}T${time}`);
      res.status(400).json({
        success: false,
        message: 'Invalid date or time format',
      });
      return;
    }

    const durationMinutes = parseInt(duration.split(' ')[0]) || 60;
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    // ✅ Check for duplicate session
    const existingSession = await ClassSession.findOne({
      tutor: sessionTutor,
      date: startDateTime,
      time,
    });

    if (existingSession) {
      res.status(409).json({
        success: false,
        message: 'A session already exists for this tutor at the selected date and time.',
      });
      return;
    }

    // ✅ Generate Google Meet link
    // const { meetLink } = await generateGoogleMeetLink(
    //   subject,
    //   startDateTime.toISOString(),
    //   endDateTime.toISOString()
    // );
    console.log('isTodayInviteTriggered before save:', false);

    // ✅ Create session
    const session = new ClassSession({
      subject,
      tutor: sessionTutor,
      tutorName: sessionTutorName,
      students: validStudents,
      date: startDateTime,
      time,
      duration,
      status,
      description,
      isTodayInviteTriggered: false,
      isCancelledByStudent: false,
      meetingLink: "",
      price,
      type: user.role === 'admin' ? 'admin_created' : 'tutor_created',
      createdBy: req.user!._id
    });
    console.log('Session object before save:', session);
    await session.save();
    console.log('Saved session:', session);
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
      isTodayInviteTriggered: false,
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

    if (session.status !== 'available') {
      res.status(400).json({
        success: false,
        message: 'Session is not available for booking',
      });
      return;
    }

    const studentId = req.user?._id as mongoose.Types.ObjectId;

    // Check if student already booked
    const alreadyBooked = session.students?.some((s: { studentId: mongoose.Types.ObjectId; studentName?: string }) =>
      s.studentId.equals(studentId)
    );

    if (alreadyBooked) {
      res.status(400).json({
        success: false,
        message: 'You have already booked this session',
      });
      return;
    }

    // Add student to session
    session.students = session.students || [];
    session.students.push({
      studentId: studentId,
      studentName: req.user?.name,
    });

    // Update session status
    session.status = 'booked';

    // Generate Google Meet link
    try {
      // Create session date and time
      const sessionDate = new Date(session.date);
      const [hours, minutes] = session.time.split(':').map(Number);

      // Set start time
      const startTime = new Date(sessionDate);
      startTime.setHours(hours, minutes, 0, 0);

      // Calculate end time based on duration (assuming duration is like "60 minutes")
      const durationMatch = session.duration.match(/(\d+)/);
      const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);

      // Create meeting summary with subject, tutor, and student names
      const meetingSummary = `${session.subject} - ${session.tutorName} & ${req.user?.name}`;

      // Generate Google Meet link
      const meetingData = await generateGoogleMeetLink(
        meetingSummary,
        startTime.toISOString(),
        endTime.toISOString(),
        'Asia/Karachi' // You can make this dynamic based on user timezone
      );

      // Update session with meeting link
      session.meetingLink = meetingData.meetLink || '';

      console.log('Generated meeting link:', meetingData.meetLink);

    } catch (meetError) {
      console.error('Failed to generate meeting link:', meetError);
      // Continue with booking even if meet link generation fails
      // You might want to handle this differently based on your requirements
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
      meetingLink: session.meetingLink, // Include meeting link in response
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
    const user = req.user as IUser;

    const session = await ClassSession.findById(req.params.id);

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (session.type !== 'slot_request') {
      res.status(400).json({ success: false, message: 'This is not a slot request' });
      return;
    }

    if (session.status !== 'pending') {
      res.status(400).json({ success: false, message: 'This slot request has already been processed' });
      return;
    }

    const userId = user._id as mongoose.Types.ObjectId;
    const canApprove =
      user.role === 'admin' ||
      (user.role === 'tutor' && session.tutor.toString() === userId.toString());

    if (!canApprove) {
      res.status(403).json({
        success: false,
        message: 'You can only approve requests for your own sessions',
      });
      return;
    }

    if (approved) {
      session.status = 'approved';

      // ✅ Add student object
      const student = await User.findById(session.createdBy);
      session.students = [{
        studentId: session.createdBy,
        studentName: student?.name || undefined,
      }];

      // ✅ Generate Google Meet Link
      const startDateTime = new Date(session.date);
      const durationMinutes = parseInt(session.duration.split(' ')[0]) || 60;
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      const { meetLink } = await generateGoogleMeetLink(
        session.subject,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );
      session.meetingLink = meetLink ?? undefined;

      // ✅ Send approval email
      const tutor = await User.findById(session.tutor);
      if (student && tutor) {
        await EmailService.sendSlotRequestApprovalEmail({
          studentEmail: student.email,
          studentName: student.name,
          tutorName: tutor.name,
          subject: session.subject,
          date: session.date.toISOString().split('T')[0],
          time: session.time,
          duration: session.duration,
          description: session.description,
          meetingLink: meetLink ?? undefined,
          approvedBy: user.name || 'Admin',
        });
      }
    } else {
      session.status = 'cancelled';

      // Rejection email
      const student = await User.findById(session.createdBy);
      const tutor = await User.findById(session.tutor);
      if (student && tutor) {
        await EmailService.sendSlotRequestRejectionEmail({
          studentEmail: student.email,
          studentName: student.name,
          tutorName: tutor.name,
          subject: session.subject,
          date: session.date.toISOString().split('T')[0],
          time: session.time,
          duration: session.duration,
          description: session.description,
          rejectedBy: user.name || 'Admin',
          rejectionReason: notes,
        });
      }
    }

    await session.save();

    res.json({
      success: true,
      data: session,
      message: approved
        ? 'Slot request approved successfully'
        : 'Slot request rejected',
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
    if (status === 'completed' && session.students && session.students.length > 0) {
      for (const student of session.students) {
        await User.findByIdAndUpdate(student.studentId, {
          // Your update logic here, e.g. mark attendance, etc.
        });
      }
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

    // Allowed fields (excluding studentId — handled below)
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

    // Handle updating students array
    if (req.body.students !== undefined) {
      if (Array.isArray(req.body.students)) {
        session.students = req.body.students.map((s: any) => ({
          studentId: new mongoose.Types.ObjectId(s.studentId),
          studentName: s.studentName,
        }));
      } else if (req.body.students === null || req.body.students === '') {
        session.students = [];
      }
    }

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




export const cancelSessionByStudent = async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params.id;
    const studentId = req.user?._id as string | mongoose.Types.ObjectId; // assuming student ID comes from auth middleware

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = await ClassSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Check if the session is booked by this student
    const studentIndex = session.students?.findIndex(
      (s: { studentId: mongoose.Types.ObjectId | string; studentName?: string }) => s.studentId.toString() === (studentId as string | mongoose.Types.ObjectId).toString()
    );

    if (studentIndex === -1 || !session.students || session.students.length === 0) {
      return res.status(403).json({ message: "You are not booked for this session" });
    }

    // Remove the student
    session.students.splice(studentIndex, 1);
    session.status = "available";
    session.isCancelledByStudent = true;

    await session.save();

    return res.status(200).json({
      message: "Session cancelled successfully",
      session,
    });
  } catch (error) {
    console.error("Cancel session error:", error);
    return res.status(500).json({ message: "Server error cancelling session" });
  }
};
