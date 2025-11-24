import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservationService.js';
import { Specialist } from '../models/Specialist.js';
import { AppError } from '../middleware/errorHandler.js';

export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { business, specialist, service, startDate, notes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const reservation = await reservationService.createReservation({
      userId: userId.toString(),
      businessId: business,
      specialistId: specialist,
      serviceId: service,
      startDate: new Date(startDate),
      notes,
    });

    res.status(201).json({
      status: 'success',
      data: { reservation },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        next(new AppError(error.message, 404));
      } else if (error.message.includes('already booked')) {
        next(new AppError(error.message, 409));
      } else if (
        error.message.includes('does not belong') ||
        error.message.includes('cannot provide')
      ) {
        next(new AppError(error.message, 400));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const getReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, specialist, startDate, endDate } = req.query;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const filter: Record<string, unknown> = {};

    // Users see only their reservations, specialists see theirs, admins see all
    if (userRole === 'client') {
      filter.userId = userId?.toString();
    } else if (userRole === 'specialist') {
      const specialistDoc = await Specialist.findOne({ user: userId });
      if (specialistDoc) {
        filter.specialistId = specialistDoc._id.toString();
      }
    }

    if (status) {
      filter.status = status as string;
    }

    if (specialist) {
      filter.specialistId = specialist as string;
    }

    if (startDate) {
      filter.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filter.endDate = new Date(endDate as string);
    }

    const reservations = await reservationService.getReservations(filter);

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
    const reservation = await reservationService.getReservationById(req.params.id);

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
    if (error instanceof Error) {
      if (error.message.includes('Invalid reservation ID')) {
        next(new AppError('Invalid reservation ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Reservation not found', 404));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const updateReservationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, cancellationReason } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const reservation = await reservationService.updateReservationStatus(
      req.params.id,
      userId.toString(),
      userRole || 'client',
      { status, cancellationReason }
    );

    res.status(200).json({
      status: 'success',
      data: { reservation },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid reservation ID')) {
        next(new AppError('Invalid reservation ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Reservation not found', 404));
      } else if (
        error.message.includes('Unauthorized') ||
        error.message.includes('Clients can only')
      ) {
        next(new AppError(error.message, 403));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
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

    const availability = await reservationService.checkAvailability(
      specialist as string,
      service as string,
      new Date(date as string)
    );

    res.status(200).json({
      status: 'success',
      data: availability,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid')) {
        next(new AppError(error.message, 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Service not found', 404));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};
