import mongoose from 'mongoose';
import { User } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/score-smart-lms';

const students = Array.from({ length: 10 }, (_, i) => ({
  name: `Student ${i + 1}`,
  email: `bitf19m020+${i + 1}@pucit.edu.pk`,
}));

async function seedStudents() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete all students with emails matching bitf19m020*@*
    const deleteResult = await User.deleteMany({
      email: { $regex: /^bitf19m020.*@/i },
      role: 'student',
    });
    console.log(`Deleted ${deleteResult.deletedCount} existing students matching bitf19m020*@*`);

    for (const student of students) {
      await User.create({
        name: student.name,
        email: student.email,
        password: '1122', // Default password
        role: 'student',
        status: 'active',
      });
      console.log(`Created student: ${student.name} (${student.email})`);
    }
  } catch (err) {
    console.error('Error seeding students:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedStudents(); 