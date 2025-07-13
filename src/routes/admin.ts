import express from 'express';
import {
  getSystemStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAdminSessions,
  getAdminMaterials,
  getAllTutorsWithSubjects,
  approveUser,
  inviteUser,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public route to get all tutors with subjects
router.get('/tutors', getAllTutorsWithSubjects);

// Admin only routes
router.use(authenticate, authorize('admin'));

// System stats
router.get('/stats', getSystemStats);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/approve', approveUser);
router.post('/users/invite', inviteUser);

// Session management
router.get('/sessions', getAdminSessions);

// Material management
router.get('/materials', getAdminMaterials);

export default router;
