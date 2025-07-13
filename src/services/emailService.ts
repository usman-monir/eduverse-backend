import nodemailer from 'nodemailer';
import { IUser } from '../models/User';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface WelcomeEmailData {
  name: string;
  role: string;
  loginUrl: string;
}

interface SessionReminderData {
  studentName: string;
  tutorName: string;
  subject: string;
  date: string;
  time: string;
  meetingLink?: string;
}

interface SessionRequestNotificationData {
  studentName: string;
  tutorName: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  description: string;
}

interface AdminApprovalData {
  name: string;
  role: string;
  approvalUrl: string;
  adminEmail: string;
}

interface SlotRequestApprovalData {
  studentEmail: string;
  studentName: string;
  tutorName: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  description?: string;
  meetingLink?: string;
  approvedBy: string;
}

interface SlotRequestRejectionData {
  studentEmail: string;
  studentName: string;
  tutorName: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  description?: string;
  rejectedBy: string;
  rejectionReason?: string;
}

interface InvitationEmailData {
  email: string;
  name: string;
  role: string;
  temporaryPassword: string;
  loginUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      console.log('Attempting to send email to:', options.to);
      console.log('Email subject:', options.subject);
      
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to EduPortal!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your learning journey starts here</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.name}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Welcome to EduPortal! Your account has been successfully created as a <strong>${data.role}</strong>.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Complete your profile</li>
              <li>Explore available courses and tutors</li>
              <li>Book your first session</li>
              <li>Access study materials</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Login to Your Account
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, feel free to contact our support team.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 EduPortal. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.name, // This should be the email address
      subject: 'Welcome to EduPortal - Your Learning Journey Begins!',
      html,
    });
  }

  // Session reminder email
  async sendSessionReminder(data: SessionReminderData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Session Reminder</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your class is starting soon!</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.studentName}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This is a friendly reminder about your upcoming session.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Session Details</h3>
            <div style="color: #666; line-height: 1.8;">
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Tutor:</strong> ${data.tutorName}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
            </div>
          </div>
          
          ${data.meetingLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.meetingLink}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Join Session
              </a>
            </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Please be ready 5 minutes before the scheduled time. If you have any issues, contact your tutor.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 EduPortal. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.studentName, // This should be the email address
      subject: `Session Reminder - ${data.subject} with ${data.tutorName}`,
      html,
    });
  }

  // Session request notification to tutor
  async sendSessionRequestNotification(data: SessionRequestNotificationData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">New Session Request</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">A student has requested a session with you</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.tutorName}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You have received a new session request from a student.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Request Details</h3>
            <div style="color: #666; line-height: 1.8;">
              <p><strong>Student:</strong> ${data.studentName}</p>
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
              <p><strong>Duration:</strong> ${data.duration}</p>
              ${data.description ? `<p><strong>Message:</strong> ${data.description}</p>` : ''}
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Please log in to your dashboard to review and respond to this request.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 EduPortal. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.tutorName, // This should be the tutor's email address
      subject: `New Session Request - ${data.subject} from ${data.studentName}`,
      html,
    });
  }

  // Admin approval email
  async sendAdminApprovalEmail(data: AdminApprovalData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Account Approval Request</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">New user registration requires approval</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello Admin!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            A new user has registered and requires your approval.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">User Details</h3>
            <div style="color: #666; line-height: 1.8;">
              <p><strong>Name:</strong> ${data.name}</p>
              <p><strong>Role:</strong> ${data.role}</p>
              <p><strong>Email:</strong> ${data.adminEmail}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.approvalUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Review & Approve
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Please review the user's information and approve or reject their registration.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 EduPortal. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.adminEmail,
      subject: 'New User Registration - Approval Required',
      html,
    });
  }

  // Test email functionality
  async testEmail(to: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Email Test</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">EduPortal Email System</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Email System Working!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This is a test email to verify that the email system is working correctly.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">System Status</h3>
            <div style="color: #666; line-height: 1.8;">
              <p>✅ Email service is configured</p>
              <p>✅ SMTP connection is working</p>
              <p>✅ Templates are ready</p>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You can now use the email system for notifications, reminders, and other communications.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 EduPortal. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'EduPortal Email System Test',
      html,
    });
  }

  // Send approval email to user
  async sendApprovalEmail(data: { email: string; name: string; loginUrl: string }): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">🎉 Account Approved!</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #333; margin-bottom: 15px;">Hello ${data.name},</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Great news! Your account has been approved by our admin team. You can now log in and start using our platform.
            </p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We're excited to have you on board and look forward to helping you achieve your learning goals.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Login to Your Account
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 14px; margin: 0;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.email,
      subject: 'Your Account Has Been Approved!',
      html,
    });
  }

  // Send slot request approval email to student
  async sendSlotRequestApprovalEmail(data: SlotRequestApprovalData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">✅ Session Request Approved!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your slot request has been approved</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.studentName}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Great news! Your session request has been approved by ${data.approvedBy}. Your session is now confirmed and ready to go.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Session Details</h3>
            <div style="color: #666; line-height: 1.8;">
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Tutor:</strong> ${data.tutorName}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
              <p><strong>Duration:</strong> ${data.duration}</p>
              ${data.description ? `<p><strong>Your Message:</strong> ${data.description}</p>` : ''}
            </div>
          </div>
          
          ${data.meetingLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.meetingLink}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Join Session
              </a>
            </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Please be ready 5 minutes before the scheduled time. If you have any questions, contact your tutor or our support team.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 EduPortal. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.studentEmail,
      subject: `Session Request Approved - ${data.subject} with ${data.tutorName}`,
      html,
    });
  }

  // Send slot request rejection email to student
  async sendSlotRequestRejectionEmail(data: SlotRequestRejectionData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">❌ Session Request Update</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your slot request could not be approved</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.studentName},</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We regret to inform you that your session request could not be approved at this time. This decision was made by ${data.rejectedBy}.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Request Details</h3>
            <div style="color: #666; line-height: 1.8;">
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Tutor:</strong> ${data.tutorName}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
              <p><strong>Duration:</strong> ${data.duration}</p>
              ${data.description ? `<p><strong>Your Message:</strong> ${data.description}</p>` : ''}
            </div>
          </div>
          
          ${data.rejectionReason ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Reason for Rejection</h4>
              <p style="color: #856404; margin-bottom: 0;">${data.rejectionReason}</p>
            </div>
          ` : ''}
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1976d2; margin-top: 0;">What You Can Do Next</h4>
            <ul style="color: #1976d2; line-height: 1.6;">
              <li>Submit a new request with different timing</li>
              <li>Choose a different tutor for the same subject</li>
              <li>Contact our support team for assistance</li>
              <li>Check available sessions in your dashboard</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            We apologize for any inconvenience. Please feel free to submit a new request or contact our support team if you need assistance.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2024 EduPortal. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.studentEmail,
      subject: `Session Request Update - ${data.subject}`,
      html,
    });
  }

  // Send invitation email to new user
  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #333; margin-bottom: 15px;">Hello ${data.name},</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              You've been invited to join EduPortal as a <strong>${data.role}</strong>. Your account has been created and you can now log in using the credentials below.
            </p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We're excited to have you on board and look forward to helping you achieve your learning goals.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Your Login Credentials</h3>
            <div style="color: #666; line-height: 1.8;">
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Temporary Password:</strong> <span style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.temporaryPassword}</span></p>
            </div>
            <p style="color: #dc3545; font-size: 14px; margin-top: 15px; margin-bottom: 0;">
              ⚠️ Please change your password after your first login for security.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Login to Your Account
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <h3 style="color: #333; margin-bottom: 15px;">What's Next?</h3>
            <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
              <li>Log in with your credentials</li>
              <li>Complete your profile</li>
              <li>Explore available courses and tutors</li>
              <li>Book your first session</li>
              <li>Access study materials</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 14px; margin: 0;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.email,
      subject: 'Welcome to EduPortal - Your Account is Ready!',
      html,
    });
  }
}

export default new EmailService(); 