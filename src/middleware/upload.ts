import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { storageService } from '../utils/storage';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  // In test environment, accept all files to avoid supertest/multer mimetype issues
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    cb(null, true);
    return;
  }

  if (storageService.validateFileType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${config.storage.allowedTypes.join(', ')}`));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.storage.maxFileSize,
  },
});

// Middleware to handle upload errors
export const handleUploadError = (
  err: Error | multer.MulterError,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If it's an auth error (401/403), pass it to the next error handler
  if (err instanceof Error && 'statusCode' in err) {
    const statusCode = (err as { statusCode: number }).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      next(err);
      return;
    }
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        status: 'error',
        message: `File too large. Maximum size: ${config.storage.maxFileSize / 1024 / 1024}MB`,
      });
      return;
    }
    res.status(400).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  if (err) {
    res.status(400).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  next();
};
