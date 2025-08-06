import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISmartQuad extends Document {
  name: string;
  description?: string;
  tutor: Types.ObjectId;
  tutorName: string;
  students: {
    studentId: Types.ObjectId;
    studentName: string;
    email: string;
    phone?: string;
  }[];
  maxStudents: number;
  currentStudents: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  courseType: 'one-on-one' | 'smart-quad';
  preferredLanguage: 'English' | 'Hindi' | 'Punjabi' | 'Nepali';
  desiredScore: number;
  examDeadline: Date;
  courseDuration: number; // in weeks
  totalSessions: number;
  completedSessions: number;
  courseExpiryDate: Date;
  weeklySchedule: {
    day: string;
    time: string;
    duration: number; // in minutes
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
}, { _id: false });

const weeklyScheduleSchema = new Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  time: {
    type: String,
    required: true, // e.g., "14:00"
  },
  duration: {
    type: Number,
    required: true,
    default: 60, // 60 minutes
  },
}, { _id: false });

const smartQuadSchema = new Schema<ISmartQuad>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  tutor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tutorName: {
    type: String,
    required: true,
  },
  students: {
    type: [studentSchema],
    default: [],
  },
  maxStudents: {
    type: Number,
    required: true,
    default: 4,
  },
  currentStudents: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['forming', 'active', 'completed', 'cancelled'],
    default: 'forming',
  },
  courseType: {
    type: String,
    enum: ['one-on-one', 'smart-quad'],
    required: true,
  },
  preferredLanguage: {
    type: String,
    enum: ['English', 'Hindi', 'Punjabi', 'Nepali'],
    required: true,
  },
  desiredScore: {
    type: Number,
    required: true,
    min: 0,
    max: 90,
  },
  examDeadline: {
    type: Date,
    required: true,
  },
  courseDuration: {
    type: Number,
    required: true,
    min: 1,
  },
  totalSessions: {
    type: Number,
    required: true,
    min: 1,
  },
  completedSessions: {
    type: Number,
    default: 0,
  },
  courseExpiryDate: {
    type: Date,
    required: true,
  },
  weeklySchedule: {
    type: [weeklyScheduleSchema],
    default: [],
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
smartQuadSchema.index({ status: 1, currentStudents: 1 });
smartQuadSchema.index({ tutor: 1, status: 1 });
smartQuadSchema.index({ 'students.studentId': 1 });
smartQuadSchema.index({ preferredLanguage: 1, status: 1 });
smartQuadSchema.index({ courseExpiryDate: 1 });
smartQuadSchema.index({ createdBy: 1 });

export const SmartQuad = mongoose.model<ISmartQuad>('SmartQuad', smartQuadSchema); 