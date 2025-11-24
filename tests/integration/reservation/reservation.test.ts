import request from 'supertest';
import { Express } from 'express';
import mongoose from 'mongoose';
import { User } from '../../../src/models/User.js';
import { Business } from '../../../src/models/Business.js';
import { Specialist } from '../../../src/models/Specialist.js';
import { Service } from '../../../src/models/Service.js';
import { Reservation } from '../../../src/models/Reservation.js';
import { generateAccessToken } from '../../../src/utils/jwt.js';
import { hashPassword } from '../../../src/utils/password.js';
import { createTestApp } from '../../setup.js';

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

      // Restore specialist for next tests
      specialist.isActive = true;
      await specialist.save();
    });

    it('should fail when service does not belong to business', async () => {
      // Create service for different business
      const otherBusiness = await Business.create({
        user: specialistUser._id,
        name: 'Other Business',
        email: 'other@test.com',
        hasPremises: true,
        hasRemoteSessions: false,
      });

      const otherService = await Service.create({
        business: otherBusiness._id,
        name: 'Other Service',
        duration: 30,
        price: 50,
        isActive: true,
      });

      const reservationData = {
        business: business._id.toString(),
        specialist: specialist._id.toString(),
        service: otherService._id.toString(),
        startDate: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.message).toContain('does not belong to this business');
    });

    it('should fail when specialist does not belong to business', async () => {
      const otherBusiness = await Business.create({
        user: clientUser._id,
        name: 'Another Business',
        email: 'another@test.com',
        hasPremises: true,
        hasRemoteSessions: false,
      });

      const otherSpecialist = await Specialist.create({
        user: specialistUser._id,
        business: otherBusiness._id,
        specialty: 'Dental',
        isActive: true,
      });

      const reservationData = {
        business: business._id.toString(),
        specialist: otherSpecialist._id.toString(),
        service: service._id.toString(),
        startDate: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.message).toContain('does not belong to this business');
    });

    it('should fail when specialist cannot provide service', async () => {
      // Assign a different service to specialist
      const anotherService = await Service.create({
        business: business._id,
        name: 'Another Service',
        duration: 45,
        price: 75,
        isActive: true,
      });

      specialist.services = [anotherService._id];
      await specialist.save();

      const reservationData = {
        business: business._id.toString(),
        specialist: specialist._id.toString(),
        service: service._id.toString(), // This service is not in specialist.services
        startDate: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.message).toContain('cannot provide this service');

      // Reset specialist services
      specialist.services = [];
      await specialist.save();
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
