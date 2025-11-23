import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Reservation } from '../../src/models/Reservation.js';
import { User } from '../../src/models/User.js';
import { Business } from '../../src/models/Business.js';
import { Specialist } from '../../src/models/Specialist.js';
import { Service } from '../../src/models/Service.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
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

describe('Reservation Model Tests', () => {
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
    });

    service = await Service.create({
      business: business._id,
      name: 'Test Service',
      duration: 60,
      price: 100,
    });
  });

  describe('Creation', () => {
    it('should create a reservation successfully', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      expect(reservation).toBeDefined();
      expect(reservation.user.toString()).toBe(user._id.toString());
      expect(reservation.status).toBe('pending');
    });

    it('should fail to create reservation without required fields', async () => {
      await expect(
        Reservation.create({
          user: user._id,
        })
      ).rejects.toThrow();
    });
  });

  describe('Field Validation', () => {
    it('should validate status enum', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      await expect(
        Reservation.create({
          user: user._id,
          business: business._id,
          specialist: specialist._id,
          service: service._id,
          startDate,
          endDate,
          status: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('should allow valid status values', async () => {
      const statuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];

      for (const status of statuses) {
        const reservation = await Reservation.create({
          user: user._id,
          business: business._id,
          specialist: specialist._id,
          service: service._id,
          startDate,
          endDate: new Date(startDate.getTime() + 60 * 60000),
          status,
        });
        expect(reservation.status).toBe(status);
      }
    });

    it('should validate notes max length', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);
      const longNotes = 'a'.repeat(501);

      await expect(
        Reservation.create({
          user: user._id,
          business: business._id,
          specialist: specialist._id,
          service: service._id,
          startDate,
          endDate,
          notes: longNotes,
        })
      ).rejects.toThrow();
    });
  });

  describe('Population', () => {
    it('should populate user, business, specialist, and service references', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      const populated = await Reservation.findById(reservation._id)
        .populate('user')
        .populate('business')
        .populate('specialist')
        .populate('service');

      expect(populated?.user).toBeDefined();
      expect((populated?.user as any).name).toBe('Test User');
      expect((populated?.business as any).name).toBe('Test Business');
      expect(populated?.service).toBeDefined();
    });
  });

  describe('Queries', () => {
    it('should find reservations by user', async () => {
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

      const reservations = await Reservation.find({ user: user._id });
      expect(reservations).toHaveLength(1);
    });

    it('should find reservations by specialist', async () => {
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

      const reservations = await Reservation.find({ specialist: specialist._id });
      expect(reservations).toHaveLength(1);
    });

    it('should find reservations by status', async () => {
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

      const reservations = await Reservation.find({ status: 'confirmed' });
      expect(reservations).toHaveLength(1);
    });
  });

  describe('Updates', () => {
    it('should update reservation status', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      reservation.status = 'confirmed';
      await reservation.save();

      const updated = await Reservation.findById(reservation._id);
      expect(updated?.status).toBe('confirmed');
    });

    it('should add cancellation reason', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      reservation.status = 'cancelled';
      reservation.cancellationReason = 'Personal reasons';
      await reservation.save();

      const updated = await Reservation.findById(reservation._id);
      expect(updated?.cancellationReason).toBe('Personal reasons');
    });
  });

  describe('Deletion', () => {
    it('should delete a reservation', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: user._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      await Reservation.deleteOne({ _id: reservation._id });

      const deleted = await Reservation.findById(reservation._id);
      expect(deleted).toBeNull();
    });
  });
});
