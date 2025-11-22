import { Request, Response, NextFunction } from 'express';
import { Reservation } from '../models/Reservation.js';
import { Specialist } from '../models/Specialist.js';
import { Service } from '../models/Service.js';
import { AppError } from '../middleware/errorHandler.js';

export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { business, specialist, service, startDate, notes } = req.body;

    // Verify specialist exists and is active
    const specialistDoc = await Specialist.findById(specialist);
    if (!specialistDoc || !specialistDoc.isActive) {
      throw new AppError('Specialist not found or inactive', 404);
    }

    // Verify service exists and get duration
    const serviceDoc = await Service.findById(service);
    if (!serviceDoc || !serviceDoc.isActive) {
      throw new AppError('Service not found or inactive', 404);
    }

    // Calculate end date based on service duration
    const start = new Date(startDate);
    const end = new Date(start.getTime() + serviceDoc.duration * 60000);

    // Check for conflicts
    const conflictingReservation = await Reservation.findOne({
      specialist,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startDate: { $lt: end, $gte: start } },
        { endDate: { $gt: start, $lte: end } },
        { startDate: { $lte: start }, endDate: { $gte: end } },
      ],
    });

    if (conflictingReservation) {
      throw new AppError('Time slot is already booked', 409);
    }

    const reservation = await Reservation.create({
      user: req.user?.userId,
      business,
      specialist,
      service,
      startDate: start,
      endDate: end,
      notes,
      status: 'pending',
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'name email phone')
      .populate('business', 'name')
      .populate('specialist')
      .populate('service', 'name duration price');

    res.status(201).json({
      status: 'success',
      data: { reservation: populatedReservation },
    });
  } catch (error) {
    next(error);
  }
};

export const getReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, specialist, startDate, endDate } = req.query;
    
    const filter: any = {};

    // Users see only their reservations, specialists see theirs, admins see all
    if (req.user?.role === 'client') {
      filter.user = req.user.userId;
    } else if (req.user?.role === 'specialist') {
      const specialistDoc = await Specialist.findOne({ user: req.user.userId });
      if (specialistDoc) {
        filter.specialist = specialistDoc._id;
      }
    }

    if (status) {
      filter.status = status;
    }

    if (specialist) {
      filter.specialist = specialist;
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate as string);
      if (endDate) filter.startDate.$lte = new Date(endDate as string);
    }

    const reservations = await Reservation.find(filter)
      .populate('user', 'name email phone')
      .populate('business', 'name address')
      .populate('specialist')
      .populate('service', 'name duration price')
      .sort({ startDate: 1 });

    res.status(200).json({
      status: 'success',
      results: reservations.length,
      data: { reservations },
    });
  } catch (error) {
    next(error);
  }
};

export const getReservationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('business', 'name address')
      .populate('specialist')
      .populate('service', 'name duration price');

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    // Check authorization
    if (
      req.user?.role === 'client' &&
      reservation.user._id.toString() !== req.user.userId.toString()
    ) {
      throw new AppError('Not authorized to view this reservation', 403);
    }

    res.status(200).json({
      status: 'success',
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
};

export const updateReservationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, cancellationReason } = req.body;

    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    // Authorization checks
    if (req.user?.role === 'client') {
      if (reservation.user.toString() !== req.user.userId.toString()) {
        throw new AppError('Not authorized', 403);
      }
      if (status !== 'cancelled') {
        throw new AppError('Clients can only cancel reservations', 403);
      }
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status, cancellationReason },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email phone')
      .populate('business', 'name')
      .populate('specialist')
      .populate('service', 'name duration price');

    res.status(200).json({
      status: 'success',
      data: { reservation: updatedReservation },
    });
  } catch (error) {
    next(error);
  }
};

export const checkAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { specialist, service, date } = req.query;

    if (!specialist || !service || !date) {
      throw new AppError('Specialist, service, and date are required', 400);
    }

    const serviceDoc = await Service.findById(service);
    if (!serviceDoc) {
      throw new AppError('Service not found', 404);
    }

    // Get reservations for the day
    const startOfDay = new Date(date as string);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date as string);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSlots = await Reservation.find({
      specialist,
      status: { $in: ['pending', 'confirmed'] },
      startDate: { $gte: startOfDay, $lte: endOfDay },
    }).select('startDate endDate');

    res.status(200).json({
      status: 'success',
      data: {
        serviceDuration: serviceDoc.duration,
        bookedSlots: bookedSlots.map((slot) => ({
          start: slot.startDate,
          end: slot.endDate,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
