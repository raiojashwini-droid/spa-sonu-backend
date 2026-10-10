import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { generateToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { LoginInput, LoginResponseData, CurrentUserProfile } from './auth.types';

export class AuthService {
  async login(input: LoginInput): Promise<LoginResponseData> {
    const inputClean = input.email.trim();
    const emailNormalized = inputClean.toLowerCase();

    // Find user by email (Google OAuth / login identity)
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
      include: {
        role: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }

    // Check isActive status
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact manager.', HTTP_STATUS.FORBIDDEN);
    }

    // Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone || user.staffProfile?.phone || null,
        role: user.role.name,
        name: user.staffProfile?.name || user.role.name,
      },
    };
  }

  async getCurrentUser(userId: string): Promise<CurrentUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', HTTP_STATUS.FORBIDDEN);
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone || user.staffProfile?.phone || null,
      role: user.role.name,
      staffProfile: user.staffProfile
        ? {
            id: user.staffProfile.id,
            name: user.staffProfile.name,
            phone: user.staffProfile.phone || user.phone,
            specialties: user.staffProfile.specialties,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
