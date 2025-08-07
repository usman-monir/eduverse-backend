import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createSmartQuadSessions,
  getSmartQuadSessions,
  updateSmartQuadSession,
  deleteSmartQuadSessions,
  completeSmartQuadSession,
} from '../controllers/smartQuadSessionController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create sessions for a Smart Quad (Admin, Tutor)
router.post('/:smartQuadId/sessions',  authorize('admin', 'tutor'), createSmartQuadSessions);

// Get all sessions for a Smart Quad (Admin, Tutor, Student)
router.get('/:smartQuadId/sessions', authorize('admin', 'tutor', 'student'), getSmartQuadSessions);

// Update a Smart Quad session (Admin, Tutor)
router.put('/:smartQuadId/sessions/:sessionId', authorize('admin', 'tutor'), updateSmartQuadSession);

// Delete all sessions for a Smart Quad (Admin, Tutor)
router.delete('/:smartQuadId/sessions', authorize('admin', 'tutor'), deleteSmartQuadSessions);

// Complete a Smart Quad session (Admin, Tutor)
router.put('/:smartQuadId/sessions/:sessionId/complete', authorize('admin', 'tutor'), completeSmartQuadSession);

export default router; 