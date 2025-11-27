import { Request, Response, NextFunction } from 'express';

import { ClinicalRecordService } from '../services/clinicalRecordService.js';
import { Specialist } from '../models/Specialist.js';
import { AppError } from '../middleware/errorHandler.js';

const clinicalRecordService = new ClinicalRecordService();

export const createClinicalRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.role !== 'specialist' && req.user?.role !== 'admin') {
      throw new AppError('Only specialists can create clinical records', 403);
    }

    let specialistId = req.body.specialist;

    if (req.user.role === 'specialist') {
      const specialist = await Specialist.findOne({ user: req.user.userId });
      if (!specialist) {
        throw new AppError('Specialist profile not found', 404);
      }
      specialistId = specialist._id.toString();
    }

    const clinicalRecord = await clinicalRecordService.createClinicalRecord(
      req.user.userId.toString(),
      {
        patientId: req.body.user,
        businessId: req.body.business,
        specialistId,
        reservationId: req.body.reservation,
        diagnosis: req.body.diagnosis,
        treatment: req.body.treatment,
        notes: req.body.notes,
        vitalSigns: req.body.vitalSigns,
      }
    );

    const populatedRecord = await clinicalRecordService.getClinicalRecordById(
      clinicalRecord._id.toString(),
      req.user.userId.toString(),
      req.user.role
    );

    res.status(201).json({
      status: 'success',
      data: { clinicalRecord: populatedRecord },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        next(new AppError(error.message, 404));
      } else if (
        error.message.includes('unauthorized') ||
        error.message.includes('does not belong')
      ) {
        next(new AppError(error.message, 403));
      } else if (error.message.includes('already exists')) {
        next(new AppError(error.message, 409));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const getClinicalRecords = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { patient, specialist, business } = req.query;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const filter: Record<string, unknown> = {};

    if (userRole === 'client') {
      filter.patientId = userId.toString();
    } else if (userRole === 'specialist') {
      const specialistDoc = await Specialist.findOne({ user: userId });
      if (specialistDoc) {
        filter.specialistId = specialistDoc._id.toString();
      }
    }

    if (patient) filter.patientId = patient as string;
    if (specialist) filter.specialistId = specialist as string;
    if (business) filter.businessId = business as string;

    const records = await clinicalRecordService.getClinicalRecords(filter);

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
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const clinicalRecord = await clinicalRecordService.getClinicalRecordById(
      req.params.id,
      userId.toString(),
      userRole || 'client'
    );

    res.status(200).json({
      status: 'success',
      data: { clinicalRecord },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid')) {
        next(new AppError('Invalid clinical record ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Clinical record not found', 404));
      } else if (error.message.includes('Unauthorized')) {
        next(new AppError('Not authorized to view this record', 403));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const getClinicalRecordByReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const record = await clinicalRecordService.getClinicalRecordByReservation(
      req.params.id,
      userId.toString(),
      userRole || 'client'
    );

    res.status(200).json({
      status: 'success',
      data: { clinicalRecord: record },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid')) {
        next(new AppError('Invalid reservation ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError(error.message, 404));
      } else if (error.message.includes('Unauthorized')) {
        next(new AppError('Not authorized to view this record', 403));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const updateClinicalRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const updatedRecord = await clinicalRecordService.updateClinicalRecord(
      req.params.id,
      userId.toString(),
      userRole || 'client',
      req.body
    );

    res.status(200).json({
      status: 'success',
      data: { clinicalRecord: updatedRecord },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid')) {
        next(new AppError('Invalid clinical record ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Clinical record not found', 404));
      } else if (error.message.includes('Unauthorized')) {
        next(new AppError('Not authorized to update this record', 403));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};
