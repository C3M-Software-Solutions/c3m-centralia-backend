import { Reservation } from '../models/Reservation';
import { Service } from '../models/Service';
import { Specialist } from '../models/Specialist';
import { Types } from 'mongoose';
import { notificationService } from './notificationService';

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

    // Verify specialist belongs to the business
    if (specialist.business.toString() !== data.businessId) {
      throw new Error('Specialist does not belong to this business');
    }

    // Verify service exists and get duration
    const service = await Service.findById(data.serviceId);
    if (!service || !service.isActive) {
      throw new Error('Service not found or inactive');
    }

    // Verify service belongs to the business
    if (service.business.toString() !== data.businessId) {
      throw new Error('Service does not belong to this business');
    }

    // Verify specialist can provide this service
    const specialistServices = specialist.services.map((s) => s.toString());
    if (specialistServices.length > 0 && !specialistServices.includes(data.serviceId)) {
      throw new Error('Specialist cannot provide this service');
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
      .populate('user', 'name email phone avatar')
      .populate('business', 'name address phone email')
      .populate({
        path: 'specialist',
        select: 'specialty licenseNumber bio availability services',
        populate: [
          { path: 'user', select: 'name email phone avatar' },
          { path: 'services', select: 'name description duration price category' },
        ],
      })
      .populate('service', 'name description duration price category');

    // Send notification to specialist
    if (populatedReservation) {
      try {
        await notificationService.sendReservationCreated(populatedReservation);
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Don't fail the reservation if notification fails
      }
    }

    return populatedReservation;
  }

  async getReservationById(reservationId: string) {
    if (!Types.ObjectId.isValid(reservationId)) {
      throw new Error('Invalid reservation ID');
    }

    const reservation = await Reservation.findById(reservationId)
      .populate('user', 'name email phone avatar')
      .populate('business', 'name address phone email')
      .populate({
        path: 'specialist',
        select: 'specialty licenseNumber bio availability services',
        populate: [
          { path: 'user', select: 'name email phone avatar' },
          { path: 'services', select: 'name description duration price category' },
        ],
      })
      .populate('service', 'name description duration price category');

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
      .populate('user', 'name email phone avatar')
      .populate('business', 'name address phone email')
      .populate({
        path: 'specialist',
        select: 'specialty licenseNumber bio availability services',
        populate: [
          { path: 'user', select: 'name email phone avatar' },
          { path: 'services', select: 'name description duration price category' },
        ],
      })
      .populate('service', 'name description duration price category')
      .sort({ startDate: 1 });

    console.log('Found reservations:', reservations);
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

    // Store old status to detect changes
    const oldStatus = reservation.status;

    // Update fields
    if (data.status) reservation.status = data.status;
    if (data.cancellationReason) reservation.cancellationReason = data.cancellationReason;
    if (data.notes !== undefined) reservation.notes = data.notes;

    await reservation.save();

    const updatedReservation = await Reservation.findById(reservationId)
      .populate('user', 'name email phone avatar')
      .populate('business', 'name address phone email')
      .populate({
        path: 'specialist',
        select: 'specialty licenseNumber bio availability services',
        populate: [
          { path: 'user', select: 'name email phone avatar' },
          { path: 'services', select: 'name description duration price category' },
        ],
      })
      .populate('service', 'name description duration price category');

    // Send notifications based on status change
    if (updatedReservation && data.status && oldStatus !== data.status) {
      try {
        if (data.status === 'confirmed') {
          await notificationService.sendReservationConfirmed(updatedReservation);
        } else if (data.status === 'cancelled') {
          await notificationService.sendReservationCancelled(updatedReservation);
        }
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Don't fail the update if notification fails
      }
    }

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

  async getSpecialistReservations(userId: string, filter: ReservationFilterData) {
    // Find specialist by user ID
    const specialist = await Specialist.findOne({ user: userId, isActive: true });
    if (!specialist) {
      throw new Error('Specialist not found');
    }

    interface QueryFilter {
      specialist: string;
      status?: string;
      startDate?: {
        $gte?: Date;
        $lte?: Date;
      };
    }

    const query: QueryFilter = {
      specialist: specialist._id.toString(),
    };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      query.startDate = {};
      if (filter.startDate) query.startDate.$gte = filter.startDate;
      if (filter.endDate) query.startDate.$lte = filter.endDate;
    }

    const reservations = await Reservation.find(query)
      .populate('user', 'name email phone avatar')
      .populate('business', 'name address phone email')
      .populate({
        path: 'specialist',
        select: 'specialty licenseNumber bio availability services',
        populate: [
          { path: 'user', select: 'name email phone avatar' },
          { path: 'services', select: 'name description duration price category' },
        ],
      })
      .populate('service', 'name description duration price category')
      .sort({ startDate: 1 });

    return reservations;
  }
}

export const reservationService = new ReservationService();
