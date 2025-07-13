import express from 'express';
import {
  sendSessionReminder,
  sendBulkNotification,
  getWhatsAppStatus,
  configureWhatsApp,
  getWhatsAppTemplates,
  getWhatsAppTemplateById,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from '../controllers/whatsappController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// WhatsApp Template CRUD (Admin only)
router.get('/templates', authorize('admin'), getWhatsAppTemplates);
router.get('/templates/:id', authorize('admin'), getWhatsAppTemplateById);
router.post('/templates', authorize('admin'), createWhatsAppTemplate);
router.put('/templates/:id', authorize('admin'), updateWhatsAppTemplate);
router.delete('/templates/:id', authorize('admin'), deleteWhatsAppTemplate);

// GET /api/whatsapp/status - Get WhatsApp integration status (Admin only)
router.get('/status', authorize('admin'), getWhatsAppStatus);

// POST /api/whatsapp/configure - Configure WhatsApp settings (Admin only)
router.post('/configure', authorize('admin'), configureWhatsApp);

// POST /api/whatsapp/send-reminder - Send session reminder (Admin, Tutor)
router.post('/send-reminder', authorize('admin', 'tutor'), sendSessionReminder);

// POST /api/whatsapp/send-bulk - Send bulk notification (Admin only)
router.post('/send-bulk', authorize('admin'), sendBulkNotification);

export default router;
