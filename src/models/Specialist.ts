import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISpecialist extends Document {
  user: Types.ObjectId;
  business: Types.ObjectId;
  specialty: string;
  licenseNumber?: string;
  bio?: string;
  availability: {
    day: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
  services: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const specialistSchema = new Schema<ISpecialist>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      index: true,
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true,
      maxlength: [200, 'Specialty cannot exceed 200 characters'],
    },
    licenseNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'License number cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    availability: [
      {
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          required: true,
        },
        startTime: {
          type: String,
          required: true,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
        },
        endTime: {
          type: String,
          required: true,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],
    services: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Service',
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
specialistSchema.index({ user: 1 });
specialistSchema.index({ business: 1, isActive: 1 });
specialistSchema.index({ specialty: 1 });

export const Specialist = mongoose.model<ISpecialist>('Specialist', specialistSchema);
