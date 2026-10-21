import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { CreateUserInput, UpdateUserInput, UserResponse, SalaryContractInput, SalaryContractResponse } from './users.types';

export class UsersService {
  private formatUser(user: any): UserResponse {
    let roleName = user.role?.name || 'TECHNICIAN';
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

    if (roleName === 'MARKETER' || specialties.some((s) => s.toLowerCase() === 'marketer')) {
      roleName = 'MARKETER';
      specialties = specialties.filter((s) => s.toLowerCase() !== 'marketer');
    }

    let salaryContract;
    if (user.staffProfile) {
      salaryContract = {
        monthlyTarget: Number(user.staffProfile.monthlyTarget || 0),
        basePay: Number(user.staffProfile.basePay || 0),
        commissionRate: Number(user.staffProfile.commissionRate || 0),
        fixedSalary: Number(user.staffProfile.fixedSalary || 0),
        targetScope: user.staffProfile.targetScope || 'INDIVIDUAL',
      };
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
      salaryContract,
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
    let roleRecord = await prisma.role.findFirst({
      where: { name: roleUpper },
    });
    if (!roleRecord && roleUpper === 'MARKETER') {
      try {
        roleRecord = await prisma.role.upsert({
          where: { name: 'MARKETER' as any },
          update: {},
          create: { name: 'MARKETER' as any },
        });
      } catch {
        roleRecord = await prisma.role.findFirst({
          where: { name: 'TECHNICIAN' },
        });
      }
    }
    if (!roleRecord) {
      throw new AppError(`Invalid role: ${input.role}`, HTTP_STATUS.BAD_REQUEST);
    }

    if (!input.password || !input.password.trim()) {
      throw new AppError('Password is required (minimum 6 characters)', HTTP_STATUS.BAD_REQUEST);
    }
    const passwordToHash = input.password.trim();
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    const isMarketerRole = input.role.toLowerCase() === 'marketer';
    const rawSpecs = Array.isArray(input.specialties) ? input.specialties : [];
    const specialtiesList = isMarketerRole && !rawSpecs.includes('Marketer')
      ? [...rawSpecs, 'Marketer']
      : rawSpecs;

    const specialtiesJson = specialtiesList.map(
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
      let roleRecord = await prisma.role.findFirst({
        where: { name: roleUpper },
      });
      if (!roleRecord && roleUpper === 'MARKETER') {
        try {
          roleRecord = await prisma.role.upsert({
            where: { name: 'MARKETER' as any },
            update: {},
            create: { name: 'MARKETER' as any },
          });
        } catch {
          roleRecord = await prisma.role.findFirst({
            where: { name: 'TECHNICIAN' },
          });
        }
      }
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

  async updateSalaryContract(userId: string, input: SalaryContractInput): Promise<SalaryContractResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staffProfile: true, role: true },
    });

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const monthlyTarget = Number(input.monthlyTarget) || 0;
    const basePay = Number(input.basePay) || 0;
    const commissionRate = Number(input.commissionRate) || 0;
    const fixedSalary = Number(input.fixedSalary) || 0;
    const targetScope = input.targetScope === 'SPA_TOTAL' ? 'SPA_TOTAL' : 'INDIVIDUAL';

    if (monthlyTarget < 0 || basePay < 0 || fixedSalary < 0) {
      throw new AppError('Monetary parameters must be non-negative', HTTP_STATUS.BAD_REQUEST);
    }

    if (commissionRate < 0 || commissionRate > 100) {
      throw new AppError('Commission rate must be between 0% and 100%', HTTP_STATUS.BAD_REQUEST);
    }

    // Advisory check: If basePay + target * commissionRate / 100 < fixedSalary
    let advisoryWarning: string | null = null;
    const projectedAtTarget = basePay + (monthlyTarget * commissionRate) / 100;
    if (projectedAtTarget < fixedSalary) {
      advisoryWarning =
        'Advisory: Base pay + commission at exact target (' +
        projectedAtTarget.toLocaleString('en-US') +
        ' FCFA) is lower than fixed salary (' +
        fixedSalary.toLocaleString('en-US') +
        ' FCFA). The employee will receive the fixed salary under the payout formula.';
    }

    let updatedProfile;
    if (user.staffProfile) {
      updatedProfile = await prisma.staffProfile.update({
        where: { userId },
        data: {
          monthlyTarget,
          basePay,
          commissionRate,
          fixedSalary,
          targetScope,
        },
      });
    } else {
      updatedProfile = await prisma.staffProfile.create({
        data: {
          userId,
          name: user.email.split('@')[0],
          monthlyTarget,
          basePay,
          commissionRate,
          fixedSalary,
          targetScope,
        },
      });
    }

    return {
      userId: user.id,
      staffName: updatedProfile.name,
      monthlyTarget: Number(updatedProfile.monthlyTarget),
      basePay: Number(updatedProfile.basePay),
      commissionRate: Number(updatedProfile.commissionRate),
      fixedSalary: Number(updatedProfile.fixedSalary),
      targetScope: updatedProfile.targetScope,
      advisoryWarning,
    };
  }
}

export const usersService = new UsersService();

