import { ClinicalRecord } from '../models/ClinicalRecord.js';
import { Attachment } from '../models/Attachment.js';
import { Specialist } from '../models/Specialist.js';
import { Business } from '../models/Business.js';
import { Reservation } from '../models/Reservation.js';

export interface CreateClinicalRecordData {
  patientId: string;
  businessId: string;
  specialistId: string;
  reservationId?: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  vitalSigns?: {
    weight?: number;
    height?: number;
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
}

export interface UpdateClinicalRecordData {
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
}

export interface CreateAttachmentData {
  clinicalRecordId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
}

export class ClinicalRecordService {
  async createClinicalRecord(userId: string, data: CreateClinicalRecordData) {
    // Verify specialist exists and belongs to user
    const specialist = await Specialist.findOne({
      _id: data.specialistId,
      user: userId,
    });

    if (!specialist) {
      throw new Error('Specialist not found or unauthorized');
    }

    // Verify business exists
    const business = await Business.findById(data.businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // If reservationId is provided, validate it
    if (data.reservationId) {
      const reservation = await Reservation.findById(data.reservationId);

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Verify reservation belongs to the correct patient, specialist, and business
      if (reservation.user.toString() !== data.patientId) {
        throw new Error('Reservation does not belong to this patient');
      }

      if (reservation.specialist.toString() !== data.specialistId) {
        throw new Error('Reservation does not belong to this specialist');
      }

      if (reservation.business.toString() !== data.businessId) {
        throw new Error('Reservation does not belong to this business');
      }

      // Check if a clinical record already exists for this reservation
      const existingRecord = await ClinicalRecord.findOne({ reservation: data.reservationId });
      if (existingRecord) {
        throw new Error('Clinical record already exists for this reservation');
      }
    }

    const clinicalRecord = await ClinicalRecord.create({
      user: data.patientId,
      business: data.businessId,
      specialist: data.specialistId,
      reservation: data.reservationId,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      notes: data.notes,
      weight: data.vitalSigns?.weight,
      height: data.vitalSigns?.height,
      bloodPressure: data.vitalSigns?.bloodPressure,
      heartRate: data.vitalSigns?.heartRate,
      temperature: data.vitalSigns?.temperature,
    });

    return clinicalRecord;
  }

  async getClinicalRecords(filter: {
    patientId?: string;
    specialistId?: string;
    businessId?: string;
  }) {
    const query: Record<string, unknown> = {};

    if (filter.patientId) query.user = filter.patientId;
    if (filter.specialistId) query.specialist = filter.specialistId;
    if (filter.businessId) query.business = filter.businessId;

    const records = await ClinicalRecord.find(query)
      .populate('user', 'name email phone')
      .populate('business', 'name')
      .populate('specialist')
      .sort({ createdAt: -1 });

    return records;
  }

  async getClinicalRecordById(recordId: string, userId: string, userRole: string) {
    const record = await ClinicalRecord.findById(recordId)
      .populate('user', 'name email phone')
      .populate('business', 'name')
      .populate('specialist');

    if (!record) {
      throw new Error('Clinical record not found');
    }

    // Check authorization
    const patientId = record.get('patient')?._id || record.get('patient');
    const isPatient = patientId?.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (!isPatient && !isAdmin) {
      // Check if user is the specialist
      const specialistId = record.get('specialist')?._id || record.get('specialist');
      const specialist = await Specialist.findOne({
        _id: specialistId,
        user: userId,
      });

      if (!specialist) {
        throw new Error('Unauthorized to view this clinical record');
      }
    }

    return record;
  }

  async getClinicalRecordByReservation(reservationId: string, userId: string, userRole: string) {
    const record = await ClinicalRecord.findOne({ reservation: reservationId })
      .populate('user', 'name email phone')
      .populate('business', 'name')
      .populate('specialist')
      .populate('reservation');

    if (!record) {
      throw new Error('Clinical record not found for this reservation');
    }

    // Check authorization
    const patientId = record.user._id || record.get('user');
    const isPatient = patientId?.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (!isPatient && !isAdmin) {
      // Check if user is the specialist
      const specialistId = record.specialist._id || record.get('specialist');
      const specialist = await Specialist.findOne({
        _id: specialistId,
        user: userId,
      });

      if (!specialist) {
        throw new Error('Unauthorized to view this clinical record');
      }
    }

    return record;
  }

  async getClinicalRecordsByPatient(
    patientId: string,
    requestingUserId: string,
    userRole: string,
    page = 1,
    limit = 10
  ) {
    // Check authorization - only patient themselves, their specialists, or admins can view
    const isPatient = patientId === requestingUserId;
    const isAdmin = userRole === 'admin';

    if (!isPatient && !isAdmin) {
      throw new Error('Unauthorized to view these clinical records');
    }

    const skip = (page - 1) * limit;
    const records = await ClinicalRecord.find({ user: patientId })
      .populate('business', 'name')
      .populate('specialist')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ClinicalRecord.countDocuments({ user: patientId });

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getClinicalRecordsBySpecialist(specialistId: string, userId: string, page = 1, limit = 10) {
    // Verify specialist belongs to user
    const specialist = await Specialist.findOne({
      _id: specialistId,
      user: userId,
    });

    if (!specialist) {
      throw new Error('Unauthorized to view these clinical records');
    }

    const skip = (page - 1) * limit;
    const records = await ClinicalRecord.find({ specialist: specialistId })
      .populate('patient', 'name email phone')
      .populate('business', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ClinicalRecord.countDocuments({ specialist: specialistId });

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateClinicalRecord(
    recordId: string,
    userId: string,
    userRole: string,
    data: UpdateClinicalRecordData
  ) {
    const record = await ClinicalRecord.findById(recordId);
    if (!record) {
      throw new Error('Clinical record not found');
    }

    // Verify user is the specialist who created the record or admin
    if (userRole !== 'admin') {
      const specialist = await Specialist.findOne({
        _id: record.specialist,
        user: userId,
      });

      if (!specialist) {
        throw new Error('Unauthorized to update this clinical record');
      }
    }

    // Update fields
    Object.assign(record, data);
    await record.save();

    return record;
  }

  async deleteClinicalRecord(recordId: string, userId: string, userRole: string) {
    const record = await ClinicalRecord.findById(recordId);
    if (!record) {
      throw new Error('Clinical record not found');
    }

    // Only admins or the specialist who created it can delete
    if (userRole !== 'admin') {
      const specialist = await Specialist.findOne({
        _id: record.specialist,
        user: userId,
      });

      if (!specialist) {
        throw new Error('Unauthorized to delete this clinical record');
      }
    }

    await ClinicalRecord.deleteOne({ _id: recordId });
    return { message: 'Clinical record deleted successfully' };
  }

  // Attachment management
  async createAttachment(userId: string, data: CreateAttachmentData) {
    // Verify clinical record exists and user has access
    const record = await ClinicalRecord.findById(data.clinicalRecordId);
    if (!record) {
      throw new Error('Clinical record not found');
    }

    // Verify user is the specialist
    const specialist = await Specialist.findOne({
      _id: record.specialist,
      user: userId,
    });

    if (!specialist) {
      throw new Error('Unauthorized to add attachments');
    }

    const attachment = await Attachment.create({
      clinicalRecord: data.clinicalRecordId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: data.fileSize,
      description: data.description,
    });

    return attachment;
  }

  async getAttachmentsByClinicalRecord(recordId: string, userId: string, userRole: string) {
    // Verify clinical record exists and user has access
    const record = await ClinicalRecord.findById(recordId);
    if (!record) {
      throw new Error('Clinical record not found');
    }

    // Check authorization
    const patientId = record.get('patient');
    const isPatient = patientId?.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (!isPatient && !isAdmin) {
      const specialistId = record.get('specialist');
      const specialist = await Specialist.findOne({
        _id: specialistId,
        user: userId,
      });

      if (!specialist) {
        throw new Error('Unauthorized to view attachments');
      }
    }

    const attachments = await Attachment.find({ clinicalRecord: recordId });
    return attachments;
  }

  async deleteAttachment(attachmentId: string, userId: string, userRole: string) {
    const attachment = await Attachment.findById(attachmentId).populate('clinicalRecord');
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const clinicalRecordId = attachment.get('clinicalRecord');
    const clinicalRecord = await ClinicalRecord.findById(clinicalRecordId);

    // Only admins or the specialist can delete
    if (userRole !== 'admin' && clinicalRecord) {
      const specialistId = clinicalRecord.get('specialist');
      const specialist = await Specialist.findOne({
        _id: specialistId,
        user: userId,
      });

      if (!specialist) {
        throw new Error('Unauthorized to delete this attachment');
      }
    }

    await Attachment.deleteOne({ _id: attachmentId });
    return { message: 'Attachment deleted successfully' };
  }
}

export const clinicalRecordService = new ClinicalRecordService();
