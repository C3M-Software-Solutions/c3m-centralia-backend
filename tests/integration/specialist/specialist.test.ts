import request from 'supertest';
import express, { Express } from 'express';
import { Business } from '../../../src/models/Business.js';
import { Specialist } from '../../../src/models/Specialist.js';
import { User } from '../../../src/models/User.js';
import specialistRoutes from '../../../src/routes/specialistRoutes.js';
import { errorHandler } from '../../../src/middleware/errorHandler.js';
import { hashPassword } from '../../../src/utils/password.js';
import { generateAccessToken } from '../../../src/utils/jwt.js';

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
