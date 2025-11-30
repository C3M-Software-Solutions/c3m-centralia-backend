import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

/**
 * Middleware to authorize access based on user roles
 * Usage: authorize('admin', 'owner')
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Check if user's role is allowed
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return next(
        new AppError(
          `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }

    // User is authorized
    next();
  };
};
