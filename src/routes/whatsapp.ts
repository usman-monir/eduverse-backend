import express from 'express';
import {
  sendSessionReminder,
  sendRequestNotification,
  sendBulkNotification,
  getWhatsAppStatus,
  configureWhatsApp,
} from '../controllers/whatsappController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/whatsapp/status - Get WhatsApp integration status (Admin only)
router.get('/status', authorize('admin'), getWhatsAppStatus);

// POST /api/whatsapp/configure - Configure WhatsApp settings (Admin only)
router.post('/configure', authorize('admin'), configureWhatsApp);

// POST /api/whatsapp/send-reminder - Send session reminder (Admin, Tutor)
router.post('/send-reminder', authorize('admin', 'tutor'), sendSessionReminder);

// POST /api/whatsapp/send-request-notification - Send request notification (Admin only)
router.post(
  '/send-request-notification',
  authorize('admin'),
  sendRequestNotification
);

// POST /api/whatsapp/send-bulk - Send bulk notification (Admin only)
router.post('/send-bulk', authorize('admin'), sendBulkNotification);

export default router;
