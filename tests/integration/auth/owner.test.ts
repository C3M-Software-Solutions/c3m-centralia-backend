import request from 'supertest';
import express, { Express } from 'express';

import { User } from '../../../src/models/User.js';
import authRoutes from '../../../src/routes/authRoutes.js';
import { errorHandler } from '../../../src/middleware/errorHandler.js';
import { hashPassword } from '../../../src/utils/password.js';
import { generateAccessToken } from '../../../src/utils/jwt.js';

// Create test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
};

describe('Owner Management Tests (Admin only)', () => {
  let app: Express;
  let adminToken: string;
  let adminUser: any;
  let ownerToken: string;
  let ownerUser: any;
  let clientToken: string;
  let clientUser: any;

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
      phone: '+1234567890',
    });

    ownerToken = generateAccessToken({
      userId: ownerUser._id,
      email: ownerUser.email,
      role: ownerUser.role,
    });

    // Create client user
    clientUser = await User.create({
      name: 'Client User',
      email: 'client@example.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    clientToken = generateAccessToken({
      userId: clientUser._id,
      email: clientUser.email,
      role: clientUser.role,
    });
  });

  describe('POST /api/auth/create-owner', () => {
    it('should create a new owner successfully as admin', async () => {
      const ownerData = {
        name: 'New Owner',
        email: 'newowner@example.com',
        password: 'password123',
        phone: '+0987654321',
      };

      const response = await request(app)
        .post('/api/auth/create-owner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(ownerData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.owner).toBeDefined();
      expect(response.body.data.owner.email).toBe(ownerData.email);
      expect(response.body.data.owner.role).toBe('owner');
      expect(response.body.message).toBe('Owner created successfully');
    });

    it('should not allow non-admin to create owner', async () => {
      const ownerData = {
        name: 'New Owner',
        email: 'newowner2@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/create-owner')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(ownerData)
        .expect(403);
    });

    it('should not allow creating owner with duplicate email', async () => {
      const ownerData = {
        name: 'Duplicate Owner',
        email: 'owner@example.com', // Already exists
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/create-owner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(ownerData)
        .expect(409);

      expect(response.body.message).toContain('already registered');
    });
  });

  describe('GET /api/auth/owners', () => {
    beforeEach(async () => {
      // Create additional owners
      await User.create({
        name: 'Owner Two',
        email: 'owner2@example.com',
        password: await hashPassword('password123'),
        role: 'owner',
      });

      await User.create({
        name: 'Owner Three',
        email: 'owner3@example.com',
        password: await hashPassword('password123'),
        role: 'owner',
        isActive: false,
      });
    });

    it('should get all owners as admin', async () => {
      const response = await request(app)
        .get('/api/auth/owners')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toBeGreaterThanOrEqual(3);
      expect(response.body.data.owners).toBeDefined();
      expect(Array.isArray(response.body.data.owners)).toBe(true);

      // Verify all returned users are owners
      response.body.data.owners.forEach((owner: any) => {
        expect(owner.role).toBe('owner');
        expect(owner.password).toBeUndefined(); // Password should not be returned
      });
    });

    it('should not allow non-admin to list owners', async () => {
      await request(app)
        .get('/api/auth/owners')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('should not allow client to list owners', async () => {
      await request(app)
        .get('/api/auth/owners')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/auth/owners').expect(401);
    });
  });

  describe('GET /api/auth/owners/:id', () => {
    it('should get owner by ID as admin', async () => {
      const response = await request(app)
        .get(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.owner).toBeDefined();
      expect(response.body.data.owner._id.toString()).toBe(ownerUser._id.toString());
      expect(response.body.data.owner.email).toBe(ownerUser.email);
      expect(response.body.data.owner.role).toBe('owner');
      expect(response.body.data.owner.password).toBeUndefined();
    });

    it('should not allow non-admin to get owner details', async () => {
      await request(app)
        .get(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent owner', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .get(`/api/auth/owners/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when trying to get non-owner user', async () => {
      // Try to get a client user via owner endpoint
      await request(app)
        .get(`/api/auth/owners/${clientUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/auth/owners/:id', () => {
    it('should update owner successfully as admin', async () => {
      const updateData = {
        name: 'Updated Owner Name',
        phone: '+1111111111',
      };

      const response = await request(app)
        .put(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.owner.name).toBe(updateData.name);
      expect(response.body.data.owner.phone).toBe(updateData.phone);
      expect(response.body.message).toBe('Owner updated successfully');
    });

    it('should update owner email', async () => {
      const updateData = {
        email: 'newemail@example.com',
      };

      const response = await request(app)
        .put(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.owner.email).toBe(updateData.email);
    });

    it('should update owner isActive status', async () => {
      const updateData = {
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.owner.isActive).toBe(false);
    });

    it('should not allow non-admin to update owner', async () => {
      const updateData = {
        name: 'Hacked Name',
      };

      await request(app)
        .put(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent owner', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        name: 'Updated Name',
      };

      await request(app)
        .put(`/api/auth/owners/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should not allow updating to duplicate email', async () => {
      const anotherOwner = await User.create({
        name: 'Another Owner',
        email: 'another@example.com',
        password: await hashPassword('password123'),
        role: 'owner',
      });

      const updateData = {
        email: ownerUser.email, // Try to use existing email
      };

      await request(app)
        .put(`/api/auth/owners/${anotherOwner._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);
    });
  });

  describe('DELETE /api/auth/owners/:id', () => {
    it('should deactivate owner successfully as admin', async () => {
      const response = await request(app)
        .delete(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toBe('Owner deactivated successfully');
      expect(response.body.data.owner.isActive).toBe(false);

      // Verify in database
      const deactivatedOwner = await User.findById(ownerUser._id);
      expect(deactivatedOwner?.isActive).toBe(false);
    });

    it('should not allow non-admin to delete owner', async () => {
      await request(app)
        .delete(`/api/auth/owners/${ownerUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent owner', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .delete(`/api/auth/owners/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete(`/api/auth/owners/${ownerUser._id}`).expect(401);
    });
  });
});
