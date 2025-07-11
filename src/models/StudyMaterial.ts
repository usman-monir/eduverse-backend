import mongoose, { Document, Schema } from 'mongoose';

export interface IStudyMaterial extends Document {
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'jpg' | 'jpeg' | 'png';
  fileSize: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByName: string;
  uploadedAt: Date;
  subject: string;
  accessLevel: 'all' | 'student' | 'tutor' | 'admin';
  isProtected: boolean;
  downloadCount: number;
  viewCount: number;
  tags: string[];
  collectionName: string;
}

const studyMaterialSchema = new Schema<IStudyMaterial>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'mp4', 'ogg', 'webm'],
      required: [true, 'File type is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
    },
    uploadedByName: {
      type: String,
      required: [true, 'Uploader name is required'],
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    accessLevel: {
      type: String,
      enum: ['all', 'student', 'tutor', 'admin'],
      default: 'all',
    },
    isProtected: {
      type: Boolean,
      default: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: [0, 'Download count cannot be negative'],
    },
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative'],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    collectionName: {
      type: String,
      required: [true, 'Collection is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
studyMaterialSchema.index({ subject: 1, accessLevel: 1 });
studyMaterialSchema.index({ uploadedBy: 1, uploadedAt: -1 });
studyMaterialSchema.index({ tags: 1 });

export const StudyMaterial = mongoose.model<IStudyMaterial>(
  'StudyMaterial',
  studyMaterialSchema
);
