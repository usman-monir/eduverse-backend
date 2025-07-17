import mongoose, { Document, Schema } from 'mongoose';

export interface IClassSession extends Document {
  subject: string;
  tutor: mongoose.Types.ObjectId;
  tutorName: string;
  date: Date;
  time: string;
  duration: string;
  status: 'available' | 'booked' | 'completed' | 'cancelled' | 'pending' | 'approved';
  meetingLink?: string;
  description?: string;
  price?: number;
  type: 'admin_created' | 'tutor_created' | 'slot_request';
  students?: {
    studentId: mongoose.Types.ObjectId;
    studentName?: string;
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const classSessionSchema = new Schema<IClassSession>(
  {
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    tutor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tutor is required'],
    },
    tutorName: {
      type: String,
      required: [true, 'Tutor name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'completed', 'cancelled', 'pending', 'approved'],
      default: 'available',
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    type: {
      type: String,
      enum: ['admin_created', 'tutor_created', 'slot_request'],
      required: [true, 'Type is required'],
      default: 'admin_created',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    students: [
      {
        studentId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        studentName: {
          type: String,
          trim: true,
        },
      }
    ],

  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
classSessionSchema.index({ tutor: 1, date: 1, status: 1 });
classSessionSchema.index({ 'students.studentId': 1, status: 1 }); // ✅ correct path
classSessionSchema.index({ date: 1, status: 1 });
classSessionSchema.index({ type: 1, status: 1 });
classSessionSchema.index({ createdBy: 1, status: 1 });
classSessionSchema.index({ type: 1, createdBy: 1 });

export const ClassSession = mongoose.model<IClassSession>(
  'ClassSession',
  classSessionSchema
);
