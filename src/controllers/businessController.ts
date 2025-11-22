import { Request, Response, NextFunction } from 'express';
import { Business } from '../models/Business.js';
import { AppError } from '../middleware/errorHandler.js';

export const createBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const business = await Business.create({
      ...req.body,
      user: req.user?.userId,
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
    const { isActive, search } = req.query;
    
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const businesses = await Business.find(filter).populate('user', 'name email');

    res.status(200).json({
      status: 'success',
      results: businesses.length,
      data: { businesses },
    });
  } catch (error) {
    next(error);
  }
};

export const getBusinessById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const business = await Business.findById(req.params.id).populate('user', 'name email');

    if (!business) {
      throw new AppError('Business not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { business },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      throw new AppError('Business not found', 404);
    }

    // Check ownership or admin role
    if (
      business.user.toString() !== req.user?.userId.toString() &&
      req.user?.role !== 'admin'
    ) {
      throw new AppError('Not authorized to update this business', 403);
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { business: updatedBusiness },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      throw new AppError('Business not found', 404);
    }

    // Check ownership or admin role
    if (
      business.user.toString() !== req.user?.userId.toString() &&
      req.user?.role !== 'admin'
    ) {
      throw new AppError('Not authorized to delete this business', 403);
    }

    await Business.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
