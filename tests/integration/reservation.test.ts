import request from 'supertest';
import { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/User.js';
import { Business } from '../../src/models/Business.js';
import { Specialist } from '../../src/models/Specialist.js';
import { Service } from '../../src/models/Service.js';
import { Reservation } from '../../src/models/Reservation.js';
import { generateAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';
import { createTestApp } from '../setup.js';

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

describe('Reservation Integration Tests', () => {
  let app: Express;
  let clientToken: string;
  let clientUser: any;
  let specialistUser: any;
  let business: any;
  let specialist: any;
  let service: any;

  beforeEach(async () => {
    app = createTestApp();

    clientUser = await User.create({
      name: 'Client User',
      email: 'client@test.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    clientToken = generateAccessToken({
      userId: clientUser._id,
      email: clientUser.email,
      role: clientUser.role,
    });

    specialistUser = await User.create({
      name: 'Specialist User',
      email: 'specialist@test.com',
      password: await hashPassword('password123'),
      role: 'specialist',
    });

    business = await Business.create({
      name: 'Test Business',
      user: clientUser._id,
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

  describe('POST /api/reservations', () => {
    it('should create a reservation successfully', async () => {
      const reservationData = {
        business: business._id.toString(),
        specialist: specialist._id.toString(),
        service: service._id.toString(),
        startDate: new Date().toISOString(),
        notes: 'Test reservation',
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reservationData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.reservation).toBeDefined();
      expect(response.body.data.reservation.notes).toBe('Test reservation');
    });

    it('should fail without authentication', async () => {
      const reservationData = {
        business: business._id.toString(),
        specialist: specialist._id.toString(),
        service: service._id.toString(),
        startDate: new Date().toISOString(),
      };

      await request(app).post('/api/reservations').send(reservationData).expect(401);
    });

    it('should fail for inactive specialist', async () => {
      specialist.isActive = false;
      await specialist.save();

      const reservationData = {
        business: business._id.toString(),
        specialist: specialist._id.toString(),
        service: service._id.toString(),
        startDate: new Date().toISOString(),
      };

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reservationData)
        .expect(404);
    });
  });

  describe('GET /api/reservations', () => {
    it('should get user reservations', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.reservations).toHaveLength(1);
    });

    it('should fail without authentication', async () => {
      await request(app).get('/api/reservations').expect(401);
    });
  });

  describe('GET /api/reservations/:id', () => {
    it('should get reservation by id', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      const response = await request(app)
        .get(`/api/reservations/${reservation._id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.reservation).toBeDefined();
    });

    it('should return 404 for non-existent reservation', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/reservations/${fakeId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .get('/api/reservations/invalid-id')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/reservations/:id/status', () => {
    it('should update reservation status', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      const response = await request(app)
        .put(`/api/reservations/${reservation._id}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'cancelled', cancellationReason: 'Personal reasons' })
        .expect(200);

      expect(response.body.data.reservation.status).toBe('cancelled');
    });

    it('should fail to update other user reservation', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: await hashPassword('password123'),
        role: 'client',
      });

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      const reservation = await Reservation.create({
        user: otherUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
      });

      await request(app)
        .put(`/api/reservations/${reservation._id}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'cancelled' })
        .expect(403);
    });
  });

  describe('GET /api/reservations/availability', () => {
    it('should check availability', async () => {
      const date = new Date();

      const response = await request(app)
        .get('/api/reservations/availability')
        .query({
          specialist: specialist._id.toString(),
          service: service._id.toString(),
          date: date.toISOString(),
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.serviceDuration).toBe(60);
      expect(response.body.data.bookedSlots).toBeDefined();
    });

    it('should fail without required parameters', async () => {
      await request(app).get('/api/reservations/availability').expect(400);
    });
  });
});
