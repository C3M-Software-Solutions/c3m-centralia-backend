import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReservationService } from '../../src/services/reservationService.js';
import { Reservation } from '../../src/models/Reservation.js';
import { User } from '../../src/models/User.js';
import { Business } from '../../src/models/Business.js';
import { Specialist } from '../../src/models/Specialist.js';
import { Service } from '../../src/models/Service.js';

let mongoServer: MongoMemoryServer;
let reservationService: ReservationService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  reservationService = new ReservationService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('ReservationService Tests', () => {
  let user: any;
  let business: any;
  let specialist: any;
  let service: any;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'hashedpassword',
      role: 'client',
    });

    const specialistUser = await User.create({
      name: 'Specialist User',
      email: 'specialist@test.com',
      password: 'hashedpassword',
      role: 'specialist',
    });

    business = await Business.create({
      name: 'Test Business',
      user: user._id,
    });

    specialist = await Specialist.create({
      user: specialistUser._id,
      business: business._id,
      specialty: 'General',
      isActive: true,
    });

    service = await Service.create({
      business: business._id,
      name: 'Test Service',
      duration: 60,
      price: 100,
      isActive: true,
    });
  });

  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      const startDate = new Date();

      const reservation = await reservationService.createReservation({
        userId: user._id.toString(),
        businessId: business._id.toString(),
        specialistId: specialist._id.toString(),
        serviceId: service._id.toString(),
        startDate,
        notes: 'Test notes',
      });

      expect(reservation).toBeDefined();
      expect(reservation?.notes).toBe('Test notes');
      expect(reservation?.status).toBe('pending');
    });

    it('should throw error for inactive specialist', async () => {
      specialist.isActive = false;
      await specialist.save();

      const startDate = new Date();

      await expect(
        reservationService.createReservation({
          userId: user._id.toString(),
          businessId: business._id.toString(),
          specialistId: specialist._id.toString(),
          serviceId: service._id.toString(),
          startDate,
        })
      ).rejects.toThrow('Specialist not found or inactive');
    });

    it('should throw error for inactive service', async () => {
      service.isActive = false;
      await service.save();

      const startDate = new Date();

      await expect(
        reservationService.createReservation({
          userId: user._id.toString(),
          businessId: business._id.toString(),
          specialistId: specialist._id.toString(),
          serviceId: service._id.toString(),
          startDate,
        })
      ).rejects.toThrow('Service not found or inactive');
    });

    it('should detect time slot conflicts', async () => {
      const startDate = new Date();

      // Create first reservation
      await reservationService.createReservation({
        userId: user._id.toString(),
        businessId: business._id.toString(),
        specialistId: specialist._id.toString(),
        serviceId: service._id.toString(),
        startDate,
      });

      // Try to create overlapping reservation
      const overlappingDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes later

      await expect(
        reservationService.createReservation({
          userId: user._id.toString(),
          businessId: business._id.toString(),
          specialistId: specialist._id.toString(),
          serviceId: service._id.toString(),
          startDate: overlappingDate,
        })
      ).rejects.toThrow('Time slot is already booked');
    });
  });

  describe('getReservationById', () => {
    it('should get reservation by id', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const created = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      const reservation = await reservationService.getReservationById(created._id.toString());

      expect(reservation).toBeDefined();
      expect(reservation._id.toString()).toBe(created._id.toString());
    });

    it('should throw error for invalid reservation ID', async () => {
      await expect(reservationService.getReservationById('invalid-id')).rejects.toThrow(
        'Invalid reservation ID'
      );
    });

    it('should throw error for non-existent reservation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(reservationService.getReservationById(fakeId)).rejects.toThrow(
        'Reservation not found'
      );
    });
  });

  describe('getReservations', () => {
    it('should get reservations by user', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      const reservations = await reservationService.getReservations({
        userId: user._id.toString(),
      });

      expect(reservations).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
        status: 'confirmed',
      });

      const reservations = await reservationService.getReservations({
        status: 'confirmed',
      });

      expect(reservations).toHaveLength(1);
    });
  });

  describe('updateReservationStatus', () => {
    it('should update reservation status', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const created = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      const updated = await reservationService.updateReservationStatus(
        created._id.toString(),
        user._id.toString(),
        'client',
        { status: 'cancelled', cancellationReason: 'Test reason' }
      );

      expect(updated?.status).toBe('cancelled');
      expect(updated?.cancellationReason).toBe('Test reason');
    });

    it('should throw error for unauthorized update', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: 'hashedpassword',
        role: 'client',
      });

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const created = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      await expect(
        reservationService.updateReservationStatus(
          created._id.toString(),
          otherUser._id.toString(),
          'client',
          { status: 'cancelled' }
        )
      ).rejects.toThrow();
    });
  });

  describe('checkAvailability', () => {
    it('should return service duration and booked slots', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
        status: 'confirmed',
      });

      const availability = await reservationService.checkAvailability(
        specialist._id.toString(),
        service._id.toString(),
        startDate
      );

      expect(availability.serviceDuration).toBe(60);
      expect(availability.bookedSlots).toHaveLength(1);
    });
  });
});
