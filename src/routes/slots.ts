import express from 'express';
import {
  getWeeklyAvailability,
  updateWeeklyAvailability,
  deleteAvailabilityForDay,
} from '../controllers/weekly.controller';

const router = express.Router();

// GET all availability for a tutor
router.get('/:userId/availability', getWeeklyAvailability);

// UPDATE full weekly availability
router.put('/:userId/availability', updateWeeklyAvailability);

// DELETE specific day
router.delete('/:userId/availability/:day', deleteAvailabilityForDay);

export default router;
