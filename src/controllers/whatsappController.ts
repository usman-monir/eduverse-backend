import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { ClassSession, IClassSession } from '../models/ClassSession';
import mongoose from 'mongoose';
import { WhatsAppTemplate } from '../models/WhatsAppTemplate';

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
      .populate('tutor', 'name')
      .populate('students.studentId', 'name phone');

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

    const tutor = session.tutor as any;

    if (!session.students || session.students.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No students found for this session',
      });
      return;
    }

    const reminders: any[] = [];

    for (const stu of session.students) {
      const student = stu.studentId as any;

      if (!student?.phone) continue;

      const defaultMessage = `Hi ${student.name}! This is a reminder for your ${
        session.subject
      } session with ${tutor.name} on ${new Date(
        session.date
      ).toLocaleDateString()} at ${session.time}. Please be ready!`;

      const finalMessage = message || defaultMessage;

      // Simulate sending WhatsApp message
      console.log('WhatsApp Message:', {
        to: student.phone,
        message: finalMessage,
        sessionId: session._id,
      });

      reminders.push({
        studentId: student._id,
        phone: student.phone,
        message: finalMessage,
      });
    }

    if (reminders.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid student phone numbers found to send reminders',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Session reminder(s) sent successfully',
      data: reminders,
    });
  } catch (error) {
    console.error('Send session reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending session reminder',
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

// Get all WhatsApp templates
export const getWhatsAppTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await WhatsAppTemplate.find().sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch templates' });
  }
};

// Get a single WhatsApp template by ID
export const getWhatsAppTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await WhatsAppTemplate.findById(req.params.id);
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, data: template });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch template' });
    return;
  }
};

// Create a new WhatsApp template
export const createWhatsAppTemplate = async (req: Request, res: Response) => {
  try {
    const { title, category, template } = req.body;
    const newTemplate = new WhatsAppTemplate({ title, category, template });
    await newTemplate.save();
    res.status(201).json({ success: true, data: newTemplate });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to create template' });
  }
};

// Update a WhatsApp template
export const updateWhatsAppTemplate = async (req: Request, res: Response) => {
  try {
    const { title, category, template } = req.body;
    const updated = await WhatsAppTemplate.findByIdAndUpdate(
      req.params.id,
      { title, category, template, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to update template' });
    return;
  }
};

// Delete a WhatsApp template
export const deleteWhatsAppTemplate = async (req: Request, res: Response) => {
  try {
    const deleted = await WhatsAppTemplate.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to delete template' });
    return;
  }
};
