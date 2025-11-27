import request from 'supertest';
import express, { Express } from 'express';

import { Business } from '../../../src/models/Business.js';
import { Service } from '../../../src/models/Service.js';
import { User } from '../../../src/models/User.js';
import serviceRoutes from '../../../src/routes/serviceRoutes.js';
import { errorHandler } from '../../../src/middleware/errorHandler.js';
import { hashPassword } from '../../../src/utils/password.js';
import { generateAccessToken } from '../../../src/utils/jwt.js';

// Create test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/businesses/:businessId/services', serviceRoutes);
  app.use(errorHandler);
  return app;
};

describe('Service Controller Tests', () => {
  let app: Express;
  let ownerToken: string;
  let ownerUser: any;
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

  describe('POST /api/businesses/:businessId/services', () => {
    it('should create a new service successfully', async () => {
      const serviceData = {
        name: 'Massage Therapy',
        description: 'Relaxing full body massage',
        duration: 60,
        price: 75,
        category: 'Wellness',
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/services`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(serviceData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service).toBeDefined();
      expect(response.body.data.service.name).toBe(serviceData.name);
      expect(response.body.data.service.duration).toBe(serviceData.duration);
      expect(response.body.data.service.price).toBe(serviceData.price);
      expect(response.body.data.service.isActive).toBe(true);
    });

    it('should create service with only required fields', async () => {
      const serviceData = {
        name: 'Basic Service',
        duration: 30,
        price: 50,
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/services`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(serviceData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service.name).toBe(serviceData.name);
    });

    it('should fail without authentication', async () => {
      const serviceData = {
        name: 'Service',
        duration: 30,
        price: 50,
      };

      await request(app)
        .post(`/api/businesses/${testBusiness._id}/services`)
        .send(serviceData)
        .expect(401);
    });

    it('should fail when user does not own business', async () => {
      const serviceData = {
        name: 'Service',
        duration: 30,
        price: 50,
      };

      const response = await request(app)
        .post(`/api/businesses/${testBusiness._id}/services`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(serviceData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not authorized');
    });

    it('should fail with invalid duration', async () => {
      const serviceData = {
        name: 'Service',
        duration: 2, // Too short
        price: 50,
      };

      await request(app)
        .post(`/api/businesses/${testBusiness._id}/services`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(serviceData)
        .expect(400);
    });

    it('should fail with negative price', async () => {
      const serviceData = {
        name: 'Service',
        duration: 30,
        price: -10,
      };

      await request(app)
        .post(`/api/businesses/${testBusiness._id}/services`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(serviceData)
        .expect(400);
    });
  });

  describe('GET /api/businesses/:businessId/services', () => {
    beforeEach(async () => {
      // Create test services
      await Service.create([
        {
          business: testBusiness._id,
          name: 'Service 1',
          duration: 30,
          price: 50,
          isActive: true,
        },
        {
          business: testBusiness._id,
          name: 'Service 2',
          duration: 60,
          price: 100,
          isActive: true,
        },
        {
          business: testBusiness._id,
          name: 'Inactive Service',
          duration: 45,
          price: 75,
          isActive: false,
        },
      ]);
    });

    it('should get all active services for a business', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/services`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.services).toHaveLength(2); // Only active services
    });

    it('should return empty array when no services exist', async () => {
      await Service.deleteMany({ business: testBusiness._id });

      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/services`)
        .expect(200);

      expect(response.body.data.services).toHaveLength(0);
    });
  });

  describe('GET /api/businesses/:businessId/services/:serviceId', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await Service.create({
        business: testBusiness._id,
        name: 'Test Service',
        duration: 45,
        price: 80,
      });
    });

    it('should get service by id', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/services/${testService._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service).toBeDefined();
      expect(response.body.data.service.name).toBe('Test Service');
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}/services/${fakeId}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/businesses/:businessId/services/:serviceId', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await Service.create({
        business: testBusiness._id,
        name: 'Original Service',
        duration: 30,
        price: 50,
      });
    });

    it('should update service successfully', async () => {
      const updateData = {
        name: 'Updated Service',
        duration: 60,
        price: 100,
      };

      const response = await request(app)
        .put(`/api/businesses/${testBusiness._id}/services/${testService._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service.name).toBe(updateData.name);
      expect(response.body.data.service.duration).toBe(updateData.duration);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .put(`/api/businesses/${testBusiness._id}/services/${testService._id}`)
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('should fail when user does not own business', async () => {
      const response = await request(app)
        .put(`/api/businesses/${testBusiness._id}/services/${testService._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Updated' })
        .expect(403);

      expect(response.body.status).toBe('error');
    });
  });

  describe('DELETE /api/businesses/:businessId/services/:serviceId', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await Service.create({
        business: testBusiness._id,
        name: 'Service to Delete',
        duration: 30,
        price: 50,
      });
    });

    it('should delete service successfully', async () => {
      const response = await request(app)
        .delete(`/api/businesses/${testBusiness._id}/services/${testService._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deleted');

      // Verify service is deleted
      const deletedService = await Service.findById(testService._id);
      expect(deletedService).toBeNull();
    });

    it('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/businesses/${testBusiness._id}/services/${testService._id}`)
        .expect(401);
    });

    it('should fail when user does not own business', async () => {
      const response = await request(app)
        .delete(`/api/businesses/${testBusiness._id}/services/${testService._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should return error for non-existent service', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .delete(`/api/businesses/${testBusiness._id}/services/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });
  });
});
