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

    it('should include complete specialist, service, and business data', async () => {
      // Update specialist with more data
      specialist.bio = 'Experienced specialist';
      specialist.licenseNumber = 'LIC-12345';
      specialist.availability = [
        { day: 'monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      ];
      specialist.services = [service._id];
      await specialist.save();

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

      const res = response.body.data.reservation;

      // Validate client user data
      expect(res.user).toBeDefined();
      expect(res.user.name).toBe('Client User');
      expect(res.user.email).toBe('client@test.com');

      // Validate business data
      expect(res.business).toBeDefined();
      expect(res.business.name).toBe('Test Business');

      // Validate specialist data with nested user
      expect(res.specialist).toBeDefined();
      expect(res.specialist.specialty).toBe('General');
      expect(res.specialist.bio).toBe('Experienced specialist');
      expect(res.specialist.licenseNumber).toBe('LIC-12345');
      expect(res.specialist.availability).toBeDefined();
      expect(res.specialist.availability).toHaveLength(1);
      expect(res.specialist.availability[0].day).toBe('monday');

      // Validate specialist's user data
      expect(res.specialist.user).toBeDefined();
      expect(res.specialist.user.name).toBe('Specialist User');
      expect(res.specialist.user.email).toBe('specialist@test.com');

      // Validate specialist's services
      expect(res.specialist.services).toBeDefined();
      expect(res.specialist.services).toHaveLength(1);
      expect(res.specialist.services[0].name).toBe('Test Service');
      expect(res.specialist.services[0].duration).toBe(60);
      expect(res.specialist.services[0].price).toBe(100);

      // Validate service data
      expect(res.service).toBeDefined();
      expect(res.service.name).toBe('Test Service');
      expect(res.service.duration).toBe(60);
      expect(res.service.price).toBe(100);
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

  describe('GET /api/reservations - Advanced Filters', () => {
    let specialist2: any;

    beforeEach(async () => {
      // Create second specialist
      const specialistUser2 = await User.create({
        name: 'Specialist 2',
        email: 'specialist2@test.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      specialist2 = await Specialist.create({
        user: specialistUser2._id,
        business: business._id,
        specialty: 'Cardiology',
        isActive: true,
      });

      // Create reservations on different dates and with different statuses
      const today = new Date('2025-11-24T10:00:00Z');
      const tomorrow = new Date('2025-11-25T14:00:00Z');
      const nextWeek = new Date('2025-12-01T09:00:00Z');

      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate: today,
        endDate: new Date(today.getTime() + 60 * 60000),
        status: 'pending',
      });

      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist2._id,
        service: service._id,
        startDate: tomorrow,
        endDate: new Date(tomorrow.getTime() + 60 * 60000),
        status: 'confirmed',
      });

      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate: nextWeek,
        endDate: new Date(nextWeek.getTime() + 60 * 60000),
        status: 'completed',
      });
    });

    it('should filter reservations by status', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({ status: 'pending' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.reservations[0].status).toBe('pending');
    });

    it('should filter reservations by specialist', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({ specialist: specialist2._id.toString() })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.reservations[0].specialist._id.toString()).toBe(
        specialist2._id.toString()
      );
    });

    it('should filter reservations by specific date', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({ date: '2025-11-24' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBeGreaterThanOrEqual(1);
      if (response.body.results > 0) {
        const reservationDate = new Date(response.body.data.reservations[0].startDate);
        expect(reservationDate.getUTCDate()).toBe(24);
        expect(reservationDate.getUTCMonth()).toBe(10); // November (0-indexed)
      }
    });

    it('should filter reservations by date range', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({
          dateFrom: '2025-11-24',
          dateTo: '2025-11-26',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({
          specialist: specialist._id.toString(),
          status: 'pending',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.reservations[0].status).toBe('pending');
      expect(response.body.data.reservations[0].specialist._id.toString()).toBe(
        specialist._id.toString()
      );
    });

    it('should return all reservations when no filters applied', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(3);
    });
  });

  describe('GET /api/reservations - Owner business filter', () => {
    let ownerUser: any;
    let ownerToken: string;
    let ownerBusiness: any;
    let otherBusiness: any;

    beforeEach(async () => {
      // Create owner user
      ownerUser = await User.create({
        name: 'Owner User',
        email: 'owner@test.com',
        password: await hashPassword('password123'),
        role: 'owner',
      });

      ownerToken = generateAccessToken({
        userId: ownerUser._id,
        email: ownerUser.email,
        role: ownerUser.role,
      });

      // Create owner's business
      ownerBusiness = await Business.create({
        name: 'Owner Business',
        user: ownerUser._id,
      });

      // Create another business
      otherBusiness = await Business.create({
        name: 'Other Business',
        user: clientUser._id,
      });

      // Create specialists for both businesses
      const ownerSpecialistUser = await User.create({
        name: 'Owner Specialist',
        email: 'owner.specialist@test.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      const ownerSpecialist = await Specialist.create({
        user: ownerSpecialistUser._id,
        business: ownerBusiness._id,
        specialty: 'Owner Specialty',
        isActive: true,
      });

      const otherSpecialistUser = await User.create({
        name: 'Other Specialist',
        email: 'other.specialist@test.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      const otherSpecialist = await Specialist.create({
        user: otherSpecialistUser._id,
        business: otherBusiness._id,
        specialty: 'Other Specialty',
        isActive: true,
      });

      // Create services for both businesses
      const ownerService = await Service.create({
        business: ownerBusiness._id,
        name: 'Owner Service',
        duration: 60,
        price: 100,
        isActive: true,
      });

      const otherService = await Service.create({
        business: otherBusiness._id,
        name: 'Other Service',
        duration: 60,
        price: 100,
        isActive: true,
      });

      // Create reservations for both businesses
      await Reservation.create({
        user: clientUser._id,
        business: ownerBusiness._id,
        specialist: ownerSpecialist._id,
        service: ownerService._id,
        startDate: new Date('2025-11-24T10:00:00Z'),
        endDate: new Date('2025-11-24T11:00:00Z'),
        status: 'pending',
      });

      await Reservation.create({
        user: clientUser._id,
        business: ownerBusiness._id,
        specialist: ownerSpecialist._id,
        service: ownerService._id,
        startDate: new Date('2025-11-25T14:00:00Z'),
        endDate: new Date('2025-11-25T15:00:00Z'),
        status: 'confirmed',
      });

      await Reservation.create({
        user: clientUser._id,
        business: otherBusiness._id,
        specialist: otherSpecialist._id,
        service: otherService._id,
        startDate: new Date('2025-11-26T09:00:00Z'),
        endDate: new Date('2025-11-26T10:00:00Z'),
        status: 'confirmed',
      });
    });

    it('should allow owner to filter reservations by their business', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ business: ownerBusiness._id.toString() })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);

      // Verify all reservations belong to owner's business
      response.body.data.reservations.forEach((reservation: any) => {
        expect(reservation.business._id.toString()).toBe(ownerBusiness._id.toString());
      });
    });

    it('should not show reservations from other businesses when filtering', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ business: ownerBusiness._id.toString() })
        .expect(200);

      expect(response.body.status).toBe('success');

      // Verify no reservations from other business
      const hasOtherBusinessReservation = response.body.data.reservations.some(
        (reservation: any) => reservation.business._id.toString() === otherBusiness._id.toString()
      );
      expect(hasOtherBusinessReservation).toBe(false);
    });

    it('should combine business filter with other filters', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({
          business: ownerBusiness._id.toString(),
          status: 'confirmed',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.reservations[0].status).toBe('confirmed');
      expect(response.body.data.reservations[0].business._id.toString()).toBe(
        ownerBusiness._id.toString()
      );
    });
  });

  describe('GET /api/reservations/specialist/my-reservations', () => {
    let specialistToken: string;
    let anotherSpecialist: typeof specialist;
    let anotherSpecialistUser: typeof specialistUser;

    beforeEach(async () => {
      specialistToken = generateAccessToken({
        userId: specialistUser._id,
        email: specialistUser.email,
        role: specialistUser.role,
      });

      // Create reservations for the specialist
      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate: new Date('2025-11-24T09:00:00Z'),
        endDate: new Date('2025-11-24T10:00:00Z'),
        status: 'confirmed',
      });

      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate: new Date('2025-11-25T14:00:00Z'),
        endDate: new Date('2025-11-25T15:00:00Z'),
        status: 'pending',
      });

      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate: new Date('2025-11-26T11:00:00Z'),
        endDate: new Date('2025-11-26T12:00:00Z'),
        status: 'cancelled',
      });

      // Create another specialist with reservations
      anotherSpecialistUser = await User.create({
        name: 'Another Specialist',
        email: 'specialist2@test.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      anotherSpecialist = await Specialist.create({
        user: anotherSpecialistUser._id,
        business: business._id,
        specialty: 'Cardiology',
        isActive: true,
      });

      await Reservation.create({
        user: clientUser._id,
        business: business._id,
        specialist: anotherSpecialist._id,
        service: service._id,
        startDate: new Date('2025-11-24T10:00:00Z'),
        endDate: new Date('2025-11-24T11:00:00Z'),
        status: 'confirmed',
      });
    });

    it('should return all reservations for authenticated specialist', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.reservations).toHaveLength(3);

      // Verify all reservations belong to the specialist
      response.body.data.reservations.forEach(
        (reservation: { specialist: { _id?: string } | string }) => {
          const specialistId =
            typeof reservation.specialist === 'string'
              ? reservation.specialist
              : reservation.specialist._id;
          expect(specialistId).toBe(specialist._id.toString());
        }
      );
    });

    it('should filter reservations by status', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .query({ status: 'confirmed' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.reservations[0].status).toBe('confirmed');
    });

    it('should filter reservations by specific date', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .query({ date: '2025-11-24' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total).toBe(1);

      const reservationDate = new Date(response.body.data.reservations[0].startDate);
      expect(reservationDate.getUTCDate()).toBe(24);
    });

    it('should filter reservations by date range', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .query({ dateFrom: '2025-11-24', dateTo: '2025-11-25' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total).toBe(2);
    });

    it('should combine status and date filters', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .query({ status: 'pending', dateFrom: '2025-11-25' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.reservations[0].status).toBe('pending');
    });

    it('should fail without authentication', async () => {
      await request(app).get('/api/reservations/specialist/my-reservations').expect(401);
    });

    it('should fail if user is not a specialist', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(404);

      expect(response.body.message).toContain('not registered as a specialist');
    });

    it('should include complete reservation details', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .expect(200);

      const reservation = response.body.data.reservations[0];

      // Verify populated fields
      expect(reservation.user).toBeDefined();
      expect(reservation.user.name).toBeDefined();
      expect(reservation.user.email).toBeDefined();

      expect(reservation.business).toBeDefined();
      expect(reservation.business.name).toBeDefined();

      expect(reservation.service).toBeDefined();
      expect(reservation.service.name).toBeDefined();
      expect(reservation.service.duration).toBeDefined();

      expect(reservation.startDate).toBeDefined();
      expect(reservation.endDate).toBeDefined();
      expect(reservation.status).toBeDefined();
    });

    it('should not show other specialist reservations', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .expect(200);

      // Should only show 3 reservations (not the one from anotherSpecialist)
      expect(response.body.data.total).toBe(3);

      const hasOtherSpecialistReservation = response.body.data.reservations.some(
        (reservation: { specialist: { _id?: string } | string }) => {
          const specialistId =
            typeof reservation.specialist === 'string'
              ? reservation.specialist
              : reservation.specialist._id;
          return specialistId === anotherSpecialist._id.toString();
        }
      );
      expect(hasOtherSpecialistReservation).toBe(false);
    });

    it('should return reservations sorted by startDate ascending', async () => {
      const response = await request(app)
        .get('/api/reservations/specialist/my-reservations')
        .set('Authorization', `Bearer ${specialistToken}`)
        .expect(200);

      const reservations = response.body.data.reservations;
      expect(reservations).toHaveLength(3);

      // Verify ascending order
      for (let i = 0; i < reservations.length - 1; i++) {
        const currentDate = new Date(reservations[i].startDate);
        const nextDate = new Date(reservations[i + 1].startDate);
        expect(currentDate.getTime()).toBeLessThanOrEqual(nextDate.getTime());
      }
    });
  });
});
