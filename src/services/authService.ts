import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'specialist' | 'client';
  phone?: string;
  avatar?: string;
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
}

export const authService = new AuthService();
