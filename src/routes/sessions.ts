import express from 'express';
import {
  getSessions,
  getSessionById,
  createSession,
  createSlotRequest,
  bookSession,
  approveSlotRequest,
  updateSession,
  updateSessionStatus,
  deleteSession,
  getAvailableTutors,
  getMySessions,
} from '../controllers/sessionController';
import { authenticate, authorizeTutorOrAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getSessions);
router.get('/my', authenticate, getMySessions);
router.put('/:id/book', authenticate, bookSession);
router.get('/:id', getSessionById);

// Protected routes
router.post('/', authenticate, authorizeTutorOrAdmin, createSession);
router.post('/request', authenticate, createSlotRequest);
router.put('/:id/approve', authenticate, authorizeTutorOrAdmin, approveSlotRequest);
router.put('/:id', authenticate, authorizeTutorOrAdmin, updateSession);
router.put('/:id/status', authenticate, authorizeTutorOrAdmin, updateSessionStatus);
router.delete('/:id', authenticate, authorizeTutorOrAdmin, deleteSession);

// Admin-only routes
router.get('/tutors/available', authenticate, getAvailableTutors);

export default router;
