import express from 'express';
import {
  testEmail,
  publicTestEmail,
  sendWelcomeEmail,
  sendSessionReminder,
  sendSessionRequestNotification,
  sendAdminApprovalEmail,
} from '../controllers/emailController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public test email functionality
router.post('/public-test', publicTestEmail);

// Test email functionality (Admin only)
router.post('/test', authenticate, authorize('admin'), testEmail);

// Send welcome email (Admin only)
router.post('/welcome', authenticate, authorize('admin'), sendWelcomeEmail);

// Send session reminder (Admin, Tutor)
router.post('/session-reminder', authenticate, authorize('admin', 'tutor'), sendSessionReminder);

// Send session request notification (Admin only)
router.post('/session-request-notification', authenticate, authorize('admin'), sendSessionRequestNotification);

// Send admin approval notification (Admin only)
router.post('/admin-approval', authenticate, authorize('admin'), sendAdminApprovalEmail);

export default router; 