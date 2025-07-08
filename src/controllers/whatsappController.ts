import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { ClassSession, IClassSession } from '../models/ClassSession';
import { SlotRequest, ISlotRequest } from '../models/SlotRequest';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Send session reminder
// @route   POST /api/whatsapp/send-reminder
// @access  Private (Admin, Tutor)
export const sendSessionReminder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { sessionId, message } = req.body;

    const session = await ClassSession.findById(sessionId)
      .populate('studentId', 'name phone')
      .populate('tutor', 'name');

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    // Check if user can send reminder for this session
    if (
      req.user?.role === 'tutor' &&
      session.tutor.toString() !==
        (req.user._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only send reminders for your own sessions',
      });
      return;
    }

    const student = session.studentId as any;
    const tutor = session.tutor as any;

    if (!student?.phone) {
      res.status(400).json({
        success: false,
        message: 'Student phone number not available',
      });
      return;
    }

    // Default reminder message
    const defaultMessage = `Hi ${student.name}! This is a reminder for your ${
      session.subject
    } session with ${tutor.name} on ${new Date(
      session.date
    ).toLocaleDateString()} at ${session.time}. Please be ready!`;

    const finalMessage = message || defaultMessage;

    // TODO: Integrate with actual WhatsApp API (Twilio, WhatsApp Business API, etc.)
    // For now, we'll simulate the WhatsApp sending
    console.log('WhatsApp Message:', {
      to: student.phone,
      message: finalMessage,
      sessionId: session._id,
    });

    // Note: reminderSent and reminderSentAt fields don't exist in the current model
    // TODO: Add these fields to the ClassSession model if needed
    console.log('Session reminder sent for session:', session._id);

    res.json({
      success: true,
      message: 'Session reminder sent successfully',
      data: {
        sessionId: session._id,
        studentPhone: student.phone,
        message: finalMessage,
      },
    });
  } catch (error) {
    console.error('Send session reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending session reminder',
    });
  }
};

// @desc    Send slot request notification
// @route   POST /api/whatsapp/send-request-notification
// @access  Private (Admin)
export const sendRequestNotification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { requestId, tutorId, message } = req.body;

    const [request, tutor] = await Promise.all([
      SlotRequest.findById(requestId).populate('studentId', 'name phone'),
      User.findById(tutorId),
    ]);

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Slot request not found',
      });
      return;
    }

    if (!tutor || tutor.role !== 'tutor') {
      res.status(404).json({
        success: false,
        message: 'Tutor not found',
      });
      return;
    }

    if (!tutor.phone) {
      res.status(400).json({
        success: false,
        message: 'Tutor phone number not available',
      });
      return;
    }

    const student = request.studentId as any;

    // Default notification message
    const defaultMessage = `Hi ${
      tutor.name
    }! You have a new tutoring request from ${student.name} for ${
      request.subject
    } on ${new Date(request.preferredDate).toLocaleDateString()} at ${
      request.preferredTime
    }. Please review and respond.`;

    const finalMessage = message || defaultMessage;

    // TODO: Integrate with actual WhatsApp API
    console.log('WhatsApp Notification:', {
      to: tutor.phone,
      message: finalMessage,
      requestId: request._id,
      tutorId: tutor._id,
    });

    res.json({
      success: true,
      message: 'Request notification sent successfully',
      data: {
        requestId: request._id,
        tutorPhone: tutor.phone,
        message: finalMessage,
      },
    });
  } catch (error) {
    console.error('Send request notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending request notification',
    });
  }
};

// @desc    Send bulk notification
// @route   POST /api/whatsapp/send-bulk
// @access  Private (Admin)
export const sendBulkNotification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      recipients, // Array of user IDs or 'all', 'students', 'tutors'
      message,
      subject,
    } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        message: 'Message is required',
      });
      return;
    }

    let userFilter: any = {};

    if (recipients === 'students') {
      userFilter.role = 'student';
    } else if (recipients === 'tutors') {
      userFilter.role = 'tutor';
    } else if (recipients === 'all') {
      // No filter - send to all users
    } else if (Array.isArray(recipients)) {
      userFilter._id = { $in: recipients };
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid recipients format',
      });
      return;
    }

    const users = await User.find({
      ...userFilter,
      phone: { $exists: true, $ne: '' },
    });

    if (users.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No users found with phone numbers',
      });
      return;
    }

    const results = [];

    for (const user of users) {
      // TODO: Integrate with actual WhatsApp API
      console.log('Bulk WhatsApp Message:', {
        to: user.phone,
        message: message.replace('{name}', user.name),
        userId: user._id,
      });

      results.push({
        userId: user._id,
        name: user.name,
        phone: user.phone,
        status: 'sent',
      });
    }

    res.json({
      success: true,
      message: `Bulk notification sent to ${results.length} users`,
      data: {
        totalSent: results.length,
        results,
      },
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending bulk notification',
    });
  }
};

// @desc    Get WhatsApp integration status
// @route   GET /api/whatsapp/status
// @access  Private (Admin)
export const getWhatsAppStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // TODO: Check actual WhatsApp API connection status
    const status = {
      connected: false, // Will be true when WhatsApp API is properly integrated
      apiKey: process.env.WHATSAPP_API_KEY ? 'configured' : 'not_configured',
      webhookUrl: process.env.WHATSAPP_WEBHOOK_URL
        ? 'configured'
        : 'not_configured',
      lastMessageSent: null,
      totalMessagesSent: 0,
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching WhatsApp status',
    });
  }
};

// @desc    Configure WhatsApp settings
// @route   POST /api/whatsapp/configure
// @access  Private (Admin)
export const configureWhatsApp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { apiKey, webhookUrl, phoneNumber } = req.body;

    // TODO: Validate and save WhatsApp configuration
    // This would typically involve:
    // 1. Validating the API key
    // 2. Setting up webhook endpoints
    // 3. Storing configuration securely

    console.log('WhatsApp Configuration:', {
      apiKey: apiKey ? '***' : 'not_provided',
      webhookUrl,
      phoneNumber,
    });

    res.json({
      success: true,
      message: 'WhatsApp configuration updated successfully',
      data: {
        configured: true,
        phoneNumber,
      },
    });
  } catch (error) {
    console.error('Configure WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while configuring WhatsApp',
    });
  }
};
