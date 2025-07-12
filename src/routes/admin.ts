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
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public route to get all tutors with subjects
router.get('/tutors', getAllTutorsWithSubjects);

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// System statistics
router.get('/stats', getSystemStats);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.put('/users/:id/approve', approveUser);
router.delete('/users/:id', deleteUser);

// Session management
router.get('/sessions', getAdminSessions);

// Material management
router.get('/materials', getAdminMaterials);

export default router;
