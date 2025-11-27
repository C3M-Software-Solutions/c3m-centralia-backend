import { Request, Response, NextFunction } from 'express';
import { storageService } from '../utils/storage';
import { AppError } from '../middleware/errorHandler';

/**
 * Upload single file
 */
export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const folder = (req.body.folder as string) || 'general';
    const result = await storageService.upload(req.file, { folder });

    res.status(201).json({
      status: 'success',
      data: {
        file: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple files
 */
export const uploadFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const folder = (req.body.folder as string) || 'general';
    const uploadPromises = req.files.map((file) => storageService.upload(file, { folder }));

    const results = await Promise.all(uploadPromises);

    res.status(201).json({
      status: 'success',
      data: {
        files: results,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete file
 */
export const deleteFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileUrl, provider } = req.body;

    if (!fileUrl) {
      throw new AppError('File URL is required', 400);
    }

    await storageService.delete(fileUrl, provider as 'local' | 's3' | 'cloudinary' | undefined);

    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get storage info
 */
export const getStorageInfo = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        provider: process.env.STORAGE_PROVIDER || 'local',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      },
    });
  } catch (error) {
    next(error);
  }
};
