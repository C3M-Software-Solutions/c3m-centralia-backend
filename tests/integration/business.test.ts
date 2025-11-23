import request from 'supertest';
import express, { Express } from 'express';
import { Business } from '../../src/models/Business';
import { User } from '../../src/models/User';
import businessRoutes from '../../src/routes/businessRoutes';
import { errorHandler } from '../../src/middleware/errorHandler';
import { hashPassword } from '../../src/utils/password';
import { generateAccessToken } from '../../src/utils/jwt';

// Create test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/businesses', businessRoutes);
  app.use(errorHandler);
  return app;
};

describe('Business Controller Tests', () => {
  let app: Express;
  let adminToken: string;
  let adminUser: any;
  let regularToken: string;
  let regularUser: any;

  beforeEach(async () => {
    app = createTestApp();

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: await hashPassword('password123'),
      role: 'admin',
    });

    adminToken = generateAccessToken({
      userId: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
    });

    // Create regular user
    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    regularToken = generateAccessToken({
      userId: regularUser._id,
      email: regularUser.email,
      role: regularUser.role,
    });
  });

  describe('POST /api/businesses', () => {
    it('should create a new business successfully', async () => {
      const businessData = {
        name: 'New Business',
        description: 'Test business description',
        address: '123 Test St',
        phone: '+1234567890',
        email: 'business@example.com',
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(businessData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.business.name).toBe(businessData.name);
      expect(response.body.data.business.description).toBe(businessData.description);
      expect(response.body.data.business.isActive).toBe(true);
    });

    it('should create business with only required fields', async () => {
      const businessData = {
        name: 'Minimal Business',
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(businessData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business.name).toBe(businessData.name);
    });

    it('should fail to create business without authentication', async () => {
      const businessData = {
        name: 'Test Business',
      };

      const response = await request(app)
        .post('/api/businesses')
        .send(businessData)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail to create business without name', async () => {
      const businessData = {
        description: 'No name business',
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(businessData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail to create business with invalid email', async () => {
      const businessData = {
        name: 'Test Business',
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(businessData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should allow regular users to create businesses', async () => {
      const businessData = {
        name: 'User Business',
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(businessData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business.name).toBe(businessData.name);
    });
  });

  describe('GET /api/businesses', () => {
    beforeEach(async () => {
      // Create test businesses
      await Business.create([
        {
          name: 'Business One',
          description: 'First business',
          user: adminUser._id,
          isActive: true,
        },
        {
          name: 'Business Two',
          description: 'Second business',
          user: adminUser._id,
          isActive: true,
        },
        {
          name: 'Business Three',
          description: 'Third business',
          user: regularUser._id,
          isActive: false,
        },
      ]);
    });

    it('should get all active businesses', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.businesses).toBeDefined();
      expect(response.body.results).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/businesses?page=1&limit=2')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should return businesses with owner information', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.businesses.length).toBeGreaterThan(0);
      // Owner should be populated
      expect(response.body.data.businesses[0].user).toBeDefined();
    });
  });

  describe('GET /api/businesses/:id', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create({
        name: 'Test Business',
        description: 'Test description',
        user: adminUser._id,
      });
    });

    it('should get business by id', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.business.name).toBe(testBusiness.name);
    });

    it('should populate owner information', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}`)
        .expect(200);

      expect(response.body.data.business.user).toBeDefined();
      expect(response.body.data.business.user.name).toBe(adminUser.name);
    });

    it('should return 404 for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/businesses/${fakeId}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for invalid business id', async () => {
      const response = await request(app)
        .get('/api/businesses/invalid-id')
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/businesses/:id', () => {
    let ownedBusiness: any;
    let otherBusiness: any;

    beforeEach(async () => {
      ownedBusiness = await Business.create({
        name: 'Owned Business',
        user: regularUser._id,
      });

      otherBusiness = await Business.create({
        name: 'Other Business',
        user: adminUser._id,
      });
    });

    it('should update own business successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        phone: '+9876543210',
      };

      const response = await request(app)
        .put(`/api/businesses/${ownedBusiness._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business.name).toBe(updateData.name);
      expect(response.body.data.business.description).toBe(updateData.description);
      expect(response.body.data.business.phone).toBe(updateData.phone);
    });

    it('should allow admin to update any business', async () => {
      const updateData = {
        name: 'Admin Updated',
      };

      const response = await request(app)
        .put(`/api/businesses/${otherBusiness._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business.name).toBe(updateData.name);
    });

    it('should fail to update business without authentication', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/businesses/${ownedBusiness._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail to update other user business', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      const response = await request(app)
        .put(`/api/businesses/${otherBusiness._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should return 404 for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/businesses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should update only specified fields', async () => {
      const originalName = ownedBusiness.name;
      const updateData = {
        description: 'New description only',
      };

      const response = await request(app)
        .put(`/api/businesses/${ownedBusiness._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.business.name).toBe(originalName);
      expect(response.body.data.business.description).toBe(updateData.description);
    });
  });

  describe('DELETE /api/businesses/:id', () => {
    let ownedBusiness: any;
    let otherBusiness: any;

    beforeEach(async () => {
      ownedBusiness = await Business.create({
        name: 'Owned Business',
        user: regularUser._id,
      });

      otherBusiness = await Business.create({
        name: 'Other Business',
        user: adminUser._id,
      });
    });

    it('should delete own business successfully', async () => {
      await request(app)
        .delete(`/api/businesses/${ownedBusiness._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(204);

      const deletedBusiness = await Business.findById(ownedBusiness._id);
      expect(deletedBusiness).toBeNull();
    });

    it('should allow admin to delete any business', async () => {
      await request(app)
        .delete(`/api/businesses/${otherBusiness._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const deletedBusiness = await Business.findById(otherBusiness._id);
      expect(deletedBusiness).toBeNull();
    });

    it('should fail to delete business without authentication', async () => {
      const response = await request(app)
        .delete(`/api/businesses/${ownedBusiness._id}`)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail to delete other user business', async () => {
      const response = await request(app)
        .delete(`/api/businesses/${otherBusiness._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');

      // Verify business still exists
      const business = await Business.findById(otherBusiness._id);
      expect(business).toBeDefined();
    });

    it('should return 404 for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/businesses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });
});
