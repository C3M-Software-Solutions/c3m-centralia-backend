import { Specialist } from '../models/Specialist.js';
import { Service } from '../models/Service.js';
import { Reservation } from '../models/Reservation.js';
import { Types } from 'mongoose';

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
}

export class AvailabilityService {
  /**
   * Calculate available time slots for a specialist on a given date
   */
  async getAvailableSlots(
    specialistId: string,
    date: Date,
    serviceId?: string
  ): Promise<AvailableSlot[]> {
    if (!Types.ObjectId.isValid(specialistId)) {
      throw new Error('Invalid specialist ID');
    }

    // Get specialist with availability
    const specialist = await Specialist.findById(specialistId);
    if (!specialist || !specialist.isActive) {
      throw new Error('Specialist not found or inactive');
    }

    // Get service duration (default to 60 minutes if no service specified)
    let serviceDuration = 60;
    if (serviceId) {
      if (!Types.ObjectId.isValid(serviceId)) {
        throw new Error('Invalid service ID');
      }
      const service = await Service.findById(serviceId);
      if (!service) {
        throw new Error('Service not found');
      }
      serviceDuration = service.duration;
    }

    // Get day of week from date (use UTC to avoid timezone issues)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getUTCDay()];

    // Find availability for this day
    const dayAvailability = specialist.availability.find(
      (avail) => avail.day === dayOfWeek && avail.isAvailable
    );

    if (!dayAvailability) {
      return []; // Specialist not available on this day
    }

    // Parse start and end times
    const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);

    // Create date objects for start and end of availability (using UTC)
    const availabilityStart = new Date(date);
    availabilityStart.setUTCHours(startHour, startMinute, 0, 0);

    const availabilityEnd = new Date(date);
    availabilityEnd.setUTCHours(endHour, endMinute, 0, 0);

    // Get existing reservations for this day (use UTC)
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const reservations = await Reservation.find({
      specialist: specialistId,
      status: { $in: ['pending', 'confirmed'] },
      startDate: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ startDate: 1 });

    // Generate all possible slots
    const allSlots: AvailableSlot[] = [];
    let currentSlotStart = new Date(availabilityStart);

    while (currentSlotStart < availabilityEnd) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + serviceDuration * 60000);

      // Check if slot end exceeds availability end
      if (currentSlotEnd > availabilityEnd) {
        break;
      }

      allSlots.push({
        startTime: new Date(currentSlotStart),
        endTime: new Date(currentSlotEnd),
      });

      // Move to next slot (same duration as service)
      currentSlotStart = new Date(currentSlotEnd);
    }

    // Filter out slots that overlap with existing reservations
    const availableSlots = allSlots.filter((slot) => {
      return !reservations.some((reservation) => {
        const reservationStart = new Date(reservation.startDate);
        const reservationEnd = new Date(reservation.endDate);

        // Check if slot overlaps with reservation
        return (
          (slot.startTime >= reservationStart && slot.startTime < reservationEnd) ||
          (slot.endTime > reservationStart && slot.endTime <= reservationEnd) ||
          (slot.startTime <= reservationStart && slot.endTime >= reservationEnd)
        );
      });
    });

    // Filter out past slots only if the date is today
    const now = new Date();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const requestedDayStart = new Date(date);
    requestedDayStart.setUTCHours(0, 0, 0, 0);

    if (requestedDayStart.getTime() === todayStart.getTime()) {
      // Only filter past slots for today
      return availableSlots.filter((slot) => slot.startTime > now);
    }

    return availableSlots;
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(specialistId: string, startDate: Date, endDate: Date): Promise<boolean> {
    if (!Types.ObjectId.isValid(specialistId)) {
      throw new Error('Invalid specialist ID');
    }

    // Check for overlapping reservations
    const overlappingReservation = await Reservation.findOne({
      specialist: specialistId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startDate: { $lt: endDate, $gte: startDate } },
        { endDate: { $gt: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    });

    return !overlappingReservation;
  }
}

export const availabilityService = new AvailabilityService();
