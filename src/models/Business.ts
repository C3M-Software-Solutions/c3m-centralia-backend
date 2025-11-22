import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBusiness extends Document {
  user: Types.ObjectId;
  name: string;
  description?: string;
  photoUrl?: string;
  ruc: string;
  address?: string;
  hasPremises: boolean;
  hasRemoteSessions: boolean;
  phone?: string;
  email?: string;
  schedule?: {
    day: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters'],
      maxlength: [200, 'Business name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    photoUrl: {
      type: String,
      trim: true,
    },
    ruc: {
      type: String,
      required: [true, 'RUC is required'],
      trim: true,
      unique: true,
      match: [/^\d{11}$/, 'RUC must be 11 digits'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    hasPremises: {
      type: Boolean,
      default: true,
    },
    hasRemoteSessions: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    schedule: [
      {
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
        openTime: String,
        closeTime: String,
        isOpen: {
          type: Boolean,
          default: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
businessSchema.index({ user: 1 });
businessSchema.index({ ruc: 1 });
businessSchema.index({ isActive: 1 });

export const Business = mongoose.model<IBusiness>('Business', businessSchema);
