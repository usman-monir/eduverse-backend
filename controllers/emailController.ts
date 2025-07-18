import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import emailService from '../services/emailService';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Test email functionality
// @route   POST /api/email/test
// @access  Private (Admin)
export const testEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
      return;
    }

    const success = await emailService.testEmail(email);

    if (success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test email',
    });
  }
};

// @desc    Public test email functionality
// @route   POST /api/email/public-test
// @access  Public
export const publicTestEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
      return;
    }

    const success = await emailService.testEmail(email);

    if (success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
      });
    }
  } catch (error) {
    console.error('Public test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test email',
    });
  }
};

// @desc    Send welcome email to new user
// @route   POST /api/email/welcome
// @access  Private (Admin)
export const sendWelcomeEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, name, role } = req.body;

    if (!email || !name || !role) {
      res.status(400).json({
        success: false,
        message: 'Email, name, and role are required',
      });
      return;
    }

    const loginUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login`;

    const success = await emailService.sendWelcomeEmail({
      name: email, // email address
      role,
      loginUrl,
    });

    if (success) {
      res.json({
        success: true,
        message: 'Welcome email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send welcome email',
      });
    }
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending welcome email',
    });
  }
};

// @desc    Send session reminder
// @route   POST /api/email/session-reminder
// @access  Private (Admin, Tutor)
export const sendSessionReminder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentEmail, studentName, tutorName, subject, date, time, meetingLink } = req.body;

    if (!studentEmail || !studentName || !tutorName || !subject || !date || !time) {
      res.status(400).json({
        success: false,
        message: 'All session details are required',
      });
      return;
    }

    const success = await emailService.sendSessionReminder({
      studentName: studentEmail, // email address
      tutorName,
      subject,
      date,
      time,
      meetingLink,
    });

    if (success) {
      res.json({
        success: true,
        message: 'Session reminder sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send session reminder',
      });
    }
  } catch (error) {
    console.error('Session reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending session reminder',
    });
  }
};

// @desc    Send session request notification to tutor
// @route   POST /api/email/session-request-notification
// @access  Private (Admin)
export const sendSessionRequestNotification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { tutorEmail, studentName, tutorName, subject, date, time, duration, description } = req.body;

    if (!tutorEmail || !studentName || !tutorName || !subject || !date || !time || !duration) {
      res.status(400).json({
        success: false,
        message: 'All request details are required',
      });
      return;
    }

    const success = await emailService.sendSessionRequestNotification({
      studentName,
      tutorName: tutorEmail, // email address
      subject,
      date,
      time,
      duration,
      description: description || '',
    });

    if (success) {
      res.json({
        success: true,
        message: 'Session request notification sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send session request notification',
      });
    }
  } catch (error) {
    console.error('Session request notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending session request notification',
    });
  }
};

// @desc    Send admin approval notification
// @route   POST /api/email/admin-approval
// @access  Private (Admin)
export const sendAdminApprovalEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { adminEmail, userName, userRole } = req.body;

    if (!adminEmail || !userName || !userRole) {
      res.status(400).json({
        success: false,
        message: 'Admin email, user name, and role are required',
      });
      return;
    }

    const approvalUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/admin/users`;

    const success = await emailService.sendAdminApprovalEmail({
      name: userName,
      role: userRole,
      approvalUrl,
      adminEmail,
    });

    if (success) {
      res.json({
        success: true,
        message: 'Admin approval email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send admin approval email',
      });
    }
  } catch (error) {
    console.error('Admin approval email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending admin approval email',
    });
  }
};

// @desc    Send bulk invitations to students
// @route   POST /api/email/bulk-invite
// @access  Private (Admin)
export const bulkInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { students, slots } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ success: false, message: 'No students provided' });
      return;
    }
    const result = await emailService.sendBulkInvitations(students, slots);
    res.json({
      success: true,
      message: `Invitations sent: ${result.sent}, failed: ${result.failed}`,
      ...result,
    });
  } catch (error) {
    console.error('Bulk invite error:', error);
    res.status(500).json({ success: false, message: 'Server error while sending bulk invitations' });
  }
}; 