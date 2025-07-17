import express from 'express';
import {
  testEmail,
  publicTestEmail,
  sendWelcomeEmail,
  sendSessionReminder,
  sendSessionRequestNotification,
  sendAdminApprovalEmail,
  bulkInvite,
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

// Send bulk invitations (Admin only)
router.post('/bulk-invite', authenticate, authorize('admin'), bulkInvite);

export default router; 