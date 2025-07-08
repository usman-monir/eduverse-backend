import express from 'express';
import {
  getSessions,
  getSessionById,
  createSession,
  bookSession,
  updateSessionStatus,
  updateSession,
  deleteSession,
} from '../controllers/sessionController';
import {
  authenticate,
  authorizeStudent,
  authorizeTutorOrAdmin,
} from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getSessions);
router.get('/:id', getSessionById);

// Protected routes
router.post('/', authenticate, authorizeTutorOrAdmin, createSession);
router.put('/:id/book', authenticate, authorizeStudent, bookSession);
router.put('/:id', authenticate, authorizeTutorOrAdmin, updateSession);
router.put(
  '/:id/status',
  authenticate,
  authorizeTutorOrAdmin,
  updateSessionStatus
);
router.delete('/:id', authenticate, authorizeTutorOrAdmin, deleteSession);

export default router;
