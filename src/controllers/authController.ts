import { Request, Response, NextFunction } from 'express';

import { authService } from '../services/authService.js';
import { AppError } from '../middleware/errorHandler.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, avatar } = req.body;

    // Public registration is only for clients
    const result = await authService.register({
      name,
      email,
      password,
      role: 'client', // Force client role for public registration
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

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    const result = await authService.changePassword(
      userId.toString(),
      currentPassword,
      newPassword
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('cannot manage')) {
        next(
          new AppError(
            'You do not have permission to change your password. Please contact your supervisor.',
            403
          )
        );
      } else if (error.message.includes('incorrect')) {
        next(new AppError('Current password is incorrect', 400));
      } else if (error.message.includes('not found')) {
        next(new AppError('User not found', 404));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    await authService.requestPasswordReset(email);

    // Always return success for security (don't reveal if email exists)
    res.status(200).json({
      status: 'success',
      data: {
        message:
          'If the email exists and the account can manage passwords, a reset link has been sent',
      },
    });
  } catch (error) {
    // Don't reveal any information about the user
    res.status(200).json({
      status: 'success',
      data: {
        message:
          'If the email exists and the account can manage passwords, a reset link has been sent',
      },
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const result = await authService.resetPassword(token, newPassword);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired')) {
        next(new AppError('Invalid or expired reset token', 400));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

export const validateResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError('Token is required', 400);
    }

    const result = await authService.validateResetToken(token);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired')) {
        next(new AppError('Invalid or expired reset token', 400));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

/**
 * Create owner user - Only admins can do this
 */
export const createOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    const owner = await authService.createOwner({
      name,
      email,
      password,
      phone,
    });

    res.status(201).json({
      status: 'success',
      data: { owner },
      message: 'Owner created successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      next(new AppError('Email already registered', 409));
    } else {
      next(error);
    }
  }
};
