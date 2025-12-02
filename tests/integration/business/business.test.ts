import request from 'supertest';
import express, { Express } from 'express';

import { Business } from '../../../src/models/Business.js';
import { Service } from '../../../src/models/Service.js';
import { Specialist } from '../../../src/models/Specialist.js';
import { User } from '../../../src/models/User.js';
import businessRoutes from '../../../src/routes/businessRoutes.js';
import { errorHandler } from '../../../src/middleware/errorHandler.js';
import { hashPassword } from '../../../src/utils/password.js';
import { generateAccessToken } from '../../../src/utils/jwt.js';

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
  let ownerToken: string;
  let ownerUser: any;
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

    // Create owner user
    ownerUser = await User.create({
      name: 'Owner User',
      email: 'owner@example.com',
      password: await hashPassword('password123'),
      role: 'owner',
    });

    ownerToken = generateAccessToken({
      userId: ownerUser._id,
      email: ownerUser.email,
      role: ownerUser.role,
    });

    // Create regular user (client)
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
        ownerId: ownerUser._id.toString(),
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
        ownerId: ownerUser._id.toString(),
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

      const response = await request(app).post('/api/businesses').send(businessData).expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail to create business without name', async () => {
      const businessData = {
        ownerId: ownerUser._id.toString(),
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
        ownerId: ownerUser._id.toString(),
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

    it('should not allow non-admin users to create businesses', async () => {
      const businessData = {
        ownerId: ownerUser._id.toString(),
        name: 'User Business',
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(businessData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('permission');
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
      const response = await request(app).get('/api/businesses').expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.businesses).toBeDefined();
      expect(response.body.results).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const response = await request(app).get('/api/businesses?page=1&limit=2').expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should return businesses with owner information', async () => {
      const response = await request(app).get('/api/businesses').expect(200);

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
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.business.name).toBe(testBusiness.name);
    });

    it('should populate owner information', async () => {
      const response = await request(app)
        .get(`/api/businesses/${testBusiness._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.business.user).toBeDefined();
      expect(response.body.data.business.user.name).toBe(adminUser.name);
    });

    it('should return 404 for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/businesses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for invalid business id', async () => {
      const response = await request(app)
        .get('/api/businesses/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
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
        user: ownerUser._id,
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
        .set('Authorization', `Bearer ${ownerToken}`)
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
        .set('Authorization', `Bearer ${ownerToken}`)
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
        user: ownerUser._id,
      });

      otherBusiness = await Business.create({
        name: 'Other Business',
        user: adminUser._id,
      });
    });

    it('should only allow admin to delete businesses', async () => {
      // Owner cannot delete (only admin can)
      const response = await request(app)
        .delete(`/api/businesses/${ownedBusiness._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');

      // Business still exists
      const business = await Business.findById(ownedBusiness._id);
      expect(business).toBeDefined();
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

    it('should fail for non-admin users to delete businesses', async () => {
      // Regular client trying to delete
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

  describe('GET /api/businesses - Public Endpoints', () => {
    beforeEach(async () => {
      // Create multiple businesses
      await Business.create([
        {
          name: 'Dental Clinic Lima',
          description: 'Professional dental services',
          address: 'Av. Principal 123, Lima',
          user: adminUser._id,
          isActive: true,
        },
        {
          name: 'Cardiology Center',
          description: 'Heart health specialists',
          address: 'Calle Salud 456, Miraflores, Lima',
          user: regularUser._id,
          isActive: true,
        },
        {
          name: 'Inactive Business',
          description: 'Should not appear',
          user: adminUser._id,
          isActive: false,
        },
      ]);
    });

    it('should get all active businesses without authentication', async () => {
      const response = await request(app).get('/api/businesses').expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.businesses).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter businesses by search term', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .query({ search: 'dental' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.businesses[0].name).toContain('Dental');
    });

    it('should filter businesses by city', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .query({ city: 'Miraflores' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.businesses[0].address).toContain('Miraflores');
    });

    it('should combine search and city filters', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .query({ search: 'cardio', city: 'Lima' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(1);
      expect(response.body.data.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/businesses/public/:id - Public Detail', () => {
    let business: any;
    let service1: any;

    beforeEach(async () => {
      business = await Business.create({
        name: 'Complete Clinic',
        description: 'Full service clinic',
        address: 'Test Address',
        user: adminUser._id,
        isActive: true,
      });

      service1 = await Service.create({
        business: business._id,
        name: 'Consultation',
        duration: 60,
        price: 100,
        isActive: true,
      });

      await Service.create({
        business: business._id,
        name: 'Treatment',
        duration: 90,
        price: 200,
        isActive: true,
      });

      const specialistUser = await User.create({
        name: 'Dr. Smith',
        email: 'specialist@test.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      await Specialist.create({
        user: specialistUser._id,
        business: business._id,
        specialty: 'General Medicine',
        services: [service1._id],
        isActive: true,
      });
    });

    it('should get business details with services and specialists without auth', async () => {
      const response = await request(app).get(`/api/businesses/public/${business._id}`).expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business).toBeDefined();
      expect(response.body.data.business.name).toBe('Complete Clinic');
      expect(response.body.data.business.services).toHaveLength(2);
      expect(response.body.data.business.specialists).toHaveLength(1);
    });

    it('should return 404 for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app).get(`/api/businesses/public/${fakeId}`).expect(404);
    });

    it('should not return inactive business', async () => {
      const inactiveBusiness = await Business.create({
        name: 'Inactive',
        user: adminUser._id,
        isActive: false,
      });

      await request(app).get(`/api/businesses/public/${inactiveBusiness._id}`).expect(404);
    });
  });

  describe('Business Theme Configuration', () => {
    let business: any;

    beforeEach(async () => {
      business = await Business.create({
        name: 'Themed Business',
        user: ownerUser._id,
        isActive: true,
      });
    });

    it('should create business with theme', async () => {
      const businessData = {
        ownerId: ownerUser._id.toString(),
        name: 'Themed Clinic',
        description: 'Clinic with custom theme',
        theme: {
          primary: '#FF5733',
          secondary: '#33FF57',
          background: '#FFFFFF',
          accent: '#5733FF',
        },
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(businessData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business.theme).toBeDefined();
      expect(response.body.data.business.theme.primary).toBe('#FF5733');
      expect(response.body.data.business.theme.secondary).toBe('#33FF57');
      expect(response.body.data.business.theme.background).toBe('#FFFFFF');
      expect(response.body.data.business.theme.accent).toBe('#5733FF');
    });

    it('should update business theme by owner', async () => {
      const updateData = {
        theme: {
          primary: '#00FF00',
          secondary: '#0000FF',
          background: '#F0F0F0',
          accent: '#FF00FF',
        },
      };

      const response = await request(app)
        .put(`/api/businesses/${business._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business.theme).toBeDefined();
      expect(response.body.data.business.theme.primary).toBe('#00FF00');
      expect(response.body.data.business.theme.secondary).toBe('#0000FF');
      expect(response.body.data.business.theme.background).toBe('#F0F0F0');
      expect(response.body.data.business.theme.accent).toBe('#FF00FF');
    });

    it('should reject invalid hex color format', async () => {
      const businessData = {
        ownerId: ownerUser._id.toString(),
        name: 'Invalid Theme Business',
        theme: {
          primary: 'red', // Invalid - not hex format
          secondary: '#33FF57',
          background: '#FFFFFF',
          accent: '#5733FF',
        },
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(businessData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should reject hex colors without # prefix', async () => {
      const businessData = {
        ownerId: ownerUser._id.toString(),
        name: 'Invalid Theme Business',
        theme: {
          primary: 'FF5733', // Missing #
          secondary: '#33FF57',
          background: '#FFFFFF',
          accent: '#5733FF',
        },
      };

      const response = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(businessData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should get business with theme in public endpoint', async () => {
      const themedBusiness = await Business.create({
        name: 'Public Themed Business',
        user: ownerUser._id,
        isActive: true,
        theme: {
          primary: '#AA5511',
          secondary: '#11AA55',
          background: '#EEEEEE',
          accent: '#5511AA',
        },
      });

      const response = await request(app)
        .get(`/api/businesses/public/${themedBusiness._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.business.theme).toBeDefined();
      expect(response.body.data.business.theme.primary).toBe('#AA5511');
      expect(response.body.data.business.theme.secondary).toBe('#11AA55');
    });
  });

  describe('GET /api/businesses/my-businesses', () => {
    beforeEach(async () => {
      // Create multiple businesses for owner
      await Business.create({
        name: 'First Business',
        user: ownerUser._id,
        isActive: true,
        theme: {
          primary: '#FF0000',
          secondary: '#00FF00',
          background: '#FFFFFF',
          accent: '#0000FF',
        },
      });

      await Business.create({
        name: 'Second Business',
        user: ownerUser._id,
        isActive: true,
      });

      // Create business for another owner
      const anotherOwner = await User.create({
        name: 'Another Owner',
        email: 'another@example.com',
        password: await hashPassword('password123'),
        role: 'owner',
      });

      await Business.create({
        name: 'Another Owner Business',
        user: anotherOwner._id,
        isActive: true,
      });
    });

    it('should return all businesses for authenticated owner', async () => {
      const response = await request(app)
        .get('/api/businesses/my-businesses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.businesses).toHaveLength(2);
      expect(response.body.data.businesses[0].name).toBe('First Business');
      expect(response.body.data.businesses[1].name).toBe('Second Business');
    });

    it('should include theme in owner businesses', async () => {
      const response = await request(app)
        .get('/api/businesses/my-businesses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const firstBusiness = response.body.data.businesses.find(
        (b: any) => b.name === 'First Business'
      );
      expect(firstBusiness.theme).toBeDefined();
      expect(firstBusiness.theme.primary).toBe('#FF0000');
      expect(firstBusiness.theme.secondary).toBe('#00FF00');
    });

    it('should not return businesses from other owners', async () => {
      const response = await request(app)
        .get('/api/businesses/my-businesses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const businesses = response.body.data.businesses;
      const hasAnotherOwnerBusiness = businesses.some(
        (b: any) => b.name === 'Another Owner Business'
      );
      expect(hasAnotherOwnerBusiness).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/businesses/my-businesses').expect(401);
    });

    it('should require owner role', async () => {
      const response = await request(app)
        .get('/api/businesses/my-businesses')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.message).toContain('permission');
    });
  });
});
