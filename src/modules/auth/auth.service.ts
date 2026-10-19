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

    // Extract and normalize specialties for session context
    let specialties: string[] = [];
    if (user.staffProfile?.specialties) {
      if (Array.isArray(user.staffProfile.specialties)) {
        specialties = user.staffProfile.specialties as string[];
      } else if (typeof user.staffProfile.specialties === 'string') {
        try {
          specialties = JSON.parse(user.staffProfile.specialties);
        } catch {
          specialties = [];
        }
      }
      specialties = specialties.map((s) => (s === 'Massage' ? 'Body Massage' : s));
    }

    let roleName = user.role.name;
    if (roleName === 'MARKETER' || specialties.some((s) => s.toLowerCase() === 'marketer')) {
      roleName = 'MARKETER' as any;
      specialties = specialties.filter((s) => s.toLowerCase() !== 'marketer');
    }

    // Generate JWT token with resolved role
    const token = generateToken({
      userId: user.id,
      role: roleName,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone || user.staffProfile?.phone || null,
        role: roleName,
        name: user.staffProfile?.name || roleName,
        specialties,
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

    let specialties: string[] = [];
    if (user.staffProfile?.specialties) {
      if (Array.isArray(user.staffProfile.specialties)) {
        specialties = user.staffProfile.specialties as string[];
      } else if (typeof user.staffProfile.specialties === 'string') {
        try {
          specialties = JSON.parse(user.staffProfile.specialties);
        } catch {
          specialties = [];
        }
      }
      specialties = specialties.map((s) => (s === 'Massage' ? 'Body Massage' : s));
    }

    let roleName = user.role.name;
    if (roleName === 'MARKETER' || specialties.some((s) => s.toLowerCase() === 'marketer')) {
      roleName = 'MARKETER' as any;
      specialties = specialties.filter((s) => s.toLowerCase() !== 'marketer');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone || user.staffProfile?.phone || null,
      role: roleName,
      staffProfile: user.staffProfile
        ? {
            id: user.staffProfile.id,
            name: user.staffProfile.name,
            phone: user.staffProfile.phone || user.phone,
            specialties,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
