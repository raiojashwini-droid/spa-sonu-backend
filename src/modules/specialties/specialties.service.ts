import { randomUUID } from 'crypto';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { SpecialtyResponse, CreateSpecialtyInput, UpdateSpecialtyInput } from './specialties.types';

export class SpecialtiesService {
  private formatRow(row: any): SpecialtyResponse {
    const isActive = Boolean(row.isActive);
    return {
      id: String(row.id),
      name: String(row.name),
      isActive,
      active: isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getSpecialties(): Promise<SpecialtyResponse[]> {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, name, isActive, createdAt, updatedAt FROM `Specialty` ORDER BY name ASC'
    );
    return rows.map((r) => this.formatRow(r));
  }

  async getSpecialtyById(id: string): Promise<SpecialtyResponse> {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, name, isActive, createdAt, updatedAt FROM `Specialty` WHERE id = ? LIMIT 1',
      id
    );
    if (!rows || rows.length === 0) {
      throw new AppError('Specialty not found', HTTP_STATUS.NOT_FOUND);
    }
    return this.formatRow(rows[0]);
  }

  async createSpecialty(input: CreateSpecialtyInput): Promise<SpecialtyResponse> {
    const nameTrimmed = input.name.trim();
    if (!nameTrimmed) {
      throw new AppError('Specialty name is required', HTTP_STATUS.BAD_REQUEST);
    }

    // Duplicate specialty names blocked
    const existing = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id FROM `Specialty` WHERE LOWER(name) = LOWER(?) LIMIT 1',
      nameTrimmed
    );
    if (existing && existing.length > 0) {
      throw new AppError('A specialty with this name already exists', HTTP_STATUS.CONFLICT);
    }

    const id = randomUUID();
    const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : 1;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `Specialty` (id, name, isActive, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      id,
      nameTrimmed,
      isActive
    );

    return this.getSpecialtyById(id);
  }

  async updateSpecialty(id: string, input: UpdateSpecialtyInput): Promise<SpecialtyResponse> {
    const existing = await this.getSpecialtyById(id);

    let name = existing.name;
    if (input.name !== undefined) {
      const nameTrimmed = input.name.trim();
      if (!nameTrimmed) {
        throw new AppError('Specialty name cannot be empty', HTTP_STATUS.BAD_REQUEST);
      }

      // Duplicate specialty names blocked
      const duplicate = await prisma.$queryRawUnsafe<any[]>(
        'SELECT id FROM `Specialty` WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1',
        nameTrimmed,
        id
      );
      if (duplicate && duplicate.length > 0) {
        throw new AppError('A specialty with this name already exists', HTTP_STATUS.CONFLICT);
      }
      name = nameTrimmed;
    }

    let isActive = existing.isActive ? 1 : 0;
    if (input.isActive !== undefined) {
      isActive = input.isActive ? 1 : 0;
    } else if (input.active !== undefined) {
      isActive = input.active ? 1 : 0;
    }

    await prisma.$executeRawUnsafe(
      'UPDATE `Specialty` SET name = ?, isActive = ?, updatedAt = NOW() WHERE id = ?',
      name,
      isActive,
      id
    );

    // If specialty name was changed, cascade to services, stock, and staff profile specialties
    if (existing.name !== name) {
      try {
        await prisma.service.updateMany({
          where: { category: existing.name },
          data: { category: name },
        });

        await prisma.serviceStock.updateMany({
          where: { category: existing.name },
          data: { category: name },
        });

        const profiles = await prisma.staffProfile.findMany();
        for (const profile of profiles) {
          let specs: string[] = [];
          if (Array.isArray(profile.specialties)) {
            specs = profile.specialties as string[];
          } else if (typeof profile.specialties === 'string') {
            try { specs = JSON.parse(profile.specialties); } catch { specs = []; }
          }
          if (specs.includes(existing.name)) {
            const updated = specs.map((s) => (s === existing.name ? name : s));
            await prisma.staffProfile.update({
              where: { id: profile.id },
              data: { specialties: updated },
            });
          }
        }
      } catch (cascadeErr: any) {
        console.warn('Non-fatal error cascading specialty rename:', cascadeErr?.message);
      }
    }

    return this.getSpecialtyById(id);
  }

  async deleteSpecialty(id: string): Promise<void> {
    const specialty = await this.getSpecialtyById(id);

    // Check if any active service uses this specialty category
    const servicesCount = await prisma.service.count({
      where: { category: specialty.name },
    });
    if (servicesCount > 0) {
      throw new AppError(
        `Cannot delete specialty "${specialty.name}" because it is currently assigned to ${servicesCount} service(s). Please deactivate it instead.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Clean up deleted specialty from staff profile specialties
    try {
      const profiles = await prisma.staffProfile.findMany();
      for (const profile of profiles) {
        let specs: string[] = [];
        if (Array.isArray(profile.specialties)) {
          specs = profile.specialties as string[];
        } else if (typeof profile.specialties === 'string') {
          try { specs = JSON.parse(profile.specialties); } catch { specs = []; }
        }
        if (specs.includes(specialty.name)) {
          const updated = specs.filter((s) => s !== specialty.name);
          await prisma.staffProfile.update({
            where: { id: profile.id },
            data: { specialties: updated },
          });
        }
      }
    } catch (cleanupErr: any) {
      console.warn('Non-fatal error cleaning up deleted specialty from staff profiles:', cleanupErr?.message);
    }

    await prisma.$executeRawUnsafe('DELETE FROM `Specialty` WHERE id = ?', id);
  }
}

export const specialtiesService = new SpecialtiesService();
