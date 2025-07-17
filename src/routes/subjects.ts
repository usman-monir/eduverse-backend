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
import { seedSubjects } from '../utils/seedSubjects';

const router = express.Router();

// Public routes
router.get('/', getSubjects);
router.get('/:id', getSubjectById);

// Protected routes (Admin only)
router.post('/', authenticate, authorize('admin'), createSubject);
router.put('/:id', authenticate, authorize('admin'), updateSubject);
router.delete('/:id', authenticate, authorize('admin'), deleteSubject);
router.put('/:id/toggle', authenticate, authorize('admin'), toggleSubjectStatus);

// Development route to seed subjects
router.post('/seed', async (req, res) => {
  try {
    await seedSubjects();
    res.json({
      success: true,
      message: 'Subjects seeded successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error seeding subjects',
    });
  }
});

export default router; 