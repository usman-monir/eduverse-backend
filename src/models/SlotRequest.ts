import mongoose, { Document, Schema } from 'mongoose';

export interface ISlotRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  subject: string;
  preferredDate: Date;
  preferredTime: string;
  duration: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedTutor?: mongoose.Types.ObjectId; // The tutor the student requested
  requestedTutorName?: string; // Name of the requested tutor
  assignedTutor?: mongoose.Types.ObjectId; // The tutor assigned by admin (can be different from requested)
  assignedTutorName?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  completedAt?: Date;
  requestedAt: Date;
}

const slotRequestSchema = new Schema<ISlotRequest>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    preferredDate: {
      type: Date,
      required: [true, 'Preferred date is required'],
    },
    preferredTime: {
      type: String,
      required: [true, 'Preferred time is required'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    requestedTutor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    requestedTutorName: {
      type: String,
      trim: true,
    },
    assignedTutor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedTutorName: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Rejection reason cannot be more than 200 characters'],
    },
    completedAt: {
      type: Date,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
slotRequestSchema.index({ studentId: 1, status: 1, requestedAt: -1 });
slotRequestSchema.index({ assignedTutor: 1, status: 1 });
slotRequestSchema.index({ status: 1, preferredDate: 1 });

export const SlotRequest = mongoose.model<ISlotRequest>(
  'SlotRequest',
  slotRequestSchema
);
