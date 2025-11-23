import { Reservation } from '../models/Reservation.js';
import { Business } from '../models/Business.js';
import { Service } from '../models/Service.js';
import { Specialist } from '../models/Specialist.js';

export interface CreateReservationData {
  businessId: string;
  serviceId: string;
  specialistId: string;
  clientId: string;
  date: Date;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateReservationData {
  date?: Date;
  startTime?: string;
  endTime?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export class ReservationService {
  async createReservation(data: CreateReservationData) {
    // Verify business exists
    const business = await Business.findById(data.businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Verify service exists
    const service = await Service.findById(data.serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Verify specialist exists
    const specialist = await Specialist.findById(data.specialistId);
    if (!specialist) {
      throw new Error('Specialist not found');
    }

    // Check for time conflicts
    const conflict = await Reservation.findOne({
      specialist: data.specialistId,
      date: data.date,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          startTime: { $lt: data.endTime },
          endTime: { $gt: data.startTime },
        },
      ],
    });

    if (conflict) {
      throw new Error('Time slot already reserved');
    }

    const reservation = await Reservation.create({
      business: data.businessId,
      service: data.serviceId,
      specialist: data.specialistId,
      client: data.clientId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes,
    });

    return reservation;
  }

  async getReservationById(reservationId: string) {
    const reservation = await Reservation.findById(reservationId)
      .populate('business', 'name address phone')
      .populate('service', 'name duration price')
      .populate('specialist')
      .populate('client', 'name email phone');

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    return reservation;
  }

  async getReservationsByClient(clientId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const reservations = await Reservation.find({ client: clientId })
      .populate('business', 'name address phone')
      .populate('service', 'name duration price')
      .populate('specialist')
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments({ client: clientId });

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReservationsByBusiness(businessId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const reservations = await Reservation.find({ business: businessId })
      .populate('service', 'name duration price')
      .populate('specialist')
      .populate('client', 'name email phone')
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments({ business: businessId });

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReservationsBySpecialist(specialistId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const reservations = await Reservation.find({ specialist: specialistId })
      .populate('business', 'name address phone')
      .populate('service', 'name duration price')
      .populate('client', 'name email phone')
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments({ specialist: specialistId });

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateReservation(reservationId: string, userId: string, userRole: string, data: UpdateReservationData) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Check authorization
    const clientId = reservation.get('client');
    const isClient = clientId?.toString() === userId;
    const isAdmin = userRole === 'admin';
    
    if (!isClient && !isAdmin) {
      // Check if user is specialist of this reservation
      const specialistId = reservation.get('specialist');
      const specialist = await Specialist.findOne({
        _id: specialistId,
        user: userId,
      });
      
      if (!specialist) {
        throw new Error('Unauthorized to update this reservation');
      }
    }

    // Update fields
    Object.assign(reservation, data);
    await reservation.save();

    return reservation;
  }

  async cancelReservation(reservationId: string, userId: string, userRole: string) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Check authorization
    const clientId = reservation.get('client');
    const isClient = clientId?.toString() === userId;
    const isAdmin = userRole === 'admin';
    
    if (!isClient && !isAdmin) {
      throw new Error('Unauthorized to cancel this reservation');
    }

    // Check if reservation can be cancelled
    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      throw new Error('Cannot cancel a completed or already cancelled reservation');
    }

    reservation.status = 'cancelled';
    await reservation.save();

    return reservation;
  }

  async deleteReservation(reservationId: string, userRole: string) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Only admins can delete reservations
    if (userRole !== 'admin') {
      throw new Error('Unauthorized to delete reservations');
    }

    await Reservation.deleteOne({ _id: reservationId });
    return { message: 'Reservation deleted successfully' };
  }
}

export const reservationService = new ReservationService();
