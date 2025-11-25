import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClinicalRecord extends Document {
  user: Types.ObjectId;
  specialist: Types.ObjectId;
  business: Types.ObjectId;
  reservation?: Types.ObjectId;
  weight?: number; // in kg
  height?: number; // in cm
  bmi?: number;
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  diseases?: string[];
  allergies?: string[];
  medications?: string[];
  disability?: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  attachments?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const clinicalRecordSchema = new Schema<IClinicalRecord>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    specialist: {
      type: Schema.Types.ObjectId,
      ref: 'Specialist',
      required: [true, 'Specialist reference is required'],
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
    },
    reservation: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      index: true,
    },
    weight: {
      type: Number,
      min: [0, 'Weight must be a positive number'],
      max: [500, 'Weight seems invalid'],
    },
    height: {
      type: Number,
      min: [0, 'Height must be a positive number'],
      max: [300, 'Height seems invalid'],
    },
    bmi: {
      type: Number,
      min: [0, 'BMI must be a positive number'],
      max: [100, 'BMI seems invalid'],
    },
    bloodPressure: {
      type: String,
      trim: true,
      match: [/^\d{2,3}\/\d{2,3}$/, 'Blood pressure must be in format XXX/XXX'],
    },
    heartRate: {
      type: Number,
      min: [30, 'Heart rate seems too low'],
      max: [250, 'Heart rate seems too high'],
    },
    temperature: {
      type: Number,
      min: [30, 'Temperature seems too low'],
      max: [45, 'Temperature seems too high'],
    },
    diseases: [
      {
        type: String,
        trim: true,
      },
    ],
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    medications: [
      {
        type: String,
        trim: true,
      },
    ],
    disability: {
      type: String,
      trim: true,
      maxlength: [500, 'Disability description cannot exceed 500 characters'],
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
      maxlength: [2000, 'Diagnosis cannot exceed 2000 characters'],
    },
    treatment: {
      type: String,
      required: [true, 'Treatment is required'],
      trim: true,
      maxlength: [2000, 'Treatment cannot exceed 2000 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attachment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
clinicalRecordSchema.index({ user: 1, createdAt: -1 });
clinicalRecordSchema.index({ specialist: 1 });
clinicalRecordSchema.index({ business: 1 });
clinicalRecordSchema.index({ reservation: 1 }, { unique: true, sparse: true });

export const ClinicalRecord = mongoose.model<IClinicalRecord>(
  'ClinicalRecord',
  clinicalRecordSchema
);
