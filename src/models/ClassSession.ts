import mongoose, { Document, Schema } from 'mongoose';

export interface IClassSession extends Document {
  subject: string;
  tutor: mongoose.Types.ObjectId;
  tutorName: string;
  date: Date;
  time: string;
  duration: string;
  status: 'available' | 'booked' | 'completed' | 'cancelled' | 'pending' | 'approved';
  enrolledStudents: Array<{
    studentId: mongoose.Types.ObjectId;
    studentName: string;
    enrolledAt: Date;
  }>;
  meetingLink?: string;
  description?: string;
  price?: number;
  type: 'admin_created' | 'tutor_created' | 'slot_request';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  enrollmentCount: number;
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
    enrolledStudents: [
      {
        studentId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        studentName: {
          type: String,
          required: true,
          trim: true,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
classSessionSchema.index({ tutor: 1, date: 1, status: 1 });
classSessionSchema.index({ 'enrolledStudents.studentId': 1, status: 1 });
classSessionSchema.index({ date: 1, status: 1 });
classSessionSchema.index({ createdBy: 1, status: 1 });


// Virtual for enrollment count
classSessionSchema.virtual('enrollmentCount').get(function() {
  return this.enrolledStudents.length;
});

// Ensure virtuals are included in JSON output
classSessionSchema.set('toJSON', { virtuals: true });

export const ClassSession = mongoose.model<IClassSession>(
  'ClassSession',
  classSessionSchema
);
