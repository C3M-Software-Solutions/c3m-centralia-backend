import request from 'supertest';
import express, { Express } from 'express';
import { User } from '../../../src/models/User';
import { generateAccessToken } from '../../../src/utils/jwt';
import uploadRoutes from '../../../src/routes/uploadRoutes';
import { errorHandler } from '../../../src/middleware/errorHandler';
import path from 'path';
import fs from 'fs';

// Create test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/upload', uploadRoutes);
  app.use(errorHandler);
  return app;
};

describe('Upload API', () => {
  let app: Express;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = createTestApp();

    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'upload-test@example.com',
      password: 'password123',
      role: 'specialist',
    });

    userId = user._id.toString();
    authToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  });

  afterAll(async () => {
    await User.findByIdAndDelete(userId);

    // Clean up test uploads
    const uploadsDir = path.join(process.cwd(), 'uploads', 'test');
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
  });

  //   describe('GET /api/upload/info', () => {
  //     it('should return storage configuration info', async () => {
  //       const response = await request(app).get('/api/upload/info');

  //       expect(response.status).toBe(200);
  //       expect(response.body.status).toBe('success');
  //       expect(response.body.data).toHaveProperty('provider');
  //       expect(response.body.data).toHaveProperty('maxFileSize');
  //       expect(response.body.data).toHaveProperty('allowedTypes');
  //       expect(Array.isArray(response.body.data.allowedTypes)).toBe(true);
  //     });
  //   });

  //   describe('POST /api/upload', () => {
  //     it('should upload a single image file', async () => {
  //       // Create a test image buffer
  //       const testImage = Buffer.from(
  //         'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  //         'base64'
  //       );

  //       const response = await request(app)
  //         .post('/api/upload')
  //         .set('Authorization', `Bearer ${authToken}`)
  //         .field('folder', 'test')
  //         .attach('file', testImage, 'test-image.png');

  //       expect(response.status).toBe(201);
  //       expect(response.body.status).toBe('success');
  //       expect(response.body.data.file).toHaveProperty('url');
  //       expect(response.body.data.file).toHaveProperty('provider');
  //       expect(response.body.data.file.provider).toBe('local');
  //     });

  //     it('should fail without authentication', async () => {
  //       const response = await request(app).post('/api/upload').field('folder', 'test');

  //       expect(response.status).toBe(401);
  //     });

  //     it('should fail with invalid file type', async () => {
  //       const testFile = Buffer.from('test content');

  //       const response = await request(app)
  //         .post('/api/upload')
  //         .set('Authorization', `Bearer ${authToken}`)
  //         .attach('file', testFile, 'test.txt');

  //       expect(response.status).toBe(400);
  //     });

  //     it('should fail without file', async () => {
  //       const response = await request(app)
  //         .post('/api/upload')
  //         .set('Authorization', `Bearer ${authToken}`);

  //       expect(response.status).toBe(400);
  //     });
  //   });

  describe('POST /api/upload/multiple', () => {
    it('should upload multiple files', async () => {
      const testImage1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      const testImage2 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post('/api/upload/multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .field('folder', 'test')
        .attach('files', testImage1, 'test1.png')
        .attach('files', testImage2, 'test2.png');

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.files)).toBe(true);
      expect(response.body.data.files.length).toBe(2);
      expect(response.body.data.files[0]).toHaveProperty('url');
      expect(response.body.data.files[1]).toHaveProperty('url');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).post('/api/upload/multiple').field('folder', 'test');

      expect(response.status).toBe(401);
    });
  });

  //   describe('DELETE /api/upload', () => {
  //     let uploadedFileUrl: string;

  //     beforeEach(async () => {
  //       // Upload a file to delete
  //       const testImage = Buffer.from(
  //         'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  //         'base64'
  //       );

  //       const uploadResponse = await request(app)
  //         .post('/api/upload')
  //         .set('Authorization', `Bearer ${authToken}`)
  //         .field('folder', 'test')
  //         .attach('file', testImage, 'to-delete.png');

  //       uploadedFileUrl = uploadResponse.body.data.file.url;
  //     });

  //     it('should delete a file as specialist', async () => {
  //       const response = await request(app)
  //         .delete('/api/upload')
  //         .set('Authorization', `Bearer ${authToken}`)
  //         .send({
  //           fileUrl: uploadedFileUrl,
  //         });

  //       expect(response.status).toBe(200);
  //       expect(response.body.status).toBe('success');
  //       expect(response.body.message).toBe('File deleted successfully');
  //     });

  //     it('should fail without authentication', async () => {
  //       const response = await request(app).delete('/api/upload').send({
  //         fileUrl: uploadedFileUrl,
  //       });

  //       expect(response.status).toBe(401);
  //     });

  //     it('should fail without fileUrl', async () => {
  //       const response = await request(app)
  //         .delete('/api/upload')
  //         .set('Authorization', `Bearer ${authToken}`)
  //         .send({});

  //       expect(response.status).toBe(400);
  //     });

  //     it('should fail as client (unauthorized role)', async () => {
  //       // Create client user
  //       const clientUser = await User.create({
  //         name: 'Client User',
  //         email: 'client-upload@example.com',
  //         password: 'password123',
  //         role: 'client',
  //       });

  //       const clientToken = generateAccessToken({
  //         userId: clientUser._id.toString(),
  //         email: clientUser.email,
  //         role: clientUser.role,
  //       });

  //       const response = await request(app)
  //         .delete('/api/upload')
  //         .set('Authorization', `Bearer ${clientToken}`)
  //         .send({
  //           fileUrl: uploadedFileUrl,
  //         });

  //       expect(response.status).toBe(403);

  //       await User.findByIdAndDelete(clientUser._id);
  //     });
  //   });
});
