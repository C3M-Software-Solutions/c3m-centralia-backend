import { Reservation } from '../models/Reservation.js';
import { Service } from '../models/Service.js';
import { Specialist } from '../models/Specialist.js';
import { Types } from 'mongoose';

export interface CreateReservationData {
  userId: string;
  businessId: string;
  serviceId: string;
  specialistId: string;
  startDate: Date;
  notes?: string;
}

export interface UpdateReservationData {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  cancellationReason?: string;
  notes?: string;
}

export interface ReservationFilterData {
  userId?: string;
  specialistId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ReservationService {
  async createReservation(data: CreateReservationData) {
    // Verify specialist exists and is active
    const specialist = await Specialist.findById(data.specialistId);
    if (!specialist || !specialist.isActive) {
      throw new Error('Specialist not found or inactive');
    }

    // Verify service exists and get duration
    const service = await Service.findById(data.serviceId);
    if (!service || !service.isActive) {
      throw new Error('Service not found or inactive');
    }

    // Calculate end date based on service duration
    const start = new Date(data.startDate);
    const end = new Date(start.getTime() + service.duration * 60000);

    // Check for conflicts
    const conflictingReservation = await Reservation.findOne({
      specialist: data.specialistId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startDate: { $lt: end, $gte: start } },
        { endDate: { $gt: start, $lte: end } },
        { startDate: { $lte: start }, endDate: { $gte: end } },
      ],
    });

    if (conflictingReservation) {
      throw new Error('Time slot is already booked');
    }

    const reservation = await Reservation.create({
      user: data.userId,
      business: data.businessId,
      specialist: data.specialistId,
      service: data.serviceId,
      startDate: start,
      endDate: end,
      notes: data.notes,
      status: 'pending',
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'name email phone')
      .populate('business', 'name')
      .populate('specialist')
      .populate('service', 'name duration price');

    return populatedReservation;
  }

  async getReservationById(reservationId: string) {
    if (!Types.ObjectId.isValid(reservationId)) {
      throw new Error('Invalid reservation ID');
    }

    const reservation = await Reservation.findById(reservationId)
      .populate('user', 'name email phone')
      .populate('business', 'name address')
      .populate('specialist')
      .populate('service', 'name duration price');

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    return reservation;
  }

  async getReservations(filter: ReservationFilterData) {
    interface QueryFilter {
      user?: string;
      specialist?: string;
      status?: string;
      startDate?: {
        $gte?: Date;
        $lte?: Date;
      };
    }

    const query: QueryFilter = {};

    if (filter.userId) {
      query.user = filter.userId;
    }

    if (filter.specialistId) {
      query.specialist = filter.specialistId;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      query.startDate = {};
      if (filter.startDate) query.startDate.$gte = filter.startDate;
      if (filter.endDate) query.startDate.$lte = filter.endDate;
    }

    const reservations = await Reservation.find(query)
      .populate('user', 'name email phone')
      .populate('business', 'name address')
      .populate('specialist')
      .populate('service', 'name duration price')
      .sort({ startDate: 1 });

    return reservations;
  }

  async updateReservationStatus(
    reservationId: string,
    userId: string,
    userRole: string,
    data: UpdateReservationData
  ) {
    if (!Types.ObjectId.isValid(reservationId)) {
      throw new Error('Invalid reservation ID');
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Check authorization
    const reservationUserId = reservation.user?.toString() || reservation.get('user')?.toString();
    const isOwner = reservationUserId === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      // Check if user is the specialist of this reservation
      const reservationSpecialistId =
        reservation.specialist?.toString() || reservation.get('specialist')?.toString();
      const specialist = await Specialist.findOne({
        _id: reservationSpecialistId,
        user: userId,
      });

      if (!specialist && userRole === 'client' && data.status !== 'cancelled') {
        throw new Error('Clients can only cancel reservations');
      }

      if (!specialist && userRole === 'client') {
        throw new Error('Unauthorized to modify this reservation');
      }
    }

    // Update fields
    if (data.status) reservation.status = data.status;
    if (data.cancellationReason) reservation.cancellationReason = data.cancellationReason;
    if (data.notes !== undefined) reservation.notes = data.notes;

    await reservation.save();

    const updatedReservation = await Reservation.findById(reservationId)
      .populate('user', 'name email phone')
      .populate('business', 'name')
      .populate('specialist')
      .populate('service', 'name duration price');

    return updatedReservation;
  }

  async checkAvailability(specialistId: string, serviceId: string, date: Date) {
    if (!Types.ObjectId.isValid(specialistId) || !Types.ObjectId.isValid(serviceId)) {
      throw new Error('Invalid specialist or service ID');
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Get reservations for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSlots = await Reservation.find({
      specialist: specialistId,
      status: { $in: ['pending', 'confirmed'] },
      startDate: { $gte: startOfDay, $lte: endOfDay },
    }).select('startDate endDate');

    return {
      serviceDuration: service.duration,
      bookedSlots: bookedSlots.map((slot) => ({
        start: slot.startDate,
        end: slot.endDate,
      })),
    };
  }
}

export const reservationService = new ReservationService();
