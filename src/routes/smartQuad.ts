import express from 'express';
import {
  createSmartQuad,
  getSmartQuads,
  getMySmartQuads,
  getSmartQuadById,
  addStudentToSmartQuad,
  removeStudentFromSmartQuad,
  updateSmartQuad,
  deleteSmartQuad,
  getAvailableSmartQuads,
  getSmartQuadSessions,
} from '../controllers/smartQuadController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Smart Quad routes
router.route('/')
  .post(authenticate, authorize('admin'), createSmartQuad)
  .get(authenticate, authorize('admin'), getSmartQuads);

// Student routes - allow students to view their own Smart Quad data
router.route('/my-smart-quads')
  .get(authenticate, authorize('student'), getMySmartQuads);

router.route('/available')
  .get(authenticate, authorize('admin'), getAvailableSmartQuads);

router.route('/:id')
  .get(authenticate, authorize('admin'), getSmartQuadById)
  .put(authenticate, authorize('admin'), updateSmartQuad)
  .delete(authenticate, authorize('admin'), deleteSmartQuad);

router.route('/:id/add-student')
  .post(authenticate, authorize('admin'), addStudentToSmartQuad);

router.route('/:id/remove-student/:studentId')
  .delete(authenticate, authorize('admin'), removeStudentFromSmartQuad);

router.route('/:id/sessions')
  .get(authenticate, authorize('admin'), getSmartQuadSessions);

export default router; 