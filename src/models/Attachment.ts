import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttachment extends Document {
  ownerType: 'business' | 'clinical_record' | 'reservation' | 'user';
  ownerId: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedBy: Types.ObjectId;
  metadata?: {
    width?: number;
    height?: number;
    description?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    ownerType: {
      type: String,
      enum: {
        values: ['business', 'clinical_record', 'reservation', 'user'],
        message: 'Owner type must be business, clinical_record, reservation, or user',
      },
      required: [true, 'Owner type is required'],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Owner ID is required'],
      index: true,
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
      required: [true, 'File type is required'],
      enum: ['image', 'document', 'video', 'other'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size must be positive'],
      max: [10485760, 'File size cannot exceed 10MB'], // 10MB limit
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded by is required'],
      index: true,
    },
    metadata: {
      width: Number,
      height: Number,
      description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
attachmentSchema.index({ ownerType: 1, ownerId: 1 });
attachmentSchema.index({ uploadedBy: 1, createdAt: -1 });

export const Attachment =
  mongoose.models.Attachment || mongoose.model<IAttachment>('Attachment', attachmentSchema);
