import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

// Configure Cloudinary
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

// Configure AWS S3
let s3Client: S3Client | null = null;
if (config.aws.accessKeyId && config.aws.secretAccessKey) {
  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });
}

export interface UploadResult {
  url: string;
  publicId?: string;
  key?: string;
  provider: 'local' | 's3' | 'cloudinary';
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  isPublic?: boolean;
}

/**
 * Storage service that supports multiple providers
 */
class StorageService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure upload directory exists for local storage
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload file to configured storage provider
   */
  async upload(file: Express.Multer.File, options: UploadOptions = {}): Promise<UploadResult> {
    const provider = config.storage.provider;

    switch (provider) {
      case 's3':
        return this.uploadToS3(file, options);
      case 'cloudinary':
        return this.uploadToCloudinary(file, options);
      case 'local':
      default:
        return this.uploadToLocal(file, options);
    }
  }

  /**
   * Upload file to AWS S3
   */
  private async uploadToS3(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<UploadResult> {
    if (!s3Client) {
      throw new Error('AWS S3 is not configured. Please set AWS credentials in environment.');
    }

    const folder = options.folder || 'uploads';
    const filename = options.filename || `${Date.now()}-${file.originalname}`;
    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: options.isPublic ? 'public-read' : 'private',
    });

    await s3Client.send(command);

    const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      provider: 's3',
    };
  }

  /**
   * Upload file to Cloudinary
   */
  private async uploadToCloudinary(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<UploadResult> {
    if (!config.cloudinary.cloudName) {
      throw new Error(
        'Cloudinary is not configured. Please set Cloudinary credentials in environment.'
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'c3m-centralia',
          public_id: options.filename?.replace(/\.[^/.]+$/, ''), // Remove extension
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              provider: 'cloudinary',
            });
          } else {
            reject(new Error('Upload failed without error'));
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload file to local storage
   */
  private async uploadToLocal(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<UploadResult> {
    const folder = options.folder || 'general';
    const folderPath = path.join(this.uploadDir, folder);

    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filename = options.filename || `${Date.now()}-${file.originalname}`;
    const filePath = path.join(folderPath, filename);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    const url = `/uploads/${folder}/${filename}`;

    return {
      url,
      key: `${folder}/${filename}`,
      provider: 'local',
    };
  }

  /**
   * Delete file from storage
   */
  async delete(fileUrl: string, provider?: 'local' | 's3' | 'cloudinary'): Promise<void> {
    const storageProvider = provider || config.storage.provider;

    switch (storageProvider) {
      case 's3':
        await this.deleteFromS3(fileUrl);
        break;
      case 'cloudinary':
        await this.deleteFromCloudinary(fileUrl);
        break;
      case 'local':
      default:
        await this.deleteFromLocal(fileUrl);
    }
  }

  /**
   * Delete file from AWS S3
   */
  private async deleteFromS3(fileUrl: string): Promise<void> {
    if (!s3Client) {
      throw new Error('AWS S3 is not configured');
    }

    // Extract key from URL
    const key = fileUrl.split('.amazonaws.com/')[1];
    if (!key) {
      throw new Error('Invalid S3 URL');
    }

    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    });

    await s3Client.send(command);
  }

  /**
   * Delete file from Cloudinary
   */
  private async deleteFromCloudinary(fileUrl: string): Promise<void> {
    if (!config.cloudinary.cloudName) {
      throw new Error('Cloudinary is not configured');
    }

    // Extract public_id from URL
    const urlParts = fileUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split('.')[0];

    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Delete file from local storage
   */
  private async deleteFromLocal(fileUrl: string): Promise<void> {
    const filePath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Validate file type
   */
  validateFileType(mimetype: string): boolean {
    return config.storage.allowedTypes.includes(mimetype);
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number): boolean {
    return size <= config.storage.maxFileSize;
  }
}

export const storageService = new StorageService();
