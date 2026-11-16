import prisma from '../../../config/database';
import { OpenAIToolDefinition } from './chatbot.types';
import { SPA_PROFILE } from './chatbot.knowledge';
import { logger } from '../../../utils/logger';

export const CHATBOT_TOOLS_DEFINITIONS: OpenAIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_services_catalog',
      description: 'Fetch the real-time list of active spa services, prices in FCFA, duration, and categories from Omega Spa database.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category filter, e.g. "Massage", "Nails", "Facial", "Hair", "Waxing".',
          },
          searchTerm: {
            type: 'string',
            description: 'Optional search keyword to match service names.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cosmetics_catalog',
      description: 'Fetch retail cosmetic and beauty products available for purchase at Omega Spa (serums, creams, oils, shampoos).',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional retail category, e.g. "SKINCARE", "HAIRCARE", "NAILCARE", "WELLNESS".',
          },
          searchTerm: {
            type: 'string',
            description: 'Optional keyword to search product name.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_technician_availability',
      description: 'Check whether a specific technician or any available technician is free for a given date and time slot.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format (e.g. "2026-10-30").',
          },
          time: {
            type: 'string',
            description: 'Time in HH:mm 24-hour format (e.g. "14:30", "16:00").',
          },
          technicianName: {
            type: 'string',
            description: 'Optional preferred technician name (e.g. "Amina", "Bella").',
          },
        },
        required: ['date', 'time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Book a confirmed spa appointment for the client in the Omega Spa database.',
      parameters: {
        type: 'object',
        properties: {
          clientPhone: {
            type: 'string',
            description: 'Client WhatsApp phone number.',
          },
          clientName: {
            type: 'string',
            description: 'Client full name.',
          },
          serviceId: {
            type: 'string',
            description: 'The ID of the primary service to book (from get_services_catalog).',
          },
          appointmentDate: {
            type: 'string',
            description: 'Appointment date in YYYY-MM-DD format.',
          },
          appointmentTime: {
            type: 'string',
            description: 'Appointment start time in HH:mm format.',
          },
          technicianId: {
            type: 'string',
            description: 'Optional assigned technician user ID. If omitted, assigns first available technician.',
          },
          notes: {
            type: 'string',
            description: 'Special client requests or preferences.',
          },
        },
        required: ['clientPhone', 'clientName', 'serviceId', 'appointmentDate', 'appointmentTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_location_and_hours',
      description: 'Returns the exact address, Google Maps link, and operating hours of Omega Spa.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_review_and_referral_info',
      description: 'Returns the official Google 5-star review link and referral program reward details.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

export async function executeChatbotTool(toolName: string, args: Record<string, any>): Promise<any> {
  logger.info(`[Chatbot Tool] Executing tool: ${toolName}`, { args });

  try {
    switch (toolName) {
      case 'get_services_catalog': {
        const whereClause: any = { status: 'ACTIVE' };
        if (args.category) {
          whereClause.category = { contains: args.category };
        }
        if (args.searchTerm) {
          whereClause.name = { contains: args.searchTerm };
        }

        const services = await prisma.service.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            category: true,
            duration: true,
            price: true,
            description: true,
          },
          orderBy: { category: 'asc' },
          take: 25,
        });

        return {
          count: services.length,
          currency: 'FCFA',
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            durationMinutes: s.duration,
            priceFCFA: Number(s.price),
            description: s.description || undefined,
          })),
        };
      }

      case 'get_cosmetics_catalog': {
        const whereClause: any = { quantity: { gt: 0 } };
        if (args.category) {
          whereClause.category = args.category;
        }
        if (args.searchTerm) {
          whereClause.name = { contains: args.searchTerm };
        }

        const products = await prisma.retailProduct.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            quantity: true,
          },
          take: 20,
        });

        return {
          count: products.length,
          currency: 'FCFA',
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            priceFCFA: Number(p.price),
            inStock: p.quantity,
          })),
        };
      }

      case 'check_technician_availability': {
        const targetDate = new Date(args.date);
        if (isNaN(targetDate.getTime())) {
          return { available: false, reason: 'Invalid date format. Use YYYY-MM-DD.' };
        }

        // Find technician candidates
        let technicianWhere: any = {
          role: { name: 'TECHNICIAN' },
          isActive: true,
        };

        if (args.technicianName) {
          technicianWhere.staffProfile = {
            name: { contains: args.technicianName },
          };
        }

        const technicians = await prisma.user.findMany({
          where: technicianWhere,
          include: { staffProfile: true },
        });

        if (technicians.length === 0) {
          return {
            available: false,
            reason: args.technicianName
              ? `Technician "${args.technicianName}" not found.`
              : 'No active technicians available.',
          };
        }

        // Check for conflicting appointments at this date and time
        const conflictingAppointments = await prisma.appointment.findMany({
          where: {
            appointmentDate: targetDate,
            appointmentTime: args.time,
            status: { not: 'CANCELLED' },
          },
          select: { mainTechnicianId: true },
        });

        const busyTechIds = new Set(conflictingAppointments.map((a) => a.mainTechnicianId));
        const freeTechnicians = technicians.filter((t) => !busyTechIds.has(t.id));

        if (freeTechnicians.length > 0) {
          return {
            available: true,
            date: args.date,
            time: args.time,
            availableTechnicians: freeTechnicians.map((t) => ({
              id: t.id,
              name: t.staffProfile?.name || t.email,
            })),
          };
        } else {
          return {
            available: false,
            date: args.date,
            time: args.time,
            reason: 'All technicians are currently booked for this time slot. Please suggest an alternative time (+1 hour or another day).',
          };
        }
      }

      case 'book_appointment': {
        const targetDate = new Date(args.appointmentDate);
        if (isNaN(targetDate.getTime())) {
          return { success: false, message: 'Invalid appointment date format' };
        }

        const service = await prisma.service.findUnique({
          where: { id: args.serviceId },
        });

        if (!service) {
          return { success: false, message: `Service with ID ${args.serviceId} not found` };
        }

        // Find or create client by phone
        let client = await prisma.client.findFirst({
          where: {
            OR: [{ phone: args.clientPhone }, { whatsapp: args.clientPhone }],
          },
        });

        if (!client) {
          client = await prisma.client.create({
            data: {
              name: args.clientName,
              phone: args.clientPhone,
              whatsapp: args.clientPhone,
              source: 'DIRECT',
            },
          });
        }

        // Find an active technician
        let techId = args.technicianId;
        if (!techId) {
          const defaultTech = await prisma.user.findFirst({
            where: { role: { name: 'TECHNICIAN' }, isActive: true },
          });
          if (!defaultTech) {
            return { success: false, message: 'No active technician available to assign' };
          }
          techId = defaultTech.id;
        }

        // Atomic creation of appointment + appointment_service
        const appointment = await prisma.$transaction(async (tx) => {
          const appt = await tx.appointment.create({
            data: {
              clientId: client.id,
              mainTechnicianId: techId,
              appointmentDate: targetDate,
              appointmentTime: args.appointmentTime,
              status: 'SCHEDULED',
              serviceSummary: service.name,
              notes: args.notes || 'Booked via Omega Spa WhatsApp AI Concierge',
            },
          });

          await tx.appointmentService.create({
            data: {
              appointmentId: appt.id,
              serviceId: service.id,
              technicianId: techId,
              price: service.price,
              status: 'BOOKED',
            },
          });

          return appt;
        });

        const techUser = await prisma.user.findUnique({
          where: { id: techId },
          include: { staffProfile: true },
        });

        return {
          success: true,
          bookingReference: appointment.id,
          clientName: client.name,
          serviceName: service.name,
          priceFCFA: Number(service.price),
          date: args.appointmentDate,
          time: args.appointmentTime,
          technician: techUser?.staffProfile?.name || techUser?.email || 'Main Technician',
          message: 'Appointment confirmed successfully in OMEGA SPA system.',
        };
      }

      case 'get_location_and_hours': {
        return {
          spaName: SPA_PROFILE.name,
          address: SPA_PROFILE.address,
          googleMapsUrl: SPA_PROFILE.googleMapsUrl,
          hours: SPA_PROFILE.operatingHours,
          phone: SPA_PROFILE.officialPhone,
          payments: SPA_PROFILE.acceptedPaymentMethods,
        };
      }

      case 'get_review_and_referral_info': {
        return {
          googleReviewUrl: SPA_PROFILE.googleReviewUrl,
          facebookUrl: SPA_PROFILE.facebookUrl,
          referralReward: SPA_PROFILE.referralReward,
          instructions: 'Invite a friend to visit Omega Spa. When they register, you both receive 500 bonus loyalty points or 10% off your next session.',
        };
      }

      default:
        return { error: `Unknown tool name: ${toolName}` };
    }
  } catch (error: any) {
    logger.error(`[Chatbot Tool] Error executing ${toolName}`, { error: error?.message });
    return { error: `Failed to execute tool: ${error?.message || 'Database error'}` };
  }
}
