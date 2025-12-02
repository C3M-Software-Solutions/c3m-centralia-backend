import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import crypto from 'crypto';
import { notificationService } from './notificationService.js';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'owner' | 'specialist' | 'client';
  phone?: string;
  avatar?: string;
}

export interface CreateOwnerData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateOwnerData {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  avatar?: string;
}

export class AuthService {
  async register(data: RegisterData) {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await User.create({
      ...data,
      password: hashedPassword,
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginData) {
    // Find user by email (include password for comparison)
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await comparePassword(data.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    user.password = '';

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update fields
    if (data.name !== undefined) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.avatar !== undefined) user.avatar = data.avatar;

    await user.save();

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Find user with password
    const user = await User.findById(userId).select('+password +canManagePassword');
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user can manage their own password
    if (!user.canManagePassword) {
      throw new Error('User cannot manage their own password. Contact your supervisor.');
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return {
      message: 'Password changed successfully',
    };
  }

  async requestPasswordReset(email: string) {
    // Find user
    const user = await User.findOne({ email }).select('+canManagePassword');

    // If user doesn't exist or cannot manage password, silently return (security)
    if (!user || !user.canManagePassword) {
      // Don't send email, don't reveal if user exists
      return {
        message: 'If the email exists and can manage passwords, a reset link has been sent',
      };
    }

    // Generate reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing (same security as passwords)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token and expiration (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email with unhashed token
    try {
      await notificationService.sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Clear token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new Error('Failed to send reset email');
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password and clear reset fields
    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  async validateResetToken(token: string) {
    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('name email');

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    return {
      valid: true,
      user: {
        name: user.name,
        email: user.email,
      },
    };
  }

  /**
   * Create owner user - Only admins can do this
   * Owner will manage their business
   */
  async createOwner(data: CreateOwnerData) {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create owner user
    const owner = await User.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      role: 'owner',
      canManagePassword: true, // Owner can manage their own password
      isActive: true,
    });

    return {
      id: owner._id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
    };
  }

  /**
   * Get all owners - Admin only
   */
  async getAllOwners() {
    const owners = await User.find({ role: 'owner' }).select(
      '-password -resetPasswordToken -resetPasswordExpires'
    );
    return owners;
  }

  /**
   * Get owner by ID - Admin only
   */
  async getOwnerById(ownerId: string) {
    const owner = await User.findOne({ _id: ownerId, role: 'owner' }).select(
      '-password -resetPasswordToken -resetPasswordExpires'
    );

    if (!owner) {
      throw new Error('Owner not found');
    }

    return owner;
  }

  /**
   * Update owner - Admin only
   */
  async updateOwner(ownerId: string, data: UpdateOwnerData) {
    const owner = await User.findOne({ _id: ownerId, role: 'owner' });

    if (!owner) {
      throw new Error('Owner not found');
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email !== owner.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Update fields
    if (data.name) owner.name = data.name;
    if (data.email) owner.email = data.email;
    if (data.phone !== undefined) owner.phone = data.phone;
    if (data.isActive !== undefined) owner.isActive = data.isActive;

    await owner.save();

    return {
      id: owner._id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      role: owner.role,
      isActive: owner.isActive,
    };
  }

  /**
   * Delete/Deactivate owner - Admin only
   */
  async deleteOwner(ownerId: string) {
    const owner = await User.findOne({ _id: ownerId, role: 'owner' });

    if (!owner) {
      throw new Error('Owner not found');
    }

    // Soft delete - just deactivate
    owner.isActive = false;
    await owner.save();

    return {
      message: 'Owner deactivated successfully',
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        isActive: owner.isActive,
      },
    };
  }
}

export const authService = new AuthService();
