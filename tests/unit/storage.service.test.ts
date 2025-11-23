import { storageService } from '../../src/utils/storage.js';
import fs from 'fs';
import path from 'path';

describe('StorageService', () => {
  const testFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake image data'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  afterAll(() => {
    // Clean up test uploads
    const uploadsDir = path.join(process.cwd(), 'uploads', 'test-storage');
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
  });

  describe('File Validation', () => {
    it('should validate allowed file types', () => {
      expect(storageService.validateFileType('image/jpeg')).toBe(true);
      expect(storageService.validateFileType('image/png')).toBe(true);
      expect(storageService.validateFileType('image/jpg')).toBe(true);
      expect(storageService.validateFileType('application/pdf')).toBe(true);
    });

    it('should reject disallowed file types', () => {
      expect(storageService.validateFileType('text/plain')).toBe(false);
      expect(storageService.validateFileType('application/zip')).toBe(false);
      expect(storageService.validateFileType('video/mp4')).toBe(false);
    });

    it('should validate file size within limits', () => {
      expect(storageService.validateFileSize(1024)).toBe(true);
      expect(storageService.validateFileSize(1024 * 1024)).toBe(true);
      expect(storageService.validateFileSize(5 * 1024 * 1024)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      expect(storageService.validateFileSize(10 * 1024 * 1024)).toBe(false);
      expect(storageService.validateFileSize(100 * 1024 * 1024)).toBe(false);
    });
  });

  describe('Local Storage', () => {
    it('should upload file to local storage', async () => {
      const result = await storageService.upload(testFile, {
        folder: 'test-storage',
      });

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('provider', 'local');
      expect(result).toHaveProperty('key');
      expect(result.url).toContain('/uploads/test-storage/');
      expect(result.key).toContain('test-storage/');
    });

    it('should upload file with custom filename', async () => {
      const result = await storageService.upload(testFile, {
        folder: 'test-storage',
        filename: 'custom-name.jpg',
      });

      expect(result.url).toContain('custom-name.jpg');
      expect(result.key).toContain('custom-name.jpg');
    });

    it('should create folder if it does not exist', async () => {
      const result = await storageService.upload(testFile, {
        folder: 'test-storage/nested/deep',
      });

      const folderPath = path.join(process.cwd(), 'uploads', 'test-storage', 'nested', 'deep');
      expect(fs.existsSync(folderPath)).toBe(true);
      expect(result.provider).toBe('local');
    });

    it('should delete file from local storage', async () => {
      // Upload first
      const uploadResult = await storageService.upload(testFile, {
        folder: 'test-storage',
        filename: 'to-delete.jpg',
      });

      const filePath = path.join(process.cwd(), uploadResult.url.replace(/^\//, ''));
      expect(fs.existsSync(filePath)).toBe(true);

      // Delete
      await storageService.delete(uploadResult.url, 'local');

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should not throw error when deleting non-existent file', async () => {
      await expect(
        storageService.delete('/uploads/test-storage/non-existent.jpg', 'local')
      ).resolves.not.toThrow();
    });
  });

  describe('Provider Configuration', () => {
    it('should use local provider by default', async () => {
      const result = await storageService.upload(testFile);
      expect(result.provider).toBe('local');
    });
  });

  describe('File Upload Options', () => {
    it('should handle missing folder option', async () => {
      const result = await storageService.upload(testFile);
      expect(result.url).toContain('/uploads/general/');
    });

    it('should handle missing filename option', async () => {
      const result = await storageService.upload(testFile, {
        folder: 'test-storage',
      });
      expect(result.key).toMatch(/test-storage\/\d+-test-image\.jpg/);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for S3 when not configured', async () => {
      // Save original values
      const originalProvider = process.env.STORAGE_PROVIDER;
      const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

      // Set S3 provider but remove credentials
      process.env.STORAGE_PROVIDER = 's3';
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      // Reset modules to reload config with new env vars
      jest.resetModules();
      const storageModule = await import('../../src/utils/storage');
      const s3StorageService = storageModule.storageService;

      await expect(s3StorageService.upload(testFile)).rejects.toThrow('AWS S3 is not configured');

      // Restore original values
      process.env.STORAGE_PROVIDER = originalProvider;
      if (originalAccessKey) process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
      if (originalSecretKey) process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;

      // Reset modules again to reload original config
      jest.resetModules();
    });

    it('should throw error for Cloudinary when not configured', async () => {
      // Save original values
      const originalProvider = process.env.STORAGE_PROVIDER;
      const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const originalApiKey = process.env.CLOUDINARY_API_KEY;
      const originalApiSecret = process.env.CLOUDINARY_API_SECRET;

      // Set Cloudinary provider but remove credentials
      process.env.STORAGE_PROVIDER = 'cloudinary';
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;

      // Reset modules to reload config with new env vars
      jest.resetModules();
      const storageModule = await import('../../src/utils/storage');
      const cloudinaryStorageService = storageModule.storageService;

      await expect(cloudinaryStorageService.upload(testFile)).rejects.toThrow(
        'Cloudinary is not configured'
      );

      // Restore original values
      process.env.STORAGE_PROVIDER = originalProvider;
      if (originalCloudName) process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
      if (originalApiKey) process.env.CLOUDINARY_API_KEY = originalApiKey;
      if (originalApiSecret) process.env.CLOUDINARY_API_SECRET = originalApiSecret;

      // Reset modules again to reload original config
      jest.resetModules();
    });
  });
});
