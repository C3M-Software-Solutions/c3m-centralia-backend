import request from 'supertest';
import express, { Express } from 'express';
import { Business } from '../../../src/models/Business';
import { Specialist } from '../../../src/models/Specialist';
import { User } from '../../../src/models/User';
import specialistRoutes from '../../../src/routes/specialistRoutes';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { hashPassword } from '../../../src/utils/password';
import { generateAccessToken } from '../../../src/utils/jwt';

// Create test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/businesses/:businessId/specialists', specialistRoutes);
  app.use(errorHandler);
  return app;
};

describe('Specialist Controller Tests', () => {
  let app: Express;
  let ownerToken: string;
  let ownerUser: any;
  let specialistUser: any;
  let otherUserToken: string;
  let otherUser: any;
  let testBusiness: any;

  beforeEach(async () => {
    app = createTestApp();

    // Create business owner
    ownerUser = await User.create({
      name: 'Business Owner',
      email: 'owner@example.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    ownerToken = generateAccessToken({
      userId: ownerUser._id,
      email: ownerUser.email,
      role: ownerUser.role,
    });

    // Create specialist user
    specialistUser = await User.create({
      name: 'Specialist User',
      email: 'specialist@example.com',
      password: await hashPassword('password123'),
      role: 'specialist',
    });

    // Create other user
    otherUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    otherUserToken = generateAccessToken({
      userId: otherUser._id,
      email: otherUser.email,
      role: otherUser.role,
    });

    // Create test business
    testBusiness = await Business.create({
      user: ownerUser._id,
      name: 'Test Business',
      ruc: '12345678901',
      description: 'A test business',
    });
  });

  describe('POST /api/businesses/:businessId/specialists', () => {
    it('should create a new specialist successfully', async () => {
      const specialistData = {
        userId: specialistUser._id.toString(),
        specialty: 'Physical Therapy',
        bio: 'Experienced therapist with 10 years of practice',
        schedule: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: true,
          },
          {
            day: 'wednesday',
            startTime: '10:00',
            endTime: '16:00',
            isAvailable: true,
          },
        ],
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(specialistData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.specialist).toBeDefined();
      expect(response.body.data.specialist.specialty).toBe(specialistData.specialty);
      expect(response.body.data.specialist.isActive).toBe(true);
    });

    it('should create specialist with only required fields', async () => {
      const specialistData = {
        userId: specialistUser._id.toString(),
        specialty: 'Massage Therapy',
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(specialistData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.specialist.specialty).toBe(specialistData.specialty);
    });

    it('should fail without authentication', async () => {
      const specialistData = {
        userId: specialistUser._id.toString(),
        specialty: 'Therapy',
      };

      await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .send(specialistData)
        .expect(401);
    });

    it('should fail when user does not own business', async () => {
      const specialistData = {
        userId: specialistUser._id.toString(),
        specialty: 'Therapy',
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(specialistData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not authorized');
    });

    it('should fail without required fields', async () => {
      const specialistData = {
        userId: specialistUser._id.toString(),
        // Missing specialty
      };

      await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(specialistData)
        .expect(400);
    });

    it('should fail with invalid schedule time format', async () => {
      const specialistData = {
        userId: specialistUser._id.toString(),
        specialty: 'Therapy',
        schedule: [
          {
            day: 'monday',
            startTime: '25:00', // Invalid time
            endTime: '17:00',
          },
        ],
      };

      await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(specialistData)
        .expect(400);
    });

    it('should create specialist with services', async () => {
      // Create services for the business
      const Service = (await import('../../../src/models/Service')).Service;
      const service1 = await Service.create({
        business: testBusiness._id,
        name: 'Consultation',
        duration: 30,
        price: 50,
        isActive: true,
      });
      const service2 = await Service.create({
        business: testBusiness._id,
        name: 'Follow-up',
        duration: 15,
        price: 25,
        isActive: true,
      });

      const specialistData = {
        userId: specialistUser._id.toString(),
        specialty: 'General Medicine',
        services: [service1._id.toString(), service2._id.toString()],
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(specialistData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.specialist.services).toHaveLength(2);
      expect(response.body.data.specialist.services[0]._id).toBe(service1._id.toString());
    });

    it('should fail to create specialist with services from different business', async () => {
      // Create another business
      const Business = (await import('../../../src/models/Business')).Business;
      const otherBusiness = await Business.create({
        user: otherUser._id,
        name: 'Other Business',
        email: 'other@test.com',
        hasPremises: true,
        hasRemoteSessions: false,
      });

      // Create service for other business
      const Service = (await import('../../../src/models/Service')).Service;
      const otherService = await Service.create({
        business: otherBusiness._id,
        name: 'Other Service',
        duration: 30,
        price: 50,
        isActive: true,
      });

      const specialistData = {
        userId: specialistUser._id.toString(),
        specialty: 'General Medicine',
        services: [otherService._id.toString()],
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/specialists`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(specialistData)
        .expect(400);

      expect(response.body.message).toContain('do not belong to this business');
    });
  });

  describe('GET /api/businesses/:businessId/specialists', () => {
    beforeEach(async () => {
      // Create test specialists
      const user1 = await User.create({
        name: 'Specialist 1',
        email: 'spec1@example.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      const user2 = await User.create({
        name: 'Specialist 2',
        email: 'spec2@example.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      await Specialist.create([
        {
          business: testBusiness._id,
          user: user1._id,
          specialty: 'Physical Therapy',
          isActive: true,
        },
        {
          business: testBusiness._id,
          user: user2._id,
          specialty: 'Massage Therapy',
          isActive: true,
        },
        {
          business: testBusiness._id,
          user: specialistUser._id,
          specialty: 'Chiropractic',
          isActive: false, // Inactive
        },
      ]);
    });

    it('should get all active specialists for a business', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.specialists).toBeDefined();
      expect(response.body.data.specialists).toHaveLength(2); // Only active specialists
    });

    it('should return empty array when no specialists exist', async () => {
      await Specialist.deleteMany({ business: testBusiness._id });

      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists`)
        .expect(200);

      expect(response.body.data.specialists).toHaveLength(0);
    });

    it('should populate user information', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists`)
        .expect(200);

      expect(response.body.data.specialists[0].user).toBeDefined();
      expect(response.body.data.specialists[0].user.name).toBeDefined();
      expect(response.body.data.specialists[0].user.email).toBeDefined();
    });

    it('should populate services information when available', async () => {
      // Create a service
      const Service = (await import('../../../src/models/Service')).Service;
      const service = await Service.create({
        business: testBusiness._id,
        name: 'Test Service',
        duration: 30,
        price: 50,
        isActive: true,
      });

      // Create specialist with service
      const specialistWithService = await Specialist.create({
        business: testBusiness._id,
        user: specialistUser._id,
        specialty: 'Test Specialty',
        services: [service._id],
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists`)
        .expect(200);

      const specialistData = response.body.data.specialists.find(
        (s: any) => s._id.toString() === specialistWithService._id.toString()
      );

      expect(specialistData.services).toBeDefined();
      expect(specialistData.services).toHaveLength(1);
      expect(specialistData.services[0].name).toBe('Test Service');
      expect(specialistData.services[0].duration).toBe(30);
      expect(specialistData.services[0].price).toBe(50);
    });

    it('should include availability array', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists`)
        .expect(200);

      expect(response.body.data.specialists[0].availability).toBeDefined();
      expect(Array.isArray(response.body.data.specialists[0].availability)).toBe(true);
    });
  });

  describe('GET /api/businesses/:businessId/specialists/:specialistId', () => {
    let testSpecialist: any;

    beforeEach(async () => {
      testSpecialist = await Specialist.create({
        business: testBusiness._id,
        user: specialistUser._id,
        specialty: 'Physical Therapy',
        bio: 'Test bio',
      });
    });

    it('should get specialist by id', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.specialist).toBeDefined();
      expect(response.body.data.specialist.specialty).toBe('Physical Therapy');
    });

    it('should populate user, business, and services in specialist details', async () => {
      // Create a service
      const Service = (await import('../../../src/models/Service')).Service;
      const service = await Service.create({
        business: testBusiness._id,
        name: 'Consultation',
        duration: 45,
        price: 75,
        description: 'General consultation',
        isActive: true,
      });

      // Update specialist with service
      testSpecialist.services = [service._id];
      await testSpecialist.save();

      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .expect(200);

      const specialist = response.body.data.specialist;

      // Verify user is populated
      expect(specialist.user).toBeDefined();
      expect(specialist.user.name).toBeDefined();
      expect(specialist.user.email).toBeDefined();

      // Verify business is populated
      expect(specialist.business).toBeDefined();
      expect(specialist.business.name).toBeDefined();

      // Verify services are populated
      expect(specialist.services).toBeDefined();
      expect(specialist.services).toHaveLength(1);
      expect(specialist.services[0].name).toBe('Consultation');
      expect(specialist.services[0].duration).toBe(45);
      expect(specialist.services[0].price).toBe(75);

      // Verify availability is included
      expect(specialist.availability).toBeDefined();
      expect(Array.isArray(specialist.availability)).toBe(true);
    });

    it('should return 404 for non-existent specialist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/specialists/${fakeId}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/businesses/:businessId/specialists/:specialistId', () => {
    let testSpecialist: any;

    beforeEach(async () => {
      testSpecialist = await Specialist.create({
        business: testBusiness._id,
        user: specialistUser._id,
        specialty: 'Original Specialty',
        bio: 'Original bio',
      });
    });

    it('should update specialist successfully', async () => {
      const updateData = {
        specialty: 'Updated Specialty',
        bio: 'Updated bio',
        schedule: [
          {
            day: 'tuesday',
            startTime: '08:00',
            endTime: '14:00',
            isAvailable: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.specialist.specialty).toBe(updateData.specialty);
      expect(response.body.data.specialist.bio).toBe(updateData.bio);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .put(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .send({ specialty: 'Updated' })
        .expect(401);
    });

    it('should fail when user does not own business', async () => {
      const response = await request(app)
        .put(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ specialty: 'Updated' })
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should update specialist services', async () => {
      // Create services for the business
      const Service = (await import('../../../src/models/Service')).Service;
      const service1 = await Service.create({
        business: testBusiness._id,
        name: 'Consultation',
        duration: 30,
        price: 50,
        isActive: true,
      });
      const service2 = await Service.create({
        business: testBusiness._id,
        name: 'Treatment',
        duration: 60,
        price: 100,
        isActive: true,
      });

      const updateData = {
        services: [service1._id.toString(), service2._id.toString()],
      };

      const response = await request(app)
        .put(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.specialist.services).toHaveLength(2);
      expect(response.body.data.specialist.services[0]._id).toBe(service1._id.toString());
      expect(response.body.data.specialist.services[1]._id).toBe(service2._id.toString());
    });

    it('should fail to update with services from different business', async () => {
      // Create another business
      const Business = (await import('../../../src/models/Business')).Business;
      const otherBusiness = await Business.create({
        user: otherUser._id,
        name: 'Other Business',
        email: 'other2@test.com',
        hasPremises: true,
        hasRemoteSessions: false,
      });

      // Create service for other business
      const Service = (await import('../../../src/models/Service')).Service;
      const otherService = await Service.create({
        business: otherBusiness._id,
        name: 'Other Service',
        duration: 30,
        price: 50,
        isActive: true,
      });

      const updateData = {
        services: [otherService._id.toString()],
      };

      const response = await request(app)
        .put(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.message).toContain('do not belong to this business');
    });
  });

  describe('DELETE /api/businesses/:businessId/specialists/:specialistId', () => {
    let testSpecialist: any;

    beforeEach(async () => {
      testSpecialist = await Specialist.create({
        business: testBusiness._id,
        user: specialistUser._id,
        specialty: 'Specialist to Delete',
      });
    });

    it('should delete specialist successfully', async () => {
      const response = await request(app)
        .delete(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deleted');

      // Verify specialist is deleted
      const deletedSpecialist = await Specialist.findById(testSpecialist._id);
      expect(deletedSpecialist).toBeNull();
    });

    it('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .expect(401);
    });

    it('should fail when user does not own business', async () => {
      const response = await request(app)
        .delete(`/api/businesses/${testBusiness._id}/specialists/${testSpecialist._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should return error for non-existent specialist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .delete(`/api/businesses/${testBusiness._id}/specialists/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });
  });
});
