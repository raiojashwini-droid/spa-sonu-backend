/**
 * OMEGA SPA POS — Penalties & Disciplinary Service
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */

import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import {
  ConductRule,
  STANDARD_CONDUCT_RULES,
  CreatePenaltyInput,
  PenaltyFilterQuery,
  PenaltyRecordResponse,
} from './penalties.types';

export class PenaltiesService {
  /**
   * Get standard conduct rules catalog with recommended default amounts
   */
  public getStandardRules(): ConductRule[] {
    return STANDARD_CONDUCT_RULES;
  }

  /**
   * Record a new disciplinary penalty for a staff member (Manager action)
   */
  public async createPenalty(input: CreatePenaltyInput): Promise<PenaltyRecordResponse> {
    const { staffId, ruleName, penaltyAmount, date, notes, recordedById } = input;

    // 1. Validate staff member exists
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      include: {
        role: true,
        staffProfile: true,
      },
    });

    if (!staff) {
      throw new AppError('Staff member not found', HTTP_STATUS.NOT_FOUND);
    }

    // 2. Validate rule name
    if (!ruleName || typeof ruleName !== 'string' || !ruleName.trim()) {
      throw new AppError('Rule name is required', HTTP_STATUS.BAD_REQUEST);
    }

    // 3. Validate penalty amount
    const amountNum = Number(penaltyAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new AppError('Penalty amount must be a positive number', HTTP_STATUS.BAD_REQUEST);
    }

    // 4. Validate and normalize date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date.trim())) {
      throw new AppError('Invalid date format. Expected YYYY-MM-DD', HTTP_STATUS.BAD_REQUEST);
    }

    const parsedDate = new Date(`${date.trim()}T00:00:00.000Z`);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError('Invalid date value', HTTP_STATUS.BAD_REQUEST);
    }

    // 5. Validate manager/recorder exists
    const recorder = await prisma.user.findUnique({
      where: { id: recordedById },
      include: { staffProfile: true },
    });

    if (!recorder) {
      throw new AppError('Recording manager not found', HTTP_STATUS.NOT_FOUND);
    }

    // 6. Create penalty record in DB
    const record = await prisma.staffPenalty.create({
      data: {
        staffId,
        ruleName: ruleName.trim(),
        penaltyAmount: amountNum,
        date: parsedDate,
        notes: notes?.trim() || null,
        recordedById,
      },
      include: {
        staff: {
          include: {
            role: true,
            staffProfile: true,
          },
        },
        recordedBy: {
          include: {
            staffProfile: true,
          },
        },
      },
    });

    return {
      id: record.id,
      staffId: record.staffId,
      staffName: record.staff.staffProfile?.name || record.staff.email,
      staffEmail: record.staff.email,
      staffRole: record.staff.role?.name || 'STAFF',
      ruleName: record.ruleName,
      penaltyAmount: Number(record.penaltyAmount),
      date: date.trim(),
      notes: record.notes,
      recordedById: record.recordedById,
      recordedByName: record.recordedBy.staffProfile?.name || record.recordedBy.email,
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Retrieve penalty records with optional filters (staffId, date, date range, month)
   */
  public async getPenalties(filters: PenaltyFilterQuery): Promise<{
    penalties: PenaltyRecordResponse[];
    totalPenalties: number;
    count: number;
  }> {
    const where: any = {};

    if (filters.staffId) {
      where.staffId = filters.staffId;
    }

    // Handle date filtering
    if (filters.date) {
      const cleanDate = filters.date.trim().slice(0, 10);
      const startOfDay = new Date(`${cleanDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${cleanDate}T23:59:59.999Z`);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (filters.month) {
      // YYYY-MM filter
      const [yearStr, monthStr] = filters.month.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        where.date = {
          gte: startOfMonth,
          lte: endOfMonth,
        };
      }
    } else if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(`${filters.startDate.trim().slice(0, 10)}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        where.date.lte = new Date(`${filters.endDate.trim().slice(0, 10)}T23:59:59.999Z`);
      }
    }

    const records = await prisma.staffPenalty.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        staff: {
          include: {
            role: true,
            staffProfile: true,
          },
        },
        recordedBy: {
          include: {
            staffProfile: true,
          },
        },
      },
    });

    let totalPenalties = 0;
    const penalties: PenaltyRecordResponse[] = records.map((record) => {
      const amount = Number(record.penaltyAmount);
      totalPenalties += amount;

      const dateStr = record.date instanceof Date
        ? record.date.toISOString().slice(0, 10)
        : String(record.date).slice(0, 10);

      return {
        id: record.id,
        staffId: record.staffId,
        staffName: record.staff.staffProfile?.name || record.staff.email,
        staffEmail: record.staff.email,
        staffRole: record.staff.role?.name || 'STAFF',
        ruleName: record.ruleName,
        penaltyAmount: amount,
        date: dateStr,
        notes: record.notes,
        recordedById: record.recordedById,
        recordedByName: record.recordedBy.staffProfile?.name || record.recordedBy.email,
        createdAt: record.createdAt.toISOString(),
      };
    });

    return {
      penalties,
      totalPenalties,
      count: penalties.length,
    };
  }

  /**
   * Delete / void a mistaken penalty record (Manager only)
   */
  public async deletePenalty(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await prisma.staffPenalty.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Penalty record not found', HTTP_STATUS.NOT_FOUND);
    }

    await prisma.staffPenalty.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Penalty record deleted successfully',
    };
  }
}

export const penaltiesService = new PenaltiesService();
