import request from 'supertest';
import express, { Express } from 'express';
import { User, IUser } from '../../../src/models/User.js';
import authRoutes from '../../../src/routes/authRoutes.js';
import { errorHandler } from '../../../src/middleware/errorHandler.js';
import { hashPassword } from '../../../src/utils/password.js';
import crypto from 'crypto';

// Create test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
};

describe('Password Management Tests', () => {
  let app: Express;
  let authToken: string;
  let testUser: IUser;

  beforeEach(async () => {
    app = createTestApp();

    // Clear database
    await User.deleteMany({});

    // Create test user
    const hashedPassword = await hashPassword('oldpassword123');
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'client',
      isActive: true,
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'oldpassword123',
      })
      .expect(200);

    authToken = loginResponse.body.data.accessToken;
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toBe('Password changed successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.status).toBe('success');
    });

    it('should fail with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('incorrect');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail with password less than 6 characters', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: '12345',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldpassword123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should accept valid email and return success message', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'test@example.com',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toContain('reset link');

      // Verify token was stored
      const updatedUser = await User.findById(testUser._id).select(
        '+resetPasswordToken +resetPasswordExpires'
      );
      expect(updatedUser?.resetPasswordToken).toBeDefined();
      expect(updatedUser?.resetPasswordExpires).toBeDefined();
      expect(updatedUser!.resetPasswordExpires!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toContain('reset link');
    });

    it('should fail without email', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should generate unique tokens for multiple requests', async () => {
      // First request
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(200);

      const user1 = await User.findById(testUser._id).select('+resetPasswordToken');
      const token1 = user1?.resetPasswordToken;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(200);

      const user2 = await User.findById(testUser._id).select('+resetPasswordToken');
      const token2 = user2?.resetPasswordToken;

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Generate a valid reset token
      resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      testUser.resetPasswordToken = hashedToken;
      testUser.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await testUser.save();
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'resetpassword123',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toBe('Password reset successfully');

      // Verify old password doesn't work
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'oldpassword123',
        })
        .expect(401);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'resetpassword123',
        })
        .expect(200);

      expect(loginResponse.body.status).toBe('success');

      // Verify token was cleared
      const updatedUser = await User.findById(testUser._id).select(
        '+resetPasswordToken +resetPasswordExpires'
      );
      expect(updatedUser?.resetPasswordToken).toBeUndefined();
      expect(updatedUser?.resetPasswordExpires).toBeUndefined();
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalidtoken123',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with expired token', async () => {
      // Set token as expired
      testUser.resetPasswordExpires = new Date(Date.now() - 1000); // 1 second ago
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with password less than 6 characters', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: '12345',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should not allow token reuse', async () => {
      // First reset
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123',
        })
        .expect(200);

      // Try to use same token again
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'anotherpassword123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid or expired');
    });
  });

  describe('Validate Reset Token', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Request password reset to get token
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUser.email })
        .expect(200);

      // Create a raw token for testing
      resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await User.findByIdAndUpdate(testUser._id, {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour
      });
    });

    it('should validate a valid reset token', async () => {
      const response = await request(app)
        .get('/api/auth/validate-reset-token')
        .query({ token: resetToken })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.name).toBe(testUser.name);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate-reset-token')
        .query({ token: 'invalid-token-12345' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with expired token', async () => {
      // Set token as expired
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      await User.findByIdAndUpdate(testUser._id, {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() - 1000), // Expired
      });

      const response = await request(app)
        .get('/api/auth/validate-reset-token')
        .query({ token: resetToken })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail without token parameter', async () => {
      const response = await request(app).get('/api/auth/validate-reset-token').expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Token is required');
    });

    it('should not expose sensitive user data', async () => {
      const response = await request(app)
        .get('/api/auth/validate-reset-token')
        .query({ token: resetToken })
        .expect(200);

      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.resetPasswordToken).toBeUndefined();
      expect(response.body.data.user.resetPasswordExpires).toBeUndefined();
      // Only name and email should be returned
      expect(Object.keys(response.body.data.user).sort()).toEqual(['email', 'name']);
    });
  });
});
