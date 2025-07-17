import { Request, Response } from 'express';
import { User } from '../models/User';
import { ClassSession } from '../models/ClassSession'; // <-- make sure this path is correct
import { Weekday } from '../models/User';

const weekdays: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function isValidWeekday(day: string): day is Weekday {
  return weekdays.includes(day as Weekday);
}


export const getWeeklyAvailability = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // 1. Get the tutor's weekly availability
    const tutor = await User.findById(userId).select('weeklyAvailability role name');
    if (!tutor || tutor.role !== 'tutor') {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const weeklyAvailability = tutor.weeklyAvailability || {};

    // 2. Fetch sessions for this tutor
    const existingSessions = await ClassSession.find({
      tutor: tutor._id, // ✅ Use actual tutor ObjectId
      status: { $in: ['available', 'booked', 'completed', 'pending', 'approved'] },
      meetingLink: { $exists: true, $ne: '' }
    }).select('date time meetingLink status');

    // 3. Normalize format for frontend
    const sessions = existingSessions.map((session) => ({
      date: session.date.toISOString().split('T')[0],
      time: session.time,
      meetingLink: session.meetingLink,
      status: session.status,
    }));

    return res.json({
      availability: weeklyAvailability,
      existingSessions: sessions,
    });
  } catch (err) {
    console.error('Error getting availability:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE/SET entire weekly availability
export const updateWeeklyAvailability = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const availability = req.body; // Should match IWeeklyAvailability

  try {
    const user = await User.findById(userId);

    if (!user || user.role !== 'tutor') {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    user.weeklyAvailability = availability;
    await user.save();

    return res.json({
      message: 'Weekly availability updated',
      weeklyAvailability: user.weeklyAvailability,
    });
  } catch (err) {
    console.error('Error updating availability:', err);
    return res.status(500).json({ message: 'Failed to update availability' });
  }
};

// DELETE availability for a specific day
export const deleteAvailabilityForDay = async (req: Request, res: Response) => {
  const { userId, day } = req.params;
  console.log(`Attempting to delete availability for ${userId} on ${day}`);

  try {
    const user = await User.findById(userId);

    if (!user || user.role !== 'tutor') {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    if (!isValidWeekday(day)) {
      return res.status(400).json({ message: 'Invalid weekday' });
    }

    if (user.weeklyAvailability && user.weeklyAvailability[day]) {
      // Clone and update
      const updatedAvailability = { ...user.weeklyAvailability };
      delete updatedAvailability[day];

      // Save
      user.weeklyAvailability = updatedAvailability;
      user.markModified('weeklyAvailability');
      await user.save();

      console.log(`Availability for ${day} deleted successfully`);
    }

    return res.json({ message: `Availability for ${day} removed` });
  } catch (err) {
    console.error('Error deleting availability:', err);
    return res.status(500).json({ message: 'Failed to delete availability' });
  }
};
