import mongoose from 'mongoose';
import { User } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduverse';

const teachers = [
  { name: 'NIM', email: 'contact@scoresmartpte.com' },
  { name: 'Esha', email: 'contact+1@scoresmartpte.com' },
  { name: 'Shrishti', email: 'contact+2@scoresmartpte.com' },
  { name: 'Alisha', email: 'contact+3@scoresmartpte.com' },
  { name: 'Lakshay', email: 'contact+4@scoresmartpte.com' },
];

async function seedTeachers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    for (const teacher of teachers) {
      const exists = await User.findOne({ email: teacher.email });
      if (!exists) {
        await User.create({
          name: teacher.name,
          email: teacher.email,
          password: '1122', // Default password
          role: 'tutor',
          status: 'active',
        });
        console.log(`Created teacher: ${teacher.name} (${teacher.email})`);
      } else {
        console.log(`Teacher already exists: ${teacher.email}`);
      }
    }
  } catch (err) {
    console.error('Error seeding teachers:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedTeachers(); 