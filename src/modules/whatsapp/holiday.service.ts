/**
 * OMEGA SPA POS — Holiday & Occasion Greetings Automation Service
 * 
 * Manages 16 Fixed Holidays and 8 Variable Holidays with:
 *   - Universal Meta Template: omega_holiday_greeting
 *   - Automatic annual repetition for fixed dates
 *   - Year-specific date updates for variable dates (Eid, Easter, Mother's/Father's Day)
 *   - Strict idempotency: HOLIDAY_{CODE}_{YEAR}_{CLIENT_ID} ensures 0 duplicates
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import { whatsappAdapter } from './whatsapp.adapter';
import { WhatsAppMessageStatus } from './whatsapp.types';

export interface HolidayOccasion {
  id: string;
  code: string;
  name: string;
  category: 'fixed' | 'variable';
  fixedMonth?: number; // 1 - 12
  fixedDay?: number;   // 1 - 31
  variableDates?: Record<string, string>; // { "2026": "2026-03-20", "2027": "2027-03-10" }
  isActive: boolean;
  timing: string;      // e.g. "09:00"
}

export const UNIVERSAL_HOLIDAY_TEMPLATE = `Hi {NAME},

Happy {OCCASION} from OMEGA SPA! 🌸 Wishing you and your loved ones happiness, peace, good health and joy.

Thank you for being part of our family. We truly appreciate your trust and support.

Warm wishes,
Team OMEGA SPA ❤️`;

export const META_HOLIDAY_TEMPLATE_NAME = 'omega_holiday_greeting';

// Default 24 holidays specified by OMEGA SPA
const DEFAULT_HOLIDAYS: HolidayOccasion[] = [
  // ─── 1. FIXED DATES (16) ───
  { id: 'hol-new-year', code: 'NEW_YEAR', name: "New Year's Day", category: 'fixed', fixedMonth: 1, fixedDay: 1, isActive: true, timing: '09:00' },
  { id: 'hol-youth-day', code: 'YOUTH_DAY', name: "Youth Day (Cameroon)", category: 'fixed', fixedMonth: 2, fixedDay: 11, isActive: true, timing: '09:00' },
  { id: 'hol-valentines', code: 'VALENTINES_DAY', name: "Valentine's Day", category: 'fixed', fixedMonth: 2, fixedDay: 14, isActive: true, timing: '09:00' },
  { id: 'hol-womens-day', code: 'WOMENS_DAY', name: "International Women's Day", category: 'fixed', fixedMonth: 3, fixedDay: 8, isActive: true, timing: '09:00' },
  { id: 'hol-labour-day', code: 'LABOUR_DAY', name: "Labour Day", category: 'fixed', fixedMonth: 5, fixedDay: 1, isActive: true, timing: '09:00' },
  { id: 'hol-national-day', code: 'NATIONAL_DAY', name: "National Day (Cameroon)", category: 'fixed', fixedMonth: 5, fixedDay: 20, isActive: true, timing: '09:00' },
  { id: 'hol-africa-day', code: 'AFRICA_DAY', name: "Africa Day", category: 'fixed', fixedMonth: 5, fixedDay: 25, isActive: true, timing: '09:00' },
  { id: 'hol-mandela-day', code: 'MANDELA_DAY', name: "Nelson Mandela Day", category: 'fixed', fixedMonth: 7, fixedDay: 18, isActive: true, timing: '09:00' },
  { id: 'hol-friendship-day', code: 'FRIENDSHIP_DAY', name: "International Friendship Day", category: 'fixed', fixedMonth: 7, fixedDay: 30, isActive: true, timing: '09:00' },
  { id: 'hol-assumption-day', code: 'ASSUMPTION_DAY', name: "Assumption Day", category: 'fixed', fixedMonth: 8, fixedDay: 15, isActive: true, timing: '09:00' },
  { id: 'hol-peace-day', code: 'PEACE_DAY', name: "International Day of Peace", category: 'fixed', fixedMonth: 9, fixedDay: 21, isActive: true, timing: '09:00' },
  { id: 'hol-mental-health', code: 'MENTAL_HEALTH_DAY', name: "World Mental Health Day", category: 'fixed', fixedMonth: 10, fixedDay: 10, isActive: true, timing: '09:00' },
  { id: 'hol-halloween', code: 'HALLOWEEN', name: "Halloween", category: 'fixed', fixedMonth: 10, fixedDay: 31, isActive: true, timing: '09:00' },
  { id: 'hol-christmas-day', code: 'CHRISTMAS_DAY', name: "Christmas Day", category: 'fixed', fixedMonth: 12, fixedDay: 25, isActive: true, timing: '09:00' },
  { id: 'hol-boxing-day', code: 'BOXING_DAY', name: "Boxing Day", category: 'fixed', fixedMonth: 12, fixedDay: 26, isActive: true, timing: '09:00' },
  { id: 'hol-new-years-eve', code: 'NEW_YEARS_EVE', name: "New Year's Eve", category: 'fixed', fixedMonth: 12, fixedDay: 31, isActive: true, timing: '09:00' },

  // ─── 2. VARIABLE DATES (8) ───
  {
    id: 'hol-mlk-day',
    code: 'MLK_DAY',
    name: "Martin Luther King Jr. Day",
    category: 'variable',
    variableDates: {
      '2026': '2026-01-19',
      '2027': '2027-01-18',
      '2028': '2028-01-17',
      '2029': '2029-01-15',
      '2030': '2030-01-21',
    },
    isActive: true,
    timing: '09:00',
  },
  {
    id: 'hol-eid-al-fitr',
    code: 'EID_AL_FITR',
    name: "Eid al-Fitr",
    category: 'variable',
    variableDates: {
      '2026': '2026-03-20',
      '2027': '2027-03-10',
      '2028': '2028-02-28',
      '2029': '2029-02-15',
      '2030': '2030-02-05',
    },
    isActive: true,
    timing: '09:00',
  },
  {
    id: 'hol-good-friday',
    code: 'GOOD_FRIDAY',
    name: "Good Friday",
    category: 'variable',
    variableDates: {
      '2026': '2026-04-03',
      '2027': '2027-03-26',
      '2028': '2028-04-14',
      '2029': '2029-03-30',
      '2030': '2030-04-19',
    },
    isActive: true,
    timing: '09:00',
  },
  {
    id: 'hol-easter-sunday',
    code: 'EASTER_SUNDAY',
    name: "Easter Sunday",
    category: 'variable',
    variableDates: {
      '2026': '2026-04-05',
      '2027': '2027-03-28',
      '2028': '2028-04-16',
      '2029': '2029-04-01',
      '2030': '2030-04-21',
    },
    isActive: true,
    timing: '09:00',
  },
  {
    id: 'hol-ascension-day',
    code: 'ASCENSION_DAY',
    name: "Ascension Day",
    category: 'variable',
    variableDates: {
      '2026': '2026-05-14',
      '2027': '2027-05-06',
      '2028': '2028-05-25',
      '2029': '2029-05-10',
      '2030': '2030-05-30',
    },
    isActive: true,
    timing: '09:00',
  },
  {
    id: 'hol-mothers-day',
    code: 'MOTHERS_DAY',
    name: "Mother's Day",
    category: 'variable',
    variableDates: {
      '2026': '2026-05-10',
      '2027': '2027-05-09',
      '2028': '2028-05-14',
      '2029': '2029-05-13',
      '2030': '2030-05-12',
    },
    isActive: true,
    timing: '09:00',
  },
  {
    id: 'hol-eid-al-adha',
    code: 'EID_AL_ADHA',
    name: "Eid al-Adha (Tabaski)",
    category: 'variable',
    variableDates: {
      '2026': '2026-05-27',
      '2027': '2027-05-16',
      '2028': '2028-05-05',
      '2029': '2029-04-24',
      '2030': '2030-04-14',
    },
    isActive: true,
    timing: '09:00',
  },
  {
    id: 'hol-fathers-day',
    code: 'FATHERS_DAY',
    name: "Father's Day",
    category: 'variable',
    variableDates: {
      '2026': '2026-06-21',
      '2027': '2027-06-20',
      '2028': '2028-06-18',
      '2029': '2029-06-17',
      '2030': '2030-06-16',
    },
    isActive: true,
    timing: '09:00',
  },
];

export class HolidayService {
  private filePath = path.join(process.cwd(), 'whatsapp_holidays.json');
  private holidaysCache: HolidayOccasion[] | null = null;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge defaults in case new holidays were added
          let changed = false;
          for (const d of DEFAULT_HOLIDAYS) {
            const existing = parsed.find((h: HolidayOccasion) => h.code === d.code);
            if (!existing) {
              parsed.push(d);
              changed = true;
            } else {
              // Synchronize holiday name if updated (e.g. removing slashes)
              if (existing.name !== d.name && (existing.name.includes('/') || !existing.name)) {
                existing.name = d.name;
                changed = true;
              }
              if (d.variableDates) {
                if (!existing.variableDates) existing.variableDates = {};
                for (const [yr, dt] of Object.entries(d.variableDates)) {
                  if (!existing.variableDates[yr]) {
                    existing.variableDates[yr] = dt;
                    changed = true;
                  }
                }
              }
            }
          }
          this.holidaysCache = parsed;
          if (changed) {
            this.saveToFile(parsed);
          }
          return;
        }
      }
    } catch (e: any) {
      logger.warn('[HolidayService] Could not read holidays file, resetting to defaults', { error: e?.message });
    }

    // Default initialization
    this.holidaysCache = [...DEFAULT_HOLIDAYS];
    this.saveToFile(this.holidaysCache);
  }

  private saveToFile(data: HolidayOccasion[]) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e: any) {
      logger.error('[HolidayService] Failed to write holidays file', { error: e?.message });
    }
  }

  /**
   * Get all 24 holidays with their current configurations
   */
  getHolidays(): HolidayOccasion[] {
    if (!this.holidaysCache) {
      this.ensureInitialized();
    }
    return this.holidaysCache || DEFAULT_HOLIDAYS;
  }

  /**
   * Update a holiday (toggle active, change timing, or update variable date for a specific year)
   */
  updateHoliday(idOrCode: string, updates: {
    isActive?: boolean;
    timing?: string;
    year?: number | string;
    date?: string; // "YYYY-MM-DD"
  }): HolidayOccasion | null {
    const list = this.getHolidays();
    const item = list.find((h) => h.id === idOrCode || h.code === idOrCode);
    if (!item) return null;

    if (typeof updates.isActive === 'boolean') {
      item.isActive = updates.isActive;
    }
    if (updates.timing) {
      item.timing = updates.timing;
    }
    if (updates.year && updates.date) {
      const yearKey = String(updates.year);
      if (!item.variableDates) item.variableDates = {};
      item.variableDates[yearKey] = updates.date.trim();
    }

    this.saveToFile(list);
    return item;
  }

  /**
   * Format message using Universal Template
   */
  formatMessage(clientName: string, occasionName: string): string {
    const name = clientName && clientName.trim() ? clientName.trim() : 'Cher Client';
    const cleanOccasion = (occasionName || 'Special Holiday').replace(/\s*\/\s*/g, ' - ').trim();
    return UNIVERSAL_HOLIDAY_TEMPLATE
      .replace('{NAME}', name)
      .replace('{OCCASION}', cleanOccasion);
  }

  /**
   * Checks if any active holiday falls on the given date (in Africa/Douala timezone)
   * dateStr: "YYYY-MM-DD"
   */
  getHolidaysForDate(dateStr: string): HolidayOccasion[] {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const list = this.getHolidays();
    const matched: HolidayOccasion[] = [];

    for (const h of list) {
      if (!h.isActive) continue;

      if (h.category === 'fixed') {
        if (h.fixedMonth === month && h.fixedDay === day) {
          matched.push(h);
        }
      } else if (h.category === 'variable') {
        const scheduledDate = h.variableDates?.[String(year)];
        if (scheduledDate === dateStr) {
          matched.push(h);
        }
      }
    }

    return matched;
  }

  /**
   * Dispatches greetings for a specific holiday to all clients
   * Strict Idempotency: HOLIDAY_{code}_{year}_{clientId} prevents duplicate sending!
   */
  async dispatchHolidayGreetings(holidayCode: string, year: number): Promise<{
    holidayName: string;
    totalTargeted: number;
    sentCount: number;
    alreadySentCount: number;
    failedCount: number;
  }> {
    const list = this.getHolidays();
    const holiday = list.find((h) => h.code === holidayCode || h.id === holidayCode);
    if (!holiday) {
      throw new Error(`Holiday not found with code: ${holidayCode}`);
    }

    // Fetch all active clients with a phone number
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { phone: { not: '' } },
          { whatsapp: { not: '' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
      },
    });

    let sentCount = 0;
    let alreadySentCount = 0;
    let failedCount = 0;

    for (const client of clients) {
      const recipientPhone = (client.whatsapp || client.phone || '').trim();
      if (!recipientPhone) continue;

      const idempotencyKey = `HOLIDAY_${holiday.code}_${year}_${client.id}`;

      // Check if already sent
      const existingLog = await prisma.whatsAppMessageLog.findUnique({
        where: { idempotencyKey },
      });

      if (existingLog) {
        alreadySentCount++;
        continue;
      }

      const clientName = client.name || 'Valued Client';
      const rawHolidayName = holiday.name || 'Special Holiday';
      const cleanHolidayName = rawHolidayName.replace(/\s*\/\s*/g, ' - ').trim();
      const renderedMessage = this.formatMessage(clientName, cleanHolidayName);

      // Meta Cloud API template metadata (No slashes or invalid characters)
      const templateMetadata = {
        template: {
          name: META_HOLIDAY_TEMPLATE_NAME,
          language: 'en',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: clientName },
                { type: 'text', text: cleanHolidayName },
              ],
            },
          ],
        },
      };

      try {
        const sendResult = await whatsappAdapter.send({
          channel: 'WHATSAPP',
          recipient: { phone: recipientPhone, name: clientName },
          content: renderedMessage,
          idempotencyKey,
          metadata: templateMetadata,
        });

        await prisma.whatsAppMessageLog.create({
          data: {
            clientId: client.id,
            recipientPhone,
            message: renderedMessage,
            status: sendResult.success ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED,
            failureReason: sendResult.failureReason,
            providerMessageId: sendResult.providerMessageId,
            idempotencyKey,
            sentAt: sendResult.success ? new Date() : null,
          },
        });

        if (sendResult.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        failedCount++;
        logger.error(`[HolidayService] Failed to send ${holiday.name} greeting to ${recipientPhone}:`, err);
      }
    }

    return {
      holidayName: holiday.name,
      totalTargeted: clients.length,
      sentCount,
      alreadySentCount,
      failedCount,
    };
  }

  /**
   * Test send greeting to a specific phone number
   */
  async testSendGreeting(holidayCode: string, targetPhone: string, testName?: string): Promise<{
    success: boolean;
    renderedMessage: string;
    error?: string;
  }> {
    const list = this.getHolidays();
    const holiday = list.find((h) => h.code === holidayCode || h.id === holidayCode);
    const rawHolidayName = holiday ? holiday.name : 'Special Holiday';
    // Remove forward slashes / because Meta WhatsApp Cloud API marketing delivery blocks / in body variables
    const holidayName = rawHolidayName.replace(/\s*\/\s*/g, ' - ').trim();
    const clientName = (testName && testName.trim() ? testName.trim() : 'Valued Client')
      .replace(/[\r\n\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 60);
    const message = this.formatMessage(clientName, holidayName);

    const templateMetadata = {
      template: {
        name: META_HOLIDAY_TEMPLATE_NAME,
        language: 'en',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: clientName },
              { type: 'text', text: holidayName },
            ],
          },
        ],
      },
    };

    const idempotencyKey = `TEST_HOLIDAY_${Date.now()}`;
    const res = await whatsappAdapter.send({
      channel: 'WHATSAPP',
      recipient: { phone: targetPhone, name: clientName },
      content: message,
      idempotencyKey,
      metadata: templateMetadata,
    });

    // Persist into WhatsApp message audit logs for complete visibility & delivery status tracking
    try {
      await prisma.whatsAppMessageLog.create({
        data: {
          recipientPhone: targetPhone,
          message,
          status: res.success ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED,
          failureReason: res.failureReason || null,
          providerMessageId: res.providerMessageId || null,
          idempotencyKey,
          sentAt: res.success ? new Date() : null,
        },
      });
    } catch (logErr: any) {
      logger.warn('[HolidayService] Could not persist testSend log', { error: logErr?.message });
    }

    return {
      success: res.success,
      renderedMessage: message,
      error: res.failureReason,
    };
  }
}

export const holidayService = new HolidayService();
