import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDaySchedule {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isAvailable: boolean;
  startTime?: string; // e.g., '09:00'
  endTime?: string;   // e.g., '17:00'
}

export interface IWeeklyAvailability extends Document {
  tutor: Types.ObjectId;
  schedule: IDaySchedule[];
  createdBy: 'tutor' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const dayScheduleSchema = new Schema<IDaySchedule>(
  {
    day: {
      type: String,
      enum: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
  },
  { _id: false }
);

const weeklyAvailabilitySchema = new Schema<IWeeklyAvailability>(
  {
    tutor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    schedule: {
      type: [dayScheduleSchema],
      required: true,
      default: [],
    },
    createdBy: {
      type: String,
      enum: ['tutor', 'admin'],
      required: true,
    },
  },
  { timestamps: true }
);

export const WeeklyAvailability = mongoose.model<IWeeklyAvailability>(
  'WeeklyAvailability',
  weeklyAvailabilitySchema
);
