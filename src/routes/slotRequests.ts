import express from 'express';
import {
  getSlotRequests,
  getSlotRequestById,
  createSlotRequest,
  updateSlotRequestStatus,
  deleteSlotRequest,
} from '../controllers/slotRequestController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/slot-requests - Get all slot requests (filtered by role)
router.get('/', getSlotRequests);

// GET /api/slot-requests/:id - Get specific slot request
router.get('/:id', getSlotRequestById);

// POST /api/slot-requests - Create new slot request (students only)
router.post('/', authorize('student'), createSlotRequest);

// PUT /api/slot-requests/:id/status - Update slot request status (tutors & admins)
router.put('/:id/status', authorize('tutor', 'admin'), updateSlotRequestStatus);

// DELETE /api/slot-requests/:id - Delete slot request (owner & admins)
router.delete('/:id', deleteSlotRequest);

export default router;
