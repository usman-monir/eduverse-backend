import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppTemplate extends Document {
  title: string;
  category: string;
  template: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppTemplateSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    template: { type: String, required: true },
  },
  { timestamps: true }
);

export const WhatsAppTemplate = mongoose.model<IWhatsAppTemplate>(
  'WhatsAppTemplate',
  WhatsAppTemplateSchema
);
