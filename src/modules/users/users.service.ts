import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { CreateUserInput, UpdateUserInput, UserResponse } from './users.types';

export class UsersService {
  private formatUser(user: any): UserResponse {
    const roleName = user.role?.name || 'TECHNICIAN';
    const email = user.email || '';
    const phone = user.phone || user.staffProfile?.phone || null;
    const username = email.split('@')[0];
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

    return {
      id: user.id,
      name: user.staffProfile?.name || email.split('@')[0],
      email: email,
      phone: phone,
      username: username,
      role: roleName.toLowerCase(),
      specialties: specialties,
      active: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUsers(): Promise<UserResponse[]> {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        staffProfile: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return users.map((u) => this.formatUser(u));
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    return this.formatUser(user);
  }

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    const emailNormalized = (input.email || '').trim().toLowerCase();
    if (!emailNormalized) {
      throw new AppError('Email address is required', HTTP_STATUS.BAD_REQUEST);
    }

    const rawPhone = input.phone && input.phone.trim() ? input.phone.trim() : null;
    const phoneClean = rawPhone ? rawPhone.replace(/\s+/g, '') : null;

    // Check if user already exists with this email
    const existingEmail = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });
    if (existingEmail) {
      throw new AppError('A user with this email address already exists', HTTP_STATUS.CONFLICT);
    }

    // Check if user already exists with this phone (if provided)
    if (rawPhone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: rawPhone },
            ...(phoneClean && phoneClean !== rawPhone ? [{ phone: phoneClean }] : []),
            { staffProfile: { phone: rawPhone } },
            ...(phoneClean && phoneClean !== rawPhone ? [{ staffProfile: { phone: phoneClean } }] : []),
          ],
        },
      });
      if (existingPhone) {
        throw new AppError('A staff member with this phone number already exists', HTTP_STATUS.CONFLICT);
      }
    }

    const roleUpper = input.role.toUpperCase() as any;
    const roleRecord = await prisma.role.findFirst({
      where: { name: roleUpper },
    });
    if (!roleRecord) {
      throw new AppError(`Invalid role: ${input.role}`, HTTP_STATUS.BAD_REQUEST);
    }

    const passwordToHash = input.password && input.password.trim() ? input.password.trim() : '123456';
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    const specialtiesJson = (Array.isArray(input.specialties) ? input.specialties : []).map(
      (s: string) => (s === 'Massage' ? 'Body Massage' : s)
    );

    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        phone: rawPhone,
        passwordHash,
        roleId: roleRecord.id,
        isActive: true,
        staffProfile: {
          create: {
            name: input.name.trim(),
            phone: rawPhone,
            specialties: specialtiesJson,
          },
        },
      },
      include: {
        role: true,
        staffProfile: true,
      },
    });

    return this.formatUser(user);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<UserResponse> {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        staffProfile: true,
      },
    });

    if (!existing) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const userUpdates: any = {};

    if (input.role) {
      const roleUpper = input.role.toUpperCase() as any;
      const roleRecord = await prisma.role.findFirst({
        where: { name: roleUpper },
      });
      if (!roleRecord) {
        throw new AppError(`Invalid role: ${input.role}`, HTTP_STATUS.BAD_REQUEST);
      }
      userUpdates.roleId = roleRecord.id;
    }

    if (input.password && input.password.trim()) {
      userUpdates.passwordHash = await bcrypt.hash(input.password.trim(), 10);
    }

    if (input.active !== undefined) {
      userUpdates.isActive = input.active;
    } else if (input.isActive !== undefined) {
      userUpdates.isActive = input.isActive;
    }

    if (input.email && input.email.trim()) {
      const emailNormalized = input.email.trim().toLowerCase();
      if (emailNormalized !== existing.email) {
        const conflict = await prisma.user.findUnique({ where: { email: emailNormalized } });
        if (conflict) {
          throw new AppError('Email address already in use by another user', HTTP_STATUS.CONFLICT);
        }
        userUpdates.email = emailNormalized;
      }
    }

    // Update staffProfile
    const profileUpdates: any = {};
    if (input.name !== undefined && input.name.trim()) {
      profileUpdates.name = input.name.trim();
    }

    if (input.phone !== undefined) {
      const rawPhone = input.phone && input.phone.trim() ? input.phone.trim() : null;
      if (rawPhone && rawPhone !== existing.phone) {
        const phoneConflict = await prisma.user.findFirst({
          where: {
            id: { not: id },
            OR: [
              { phone: rawPhone },
              { staffProfile: { phone: rawPhone } },
            ],
          },
        });
        if (phoneConflict) {
          throw new AppError('Phone number already in use by another user', HTTP_STATUS.CONFLICT);
        }
      }
      userUpdates.phone = rawPhone;
      profileUpdates.phone = rawPhone;
    }

    if (input.specialties !== undefined) {
      const specs = Array.isArray(input.specialties) ? input.specialties : [];
      profileUpdates.specialties = specs.map((s: string) => (s === 'Massage' ? 'Body Massage' : s));
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id },
          data: userUpdates,
        });
      }

      if (Object.keys(profileUpdates).length > 0) {
        if (existing.staffProfile) {
          await tx.staffProfile.update({
            where: { userId: id },
            data: profileUpdates,
          });
        } else {
          await tx.staffProfile.create({
            data: {
              userId: id,
              name: profileUpdates.name || existing.email.split('@')[0],
              phone: profileUpdates.phone || null,
              specialties: profileUpdates.specialties || [],
            },
          });
        }
      }
    });

    const updated = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        staffProfile: true,
      },
    });

    return this.formatUser(updated!);
  }

  async deleteUser(id: string): Promise<void> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const usersService = new UsersService();
