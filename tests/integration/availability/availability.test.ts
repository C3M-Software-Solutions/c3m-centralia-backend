import request from 'supertest';
import mongoose from 'mongoose';

import app from '../../../src/server.js';
import { User } from '../../../src/models/User.js';
import { Business } from '../../../src/models/Business.js';
import { Specialist } from '../../../src/models/Specialist.js';
import { Service } from '../../../src/models/Service.js';
import { Reservation } from '../../../src/models/Reservation.js';

describe('Availability API', () => {
  let businessOwnerId: string;
  let clientId: string;
  let businessId: string;
  let specialistId: string;
  let serviceId: string;

  beforeEach(async () => {
    // Create admin user
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin-availability@test.com',
      password: 'Password123!',
      phone: '1234567890',
      role: 'admin',
    });
    businessOwnerId = adminUser._id.toString();

    // Create client user
    const clientUser = await User.create({
      name: 'Client',
      email: 'client-availability@test.com',
      password: 'Password123!',
      phone: '9876543210',
      role: 'client',
    });
    clientId = clientUser._id.toString();

    // Create business
    const business = await Business.create({
      user: businessOwnerId,
      name: 'Availability Test Clinic',
      description: 'Test clinic for availability',
      email: 'clinic-availability@test.com',
      phone: '1122334455',
      address: 'Test Street 123',
      isActive: true,
    });
    businessId = business._id.toString();

    // Create service (60 minutes)
    const service = await Service.create({
      business: businessId,
      name: 'Consultation',
      description: '1-hour consultation',
      duration: 60,
      price: 100,
      isActive: true,
    });
    serviceId = service._id.toString();

    // Create specialist with monday availability 09:00-17:00
    const specialist = await Specialist.create({
      user: adminUser._id,
      business: businessId,
      specialty: 'General Practitioner',
      availability: [
        {
          day: 'monday',
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
        },
      ],
      services: [serviceId],
      isActive: true,
    });
    specialistId = specialist._id.toString();
  });

  describe('GET /api/specialists/:specialistId/available-slots', () => {
    it('should return all available slots when no reservations exist', async () => {
      // Monday, November 24, 2025
      const date = '2025-11-24';

      const response = await request(app)
        .get(`/api/specialists/${specialistId}/available-slots`)
        .query({ date, serviceId });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.date).toBe(date);
      expect(response.body.data.specialistId).toBe(specialistId);
      expect(response.body.data.serviceId).toBe(serviceId);
      expect(response.body.data.availableSlots).toBeInstanceOf(Array);
      expect(response.body.data.totalSlots).toBeGreaterThan(0);

      // Should have 8 slots (09:00-10:00, 10:00-11:00, ..., 16:00-17:00)
      expect(response.body.data.totalSlots).toBe(8);

      // Verify first slot
      const firstSlot = response.body.data.availableSlots[0];
      expect(firstSlot).toHaveProperty('startTime');
      expect(firstSlot).toHaveProperty('endTime');
    });

    it('should exclude occupied slots', async () => {
      const date = '2025-11-24';

      // Create a reservation for 10:00-11:00
      const startDate = new Date('2025-11-24T10:00:00.000Z');
      const endDate = new Date('2025-11-24T11:00:00.000Z');

      await Reservation.create({
        user: clientId,
        business: businessId,
        specialist: specialistId,
        service: serviceId,
        startDate,
        endDate,
        status: 'confirmed',
      });

      const response = await request(app)
        .get(`/api/specialists/${specialistId}/available-slots`)
        .query({ date, serviceId });

      expect(response.status).toBe(200);
      expect(response.body.data.totalSlots).toBe(7); // One less slot

      // Verify the 10:00-11:00 slot is not in the list
      const slots = response.body.data.availableSlots;
      const hasOccupiedSlot = slots.some((slot: { startTime: string; endTime: string }) => {
        const slotStart = new Date(slot.startTime);
        return slotStart.getUTCHours() === 10;
      });
      expect(hasOccupiedSlot).toBe(false);
    });

    it('should return empty array when specialist not available on requested day', async () => {
      // Tuesday - specialist only has monday availability
      const date = '2025-11-25';

      const response = await request(app)
        .get(`/api/specialists/${specialistId}/available-slots`)
        .query({ date, serviceId });

      expect(response.status).toBe(200);
      expect(response.body.data.totalSlots).toBe(0);
      expect(response.body.data.availableSlots).toEqual([]);
    });

    it('should use default duration when no serviceId provided', async () => {
      const date = '2025-11-24';

      const response = await request(app)
        .get(`/api/specialists/${specialistId}/available-slots`)
        .query({ date });

      expect(response.status).toBe(200);
      expect(response.body.data.serviceId).toBeNull();
      expect(response.body.data.totalSlots).toBeGreaterThan(0);
    });

    it('should return 400 when date parameter is missing', async () => {
      const response = await request(app).get(`/api/specialists/${specialistId}/available-slots`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Date query parameter is required');
    });

    it('should return 400 when date format is invalid', async () => {
      const response = await request(app)
        .get(`/api/specialists/${specialistId}/available-slots`)
        .query({ date: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid date format');
    });

    it('should return 400 when specialist does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const date = '2025-11-24';

      const response = await request(app)
        .get(`/api/specialists/${fakeId}/available-slots`)
        .query({ date });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should handle multiple reservations correctly', async () => {
      // Clean existing reservations
      await Reservation.deleteMany({ specialist: specialistId });

      const date = '2025-11-24';

      // Create 3 reservations
      await Reservation.create({
        user: clientId,
        business: businessId,
        specialist: specialistId,
        service: serviceId,
        startDate: new Date('2025-11-24T09:00:00.000Z'),
        endDate: new Date('2025-11-24T10:00:00.000Z'),
        status: 'confirmed',
      });

      await Reservation.create({
        user: clientId,
        business: businessId,
        specialist: specialistId,
        service: serviceId,
        startDate: new Date('2025-11-24T11:00:00.000Z'),
        endDate: new Date('2025-11-24T12:00:00.000Z'),
        status: 'confirmed',
      });

      await Reservation.create({
        user: clientId,
        business: businessId,
        specialist: specialistId,
        service: serviceId,
        startDate: new Date('2025-11-24T15:00:00.000Z'),
        endDate: new Date('2025-11-24T16:00:00.000Z'),
        status: 'confirmed',
      });

      const response = await request(app)
        .get(`/api/specialists/${specialistId}/available-slots`)
        .query({ date, serviceId });

      expect(response.status).toBe(200);
      expect(response.body.data.totalSlots).toBe(5); // 8 - 3 occupied
    });

    it('should only consider confirmed and pending reservations', async () => {
      // Clean existing reservations
      await Reservation.deleteMany({ specialist: specialistId });

      const date = '2025-11-24';

      // Create cancelled reservation - should not block slot
      await Reservation.create({
        user: clientId,
        business: businessId,
        specialist: specialistId,
        service: serviceId,
        startDate: new Date('2025-11-24T14:00:00.000Z'),
        endDate: new Date('2025-11-24T15:00:00.000Z'),
        status: 'cancelled',
      });

      // Create completed reservation - should not block slot
      await Reservation.create({
        user: clientId,
        business: businessId,
        specialist: specialistId,
        service: serviceId,
        startDate: new Date('2025-11-24T13:00:00.000Z'),
        endDate: new Date('2025-11-24T14:00:00.000Z'),
        status: 'completed',
      });

      const response = await request(app)
        .get(`/api/specialists/${specialistId}/available-slots`)
        .query({ date, serviceId });

      expect(response.status).toBe(200);
      expect(response.body.data.totalSlots).toBe(8); // All slots available
    });
  });
});
