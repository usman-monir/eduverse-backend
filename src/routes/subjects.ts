import express from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  toggleSubjectStatus,
} from '../controllers/subjectController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getSubjects);
router.get('/:id', getSubjectById);

// Protected routes (Admin only)
router.post('/', authenticate, authorize('admin'), createSubject);
router.put('/:id', authenticate, authorize('admin'), updateSubject);
router.delete('/:id', authenticate, authorize('admin'), deleteSubject);
router.put('/:id/toggle', authenticate, authorize('admin'), toggleSubjectStatus);

export default router; 