import express from 'express';
import {
  sendCourseExpiryNotifications,
  sendSmartQuadAvailabilityNotifications,
  sendSessionCancellationNotifications,
  getNotificationStats,
} from '../controllers/notificationController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Notification routes
router.route('/course-expiry')
  .post(authenticate, authorize('admin'), sendCourseExpiryNotifications);

router.route('/smart-quad-availability')
  .post(authenticate, authorize('admin'), sendSmartQuadAvailabilityNotifications);

router.route('/session-cancellation')
  .post(authenticate, authorize('admin'), sendSessionCancellationNotifications);

router.route('/stats')
  .get(authenticate, authorize('admin'), getNotificationStats);

export default router; 