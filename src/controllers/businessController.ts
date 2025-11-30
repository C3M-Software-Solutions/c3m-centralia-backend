import { Request, Response, NextFunction } from 'express';

import { businessService } from '../services/businessService.js';
import { AppError } from '../middleware/errorHandler.js';

export const createBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ownerId } = req.body;

    if (!ownerId) {
      throw new AppError('Owner ID is required', 400);
    }

    // Verify the ownerId user exists and has 'owner' role
    const { User } = await import('../models/User.js');
    const owner = await User.findById(ownerId);

    if (!owner) {
      throw new AppError('Owner user not found', 404);
    }

    if (owner.role !== 'owner') {
      throw new AppError('User must have owner role to own a business', 400);
    }

    const business = await businessService.createBusiness({
      ...req.body,
      ownerId: ownerId,
    });

    res.status(201).json({
      status: 'success',
      data: { business },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBusinesses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const city = req.query.city as string;

    const filters = {
      ...(search && { search }),
      ...(city && { city }),
    };

    const result = await businessService.getAllBusinesses(page, limit, filters);

    res.status(200).json({
      status: 'success',
      results: result.businesses.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getBusinessByIdPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const business = await businessService.getBusinessByIdPublic(req.params.id);

    res.status(200).json({
      status: 'success',
      data: { business },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid business ID')) {
        next(new AppError('Invalid business ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Business not found', 404));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const getBusinessById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const business = await businessService.getBusinessById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: { business },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid business ID')) {
        next(new AppError('Invalid business ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Business not found', 404));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const updateBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Admins can update any business
    let business;
    if (userRole === 'admin') {
      business = await businessService.getBusinessById(req.params.id);
      Object.assign(business, req.body);
      await business.save();
    } else {
      business = await businessService.updateBusiness(req.params.id, userId.toString(), req.body);
    }

    res.status(200).json({
      status: 'success',
      data: { business },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid business ID')) {
        next(new AppError('Invalid business ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Business not found', 404));
      } else if (error.message.includes('Unauthorized')) {
        next(new AppError('Not authorized to update this business', 403));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const deleteBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Admins can delete any business
    if (userRole === 'admin') {
      const business = await businessService.getBusinessById(req.params.id);
      await business.deleteOne();
    } else {
      await businessService.deleteBusiness(req.params.id, userId.toString());
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid business ID')) {
        next(new AppError('Invalid business ID', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('Business not found', 404));
      } else if (error.message.includes('Unauthorized')) {
        next(new AppError('Not authorized to delete this business', 403));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};
