import mongoose, { Document, Schema } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Subject name cannot be more than 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot be more than 200 characters'],
    },
    category: {
      type: String,
      trim: true,
      enum: ['Science', 'Mathematics', 'Language', 'Arts', 'Social Studies', 'Computer Science', 'Other'],
      default: 'Other',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
subjectSchema.index({ name: 1 });
subjectSchema.index({ category: 1 });
subjectSchema.index({ isActive: 1 });

export const Subject = mongoose.model<ISubject>('Subject', subjectSchema); 