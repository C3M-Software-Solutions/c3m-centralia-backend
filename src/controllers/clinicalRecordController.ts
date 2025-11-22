import { Request, Response, NextFunction } from 'express';
import { ClinicalRecord } from '../models/ClinicalRecord.js';
import { Specialist } from '../models/Specialist.js';
import { AppError } from '../middleware/errorHandler.js';

export const createClinicalRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Only specialists can create clinical records
    if (req.user?.role !== 'specialist' && req.user?.role !== 'admin') {
      throw new AppError('Only specialists can create clinical records', 403);
    }

    let specialistId = req.body.specialist;

    // If specialist is creating the record, use their ID
    if (req.user.role === 'specialist') {
      const specialist = await Specialist.findOne({ user: req.user.userId });
      if (!specialist) {
        throw new AppError('Specialist profile not found', 404);
      }
      specialistId = specialist._id;
    }

    const clinicalRecord = await ClinicalRecord.create({
      ...req.body,
      specialist: specialistId,
    });

    const populatedRecord = await ClinicalRecord.findById(clinicalRecord._id)
      .populate('user', 'name email')
      .populate('specialist')
      .populate('business', 'name')
      .populate('attachments');

    res.status(201).json({
      status: 'success',
      data: { clinicalRecord: populatedRecord },
    });
  } catch (error) {
    next(error);
  }
};

export const getClinicalRecords = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.query;
    
    const filter: any = {};

    // Clients can only see their own records
    if (req.user?.role === 'client') {
      filter.user = req.user.userId;
    } else if (userId) {
      filter.user = userId;
    }

    const records = await ClinicalRecord.find(filter)
      .populate('user', 'name email')
      .populate('specialist')
      .populate('business', 'name')
      .populate('attachments')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: records.length,
      data: { clinicalRecords: records },
    });
  } catch (error) {
    next(error);
  }
};

export const getClinicalRecordById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const record = await ClinicalRecord.findById(req.params.id)
      .populate('user', 'name email')
      .populate('specialist')
      .populate('business', 'name')
      .populate('attachments');

    if (!record) {
      throw new AppError('Clinical record not found', 404);
    }

    // Authorization: user can see their own, specialists and admins can see all
    if (
      req.user?.role === 'client' &&
      record.user._id.toString() !== req.user.userId.toString()
    ) {
      throw new AppError('Not authorized to view this record', 403);
    }

    res.status(200).json({
      status: 'success',
      data: { clinicalRecord: record },
    });
  } catch (error) {
    next(error);
  }
};

export const updateClinicalRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const record = await ClinicalRecord.findById(req.params.id);

    if (!record) {
      throw new AppError('Clinical record not found', 404);
    }

    // Only the specialist who created it or admin can update
    if (req.user?.role === 'specialist') {
      const specialist = await Specialist.findOne({ user: req.user.userId });
      if (specialist && record.specialist.toString() !== specialist._id.toString()) {
        throw new AppError('Not authorized to update this record', 403);
      }
    }

    const updatedRecord = await ClinicalRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('specialist')
      .populate('business', 'name')
      .populate('attachments');

    res.status(200).json({
      status: 'success',
      data: { clinicalRecord: updatedRecord },
    });
  } catch (error) {
    next(error);
  }
};
