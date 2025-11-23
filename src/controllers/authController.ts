import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { AppError } from '../middleware/errorHandler.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, phone, avatar } = req.body;

    const result = await authService.register({
      name,
      email,
      password,
      role,
      phone,
      avatar,
    });

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      next(new AppError('Email already registered', 409));
    } else {
      next(error);
    }
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        next(new AppError('Invalid credentials', 401));
      } else if (error.message.includes('inactive')) {
        next(new AppError('Account is deactivated', 401));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await authService.getProfile(userId.toString());

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError('User not found', 404));
    } else {
      next(error);
    }
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const { name, phone, avatar } = req.body;

    const user = await authService.updateProfile(userId.toString(), { name, phone, avatar });

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError('User not found', 404));
    } else {
      next(error);
    }
  }
};
