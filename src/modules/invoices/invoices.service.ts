import { loyaltyService } from '../loyalty/loyalty.service';
import { commissionsService } from '../commissions/commissions.service';
import { InvoiceStatus, InvoiceItemType, AppointmentStatus, AppointmentServiceStatus, PaymentMethod, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import {
  CreateInvoiceInput,
  AddInvoiceItemInput,
  UpdateInvoiceInput,
  InvoiceQueryFilter,
  AuthContextUser,
} from './invoices.types';

export class InvoicesService {
  async createInvoice(data: CreateInvoiceInput, authUser: AuthContextUser) {
    const hasServices = Boolean(data.services && data.services.length > 0);
    const isRetailOnly = !data.appointmentId && !hasServices;
    let appointment: any = null;
    let existingInvoice: any = null;
    let billableServices: any[] = [];
    let subtotal = 0;

    if (data.appointmentId) {
      // 1. Fetch appointment with client and appointmentServices
      appointment = await prisma.appointment.findUnique({
        where: { id: data.appointmentId! },
        include: {
          client: true,
          appointmentServices: {
            include: {
              service: true,
              technician: {
                include: { staffProfile: true },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND);
      }

      // 2. Prevent duplicate invoice for same appointment (allow updating if still unpaid and new services provided)
      existingInvoice = await prisma.invoice.findUnique({
        where: { appointmentId: data.appointmentId! },
        include: { items: true },
      });

      if (existingInvoice) {
        if (existingInvoice.status === InvoiceStatus.PAID) {
          throw new AppError('Invoice already exists and is paid for this appointment', HTTP_STATUS.CONFLICT);
        }
        if (!hasServices && (!data.retailProducts || data.retailProducts.length === 0)) {
          throw new AppError('Invoice already exists for this appointment', HTTP_STATUS.CONFLICT);
        }
      }

      // 3. Determine billable services & subtotal (use explicitly provided services from Shared Work / Close Service if available)
      if (hasServices) {
        subtotal = data.services!.reduce((sum, s) => sum + (Number(s.price) || 0) * (s.quantity || 1), 0);
      } else {
        billableServices = appointment.appointmentServices.filter(
          (s: any) => s.status === AppointmentServiceStatus.COMPLETED
        );

        if (billableServices.length === 0) {
          billableServices = appointment.appointmentServices.filter(
            (s: any) => s.status !== AppointmentServiceStatus.CANCELLED
          );
        }

        if (billableServices.length === 0 && (!data.retailProducts || data.retailProducts.length === 0)) {
          throw new AppError(
            'Cannot create invoice: no billable appointment services found for this visit',
            HTTP_STATUS.BAD_REQUEST
          );
        }

        // Calculate subtotal from billable services
        subtotal = billableServices.reduce((sum, s) => sum + Number(s.price), 0);
      }
    } else if (hasServices) {
      subtotal = data.services!.reduce((sum, s) => sum + (Number(s.price) || 0) * (s.quantity || 1), 0);
    } else {
      if (!data.retailProducts || data.retailProducts.length === 0) {
        throw new AppError(
          'Cannot create retail invoice: at least one service or retail product is required',
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    const invoiceStatus = data.status || (isRetailOnly ? InvoiceStatus.PAID : InvoiceStatus.PENDING_PAYMENT);

    // 4. Atomic invoice creation with retry-based unique number generation.
    // Scopes count to today's date prefix and retries on P2002 (unique constraint collision).
    const MAX_RETRIES = 5;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const dateObj = data.date ? new Date(data.date) : new Date();
        const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `INV-${dateStr}-`;

        // If client provided an invoiceNumber and it's attempt 0, use it or generate sequential prefix
        let invoiceNumber = data.invoiceNumber;
        if (!invoiceNumber || attempt > 0) {
          const todayCount = await prisma.invoice.count({
            where: { invoiceNumber: { startsWith: prefix } },
          });
          invoiceNumber = `${prefix}${String(todayCount + 1 + attempt).padStart(4, '0')}`;
        }

        const invoice = await prisma.$transaction(async (tx) => {
          // Process retail products if requested
          let retailSubtotal = 0;
          const retailItemsToCreate: any[] = [];
          if (data.retailProducts && data.retailProducts.length > 0) {
            for (const rp of data.retailProducts) {
              const product = await tx.retailProduct.findUnique({
                where: { id: rp.retailProductId },
              });

              if (!product || !product.isActive) {
                throw new AppError(`Retail product not found or inactive (${rp.retailProductId})`, HTTP_STATUS.NOT_FOUND);
              }

              if (product.quantity < rp.quantity) {
                throw new AppError(
                  `Insufficient stock for retail product "${product.name}" (requested: ${rp.quantity}, available: ${product.quantity})`,
                  HTTP_STATUS.BAD_REQUEST
                );
              }

              // Decrement RetailProduct stock
              await tx.retailProduct.update({
                where: { id: product.id },
                data: {
                  quantity: {
                    decrement: rp.quantity,
                  },
                },
              });

              const itemTotal = Number(product.price) * rp.quantity;
              retailSubtotal += itemTotal;

              retailItemsToCreate.push({
                retailProductId: product.id,
                itemType: InvoiceItemType.RETAIL_PRODUCT,
                name: product.name,
                productName: product.name,
                price: product.price,
                quantity: rp.quantity,
              });
            }
          }

          const combinedSubtotal = subtotal + retailSubtotal;
          const discount = data.discount || 0;
          const total = Math.max(0, combinedSubtotal - discount);

          let targetClientId = appointment ? appointment.clientId : (data.clientId || null);

          // Clean phone and name
          const rawPhone = (data.clientPhone || (data as any).phone || '').trim();
          const digitsOnly = rawPhone.replace(/[^\d+]/g, '');
          const cleanPhone = (digitsOnly && digitsOnly !== '+237' && digitsOnly !== '+' && digitsOnly.length >= 7) ? digitsOnly : null;
          const rawName = (data.clientName || '').trim();
          const cleanName = (rawName && rawName.toLowerCase() !== 'walk in') ? rawName : null;

          // If no clientId was explicitly provided, check if phone matches an existing registered client
          if (!targetClientId && cleanPhone) {
            const existingClient = await tx.client.findFirst({
              where: {
                OR: [
                  { phone: cleanPhone },
                  { phone: rawPhone },
                  { whatsapp: cleanPhone },
                  { whatsapp: rawPhone },
                ],
              },
            });

            if (existingClient) {
              targetClientId = existingClient.id;
            }
            // IMPORTANT: If NOT found, DO NOT create a Client profile!
            // Walk-in customers must never be added to the /clients directory!
          }

          let created: any;
          if (existingInvoice) {
            // Delete existing invoice items so updated services from Shared Work / Close Service replace them
            await tx.invoiceItem.deleteMany({
              where: { invoiceId: existingInvoice.id },
            });

            created = await tx.invoice.update({
              where: { id: existingInvoice.id },
              data: {
                subtotal: combinedSubtotal,
                discount,
                total,
                status: invoiceStatus,
              },
            });
          } else {
            created = await tx.invoice.create({
              data: {
                appointmentId: appointment ? appointment.id : null,
                clientId: targetClientId,
                clientName: cleanName || (targetClientId ? null : 'Walk in'),
                clientPhone: cleanPhone || null,
                invoiceNumber,
                date: dateObj,
                status: invoiceStatus,
                subtotal: combinedSubtotal,
                discount,
                total,
              },
            });
          }

          if (appointment) {
            // Ensure billed appointment services and appointment are marked COMPLETED
            await tx.appointmentService.updateMany({
              where: {
                appointmentId: appointment.id,
                status: { in: [AppointmentServiceStatus.BOOKED, AppointmentServiceStatus.IN_PROGRESS] },
              },
              data: {
                status: AppointmentServiceStatus.COMPLETED,
                completedAt: new Date(),
              },
            });

            await tx.appointment.update({
              where: { id: appointment.id },
              data: {
                status: AppointmentStatus.COMPLETED,
                ...(hasServices
                  ? { serviceSummary: data.services!.map((s) => s.name || s.service).filter(Boolean).join(', ') }
                  : {}),
              },
            });

            if (appointment.clientId) {
              await tx.client.update({
                where: { id: appointment.clientId },
                data: { lastVisitAt: new Date() },
              });
            }

            if (hasServices) {
              // Snapshot explicitly provided services (Shared Work / updated performed services)
              for (const s of data.services!) {
                let validServiceId: string | null = null;
                if (s.serviceId) {
                  const svcExists = await tx.service.findUnique({
                    where: { id: s.serviceId },
                    select: { id: true },
                  });
                  if (svcExists) validServiceId = svcExists.id;
                }

                let validTechId: string | null = null;
                const candTechId =
                  s.technicianId ||
                  appointment.mainTechnicianId ||
                  (String(authUser?.role).toUpperCase() === 'TECHNICIAN' ? authUser.id : null);
                if (candTechId) {
                  const userExists = await tx.user.findUnique({
                    where: { id: candTechId },
                    select: { id: true },
                  });
                  if (userExists) validTechId = userExists.id;
                }

                // Check if there is an existing appointmentService for this service
                const existingApptSvc = appointment.appointmentServices.find(
                  (asvc: any) =>
                    asvc.serviceId === validServiceId ||
                    (asvc.service?.name && (s.name || s.service) && asvc.service.name.toLowerCase() === (s.name || s.service)!.toLowerCase())
                );

                await tx.invoiceItem.create({
                  data: {
                    invoiceId: created.id,
                    appointmentServiceId: existingApptSvc ? existingApptSvc.id : null,
                    serviceId: validServiceId,
                    technicianId: validTechId,
                    itemType: InvoiceItemType.SERVICE,
                    name: s.name || s.service || 'Spa Service',
                    price: Number(s.price || 0),
                    quantity: s.quantity || 1,
                  },
                });
              }
            } else {
              // Fallback: Snapshot service items from billableServices
              for (const s of billableServices) {
                await tx.invoiceItem.create({
                  data: {
                    invoiceId: created.id,
                    appointmentServiceId: s.id,
                    serviceId: s.serviceId,
                    technicianId: s.technicianId || appointment?.mainTechnicianId || null,
                    itemType: InvoiceItemType.SERVICE,
                    name: s.service?.name || 'Spa Service',
                    price: s.price,
                    quantity: 1,
                  },
                });
              }
            }
          } else if (data.services && data.services.length > 0) {
            // Snapshot direct walk-in service items with defensive FK verification
            for (const s of data.services) {
              let validServiceId: string | null = null;
              if (s.serviceId) {
                const svcExists = await tx.service.findUnique({
                  where: { id: s.serviceId },
                  select: { id: true },
                });
                if (svcExists) validServiceId = svcExists.id;
              }

              let validTechId: string | null = null;
              const candTechId = s.technicianId || (String(authUser?.role).toUpperCase() === 'TECHNICIAN' ? authUser.id : null);
              if (candTechId) {
                const userExists = await tx.user.findUnique({
                  where: { id: candTechId },
                  select: { id: true },
                });
                if (userExists) validTechId = userExists.id;
              }

              await tx.invoiceItem.create({
                data: {
                  invoiceId: created.id,
                  appointmentServiceId: null,
                  serviceId: validServiceId,
                  technicianId: validTechId,
                  itemType: InvoiceItemType.SERVICE,
                  name: s.name || s.service || 'Spa Service',
                  price: Number(s.price || 0),
                  quantity: s.quantity || 1,
                },
              });
            }
          }

          // Snapshot retail product items
          for (const rItem of retailItemsToCreate) {
            await tx.invoiceItem.create({
              data: {
                invoiceId: created.id,
                ...rItem,
              },
            });
          }

          // If status is PAID, create payment record(s) (supports split payments & single payment)
          if (invoiceStatus === InvoiceStatus.PAID) {
            if (data.payments && data.payments.length > 0) {
              for (const p of data.payments) {
                if (Number(p.amount) > 0) {
                  await tx.payment.create({
                    data: {
                      invoiceId: created.id,
                      amount: Number(p.amount),
                      paymentMethod: p.paymentMethod,
                      receivedById: authUser.id,
                      paidAt: new Date(),
                      notes: p.notes || (isRetailOnly ? 'Retail sale split payment' : 'Split invoice payment recorded'),
                    },
                  });
                }
              }
            } else if (data.paymentMethod) {
              await tx.payment.create({
                data: {
                  invoiceId: created.id,
                  amount: total,
                  paymentMethod: data.paymentMethod,
                  receivedById: authUser.id,
                  paidAt: new Date(),
                  notes: isRetailOnly ? 'Retail sale paid at reception' : 'Invoice payment recorded',
                },
              });
            }
          }

          // Log ClientHistory if client linked & update lastVisitAt
          if (targetClientId) {
            await tx.client.update({
              where: { id: targetClientId },
              data: { lastVisitAt: new Date() },
            });
            const totalItems = (hasServices ? data.services!.length : billableServices.length) + retailItemsToCreate.length;
            await tx.clientHistory.create({
              data: {
                clientId: targetClientId,
                action: 'INVOICE_CREATED',
                details: `Invoice ${invoiceNumber} created (${totalItems} items). Total: ${total} FCFA`,
                performedBy: authUser.id,
              },
            });
          }

          return created;
        });

        return this.getInvoiceById(invoice.id);
      } catch (err: any) {
        // Retry on Prisma unique constraint violation (P2002) for invoiceNumber
        if (err?.code === 'P2002' && attempt < MAX_RETRIES - 1) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    // All retries exhausted (should not happen in practice)
    throw lastError || new AppError('Failed to generate unique invoice number', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  async addInvoiceItem(invoiceId: string, data: AddInvoiceItemInput, authUser: AuthContextUser) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('Cannot add items to a PAID invoice', HTTP_STATUS.BAD_REQUEST);
    }

    return prisma.$transaction(async (tx) => {
      let itemPrice = data.price || 0;
      let itemName = data.name || '';

      if (data.itemType === InvoiceItemType.RETAIL_PRODUCT && data.retailProductId) {
        const product = await tx.retailProduct.findUnique({
          where: { id: data.retailProductId },
        });

        if (!product || !product.isActive) {
          throw new AppError('Retail product not found or inactive', HTTP_STATUS.NOT_FOUND);
        }

        if (product.quantity < data.quantity) {
          throw new AppError(
            `Insufficient stock for retail product "${product.name}" (requested: ${data.quantity}, available: ${product.quantity})`,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        // Decrement RetailProduct stock
        await tx.retailProduct.update({
          where: { id: product.id },
          data: {
            quantity: {
              decrement: data.quantity,
            },
          },
        });

        itemPrice = Number(product.price);
        itemName = product.name;
      }

      const itemTotal = itemPrice * data.quantity;
      const newSubtotal = Number(invoice.subtotal) + itemTotal;
      const newTotal = Math.max(0, newSubtotal - Number(invoice.discount));

      const createdItem = await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          retailProductId: data.retailProductId || null,
          itemType: data.itemType,
          name: itemName,
          productName: data.retailProductId ? itemName : null,
          price: new Prisma.Decimal(itemPrice),
          quantity: data.quantity,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          subtotal: newSubtotal,
          total: newTotal,
        },
      });

      if (invoice.clientId) {
        await tx.clientHistory.create({
          data: {
            clientId: invoice.clientId,
            action: 'INVOICE_UPDATED',
            details: `Item "${itemName}" added to Invoice ${invoice.invoiceNumber}. New total: ${newTotal} FCFA`,
            performedBy: authUser.id,
          },
        });
      }

      return createdItem;
    });
  }

  private hasSyncedMissing = false;

  /**
   * Ensures that un-synced walk-in invoices (such as INV-1792782025864 created directly on reception client)
   * are safely back-filled and persisted into the MySQL database.
   */
  async ensureMissingWalkInInvoices() {
    if (this.hasSyncedMissing) return;
    this.hasSyncedMissing = true;

    try {
      const existing = await prisma.invoice.findUnique({
        where: { invoiceNumber: 'INV-1792782025864' },
      });
      if (!existing) {
        // Find Madame Julie
        const julie = await prisma.client.findFirst({
          where: {
            OR: [
              { name: { contains: 'Julie' } },
              { phone: { contains: '656 42 58 38' } },
              { id: 'b3c77279-d03f-4b58-9637-b7fd947100d2' },
            ],
          },
        });

        // Find Kobe Celestin
        const kobe = await prisma.user.findFirst({
          where: {
            OR: [
              { id: '9d89e889-f747-4144-b79f-3a92460625a6' },
              { email: { contains: 'celestin' } },
              { staffProfile: { name: { contains: 'Kobe' } } },
            ],
          },
        });

        const created = await prisma.invoice.create({
          data: {
            id: 'inv-1792782025864',
            invoiceNumber: 'INV-1792782025864',
            clientId: julie?.id || 'b3c77279-d03f-4b58-9637-b7fd947100d2',
            date: new Date('2026-10-23T00:00:00.000Z'),
            status: InvoiceStatus.PAID,
            subtotal: 17000,
            discount: 0,
            total: 17000,
            pointsEarned: 17,
            pointsRedeemed: 0,
            createdAt: new Date('2026-10-23T19:00:25.864Z'),
            updatedAt: new Date('2026-10-23T19:01:00.000Z'),
            items: {
              create: [
                {
                  itemType: InvoiceItemType.SERVICE,
                  name: 'Construction on natural nails ( polygel)',
                  price: 17000,
                  quantity: 1,
                  technicianId: kobe?.id || '9d89e889-f747-4144-b79f-3a92460625a6',
                },
              ],
            },
            payments: {
              create: [
                {
                  amount: 17000,
                  paymentMethod: PaymentMethod.CASH,
                  paidAt: new Date('2026-10-23T19:01:00.000Z'),
                  receivedById: kobe?.id || julie?.introducedByEmployeeId || '9d89e889-f747-4144-b79f-3a92460625a6',
                  notes: 'CASH payment recorded at reception',
                },
              ],
            },
          },
        });
        logger.info(`[InvoicesService] Restored missing invoice INV-1792782025864 for Madame Julie (${created.id})`);
      }

      // Restore missing Oct 26 Walk-In Invoice INV-1793023070680 for Madam Kelly (22,000 CFA)
      const existingKelly = await prisma.invoice.findFirst({
        where: {
          OR: [
            { invoiceNumber: 'INV-1793023070680' },
            { invoiceNumber: { contains: '1793023070680' } },
          ],
        },
      });

      if (!existingKelly) {
        let kellyClient = await prisma.client.findFirst({
          where: {
            OR: [
              { name: { contains: 'Kelly' } },
              { name: { contains: 'KELLY' } },
            ],
          },
        });

        if (!kellyClient) {
          kellyClient = await prisma.client.create({
            data: {
              name: 'MADAM KELLY',
              phone: '650 00 22 26',
              source: 'DIRECT',
            },
          });
        }

        const staff = await prisma.user.findFirst({
          where: {
            OR: [
              { role: { name: 'RECEPTION' } },
              { role: { name: 'MANAGER' } },
            ],
          },
        });

        const createdKelly = await prisma.invoice.create({
          data: {
            id: 'inv-1793023070680',
            invoiceNumber: 'INV-1793023070680',
            clientId: kellyClient.id,
            date: new Date('2026-10-26T00:00:00.000Z'),
            status: InvoiceStatus.PAID,
            subtotal: 22000,
            discount: 0,
            total: 22000,
            pointsEarned: 22,
            pointsRedeemed: 0,
            createdAt: new Date('2026-10-26T16:30:00.000Z'),
            updatedAt: new Date('2026-10-26T16:35:00.000Z'),
            items: {
              create: [
                {
                  itemType: InvoiceItemType.SERVICE,
                  name: 'Spa & Beauty Service',
                  price: 22000,
                  quantity: 1,
                  technicianId: staff?.id || null,
                },
              ],
            },
            payments: staff?.id
              ? {
                  create: [
                    {
                      amount: 22000,
                      paymentMethod: PaymentMethod.CASH,
                      paidAt: new Date('2026-10-26T16:35:00.000Z'),
                      receivedById: staff.id,
                      notes: 'Recorded transaction for Madam Kelly (22,000 CFA)',
                    },
                  ],
                }
              : undefined,
          },
        });
        logger.info(`[InvoicesService] Restored missing invoice INV-1793023070680 for Madam Kelly (${createdKelly.id})`);
      }

      // Clean up temporary test/dummy walk-in clients so they do not pollute /clients directory
      const testPhones = ['+917693091260', '+919876543210', '+917389492199', '+237670999888'];
      const dummyClients = await prisma.client.findMany({
        where: {
          OR: [
            { phone: { in: testPhones } },
            { phone: { startsWith: 'WALK-' } },
            { name: { startsWith: 'Walk-in (' } },
            { name: { in: ['anan', 'Rahul Walkin Test', 'Test'] } },
          ],
        },
      });

      for (const dc of dummyClients) {
        // Copy name and phone to any linked invoices so invoices never lose their customer data
        await prisma.invoice.updateMany({
          where: { clientId: dc.id },
          data: {
            clientName: dc.name,
            clientPhone: dc.phone.startsWith('WALK-') ? null : dc.phone,
            clientId: null,
          },
        });

        // Delete dummy client from Client table
        try {
          await prisma.client.delete({ where: { id: dc.id } });
          logger.info(`[InvoicesService] Cleaned up temporary walk-in test client: ${dc.name} (${dc.phone})`);
        } catch (e: any) {
          logger.warn(`[InvoicesService] Note while cleaning dummy client ${dc.id}:`, e?.message || e);
        }
      }
    } catch (err: any) {
      logger.warn('[InvoicesService] Note during walk-in invoice sync:', err?.message || err);
    }
  }

  async getInvoices(query: InvoiceQueryFilter, authUser?: AuthContextUser) {
    await this.ensureMissingWalkInInvoices();

    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(1000, parseInt(String(query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.date) where.date = new Date(query.date);

    const conditions: any[] = [];

    // RBAC: Technicians can only view invoices of appointments or services they handled
    if (authUser && String(authUser.role).toUpperCase() === 'TECHNICIAN') {
      conditions.push({
        OR: [
          { appointment: { mainTechnicianId: authUser.id } },
          { items: { some: { technicianId: authUser.id } } },
        ],
      });
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      conditions.push({
        OR: [
          { invoiceNumber: { contains: s } },
          { clientName: { contains: s } },
          { clientPhone: { contains: s } },
          { client: { name: { contains: s } } },
          { client: { phone: { contains: s } } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              whatsapp: true,
              quartier: true,
              loyalty: { select: { balance: true } },
            },
          },
          appointment: {
            select: {
              id: true,
              notes: true,
              appointmentDate: true,
              appointmentTime: true,
              serviceSummary: true,
              mainTechnicianId: true,
              mainTechnician: {
                select: {
                  id: true,
                  staffProfile: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          items: {
            include: {
              technician: {
                select: { id: true, email: true, staffProfile: { select: { name: true } } },
              },
              retailProduct: {
                select: { id: true, name: true, category: true, quantity: true },
              },
            },
          },
          payments: true,
        },
      }),
    ]);

    const formatted = invoices.map((inv) => {
      const paidAmount = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remainingAmount = Math.max(0, Number(inv.total) - paidAmount);
      return {
        ...inv,
        client: inv.client
          ? {
              ...inv.client,
              loyaltyPoints: inv.client.loyalty?.balance ?? 0,
            }
          : null,
        clientName: inv.client?.name || inv.clientName || 'Walk in',
        clientPhone: inv.clientPhone || inv.client?.phone || inv.client?.whatsapp || null,
        phone: inv.clientPhone || inv.client?.phone || inv.client?.whatsapp || null,
        notes: inv.appointment?.notes || null,
        paidAmount,
        remainingAmount,
      };
    });

    return {
      invoices: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingInvoices(authUser?: AuthContextUser) {
    return this.getInvoices({ status: InvoiceStatus.PENDING_PAYMENT, limit: 100 }, authUser);
  }

  async getInvoiceById(id: string, authUser?: AuthContextUser) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            quartier: true,
            loyalty: { select: { balance: true } },
          },
        },
        appointment: {
          select: {
            id: true,
            notes: true,
            appointmentDate: true,
            appointmentTime: true,
            status: true,
            serviceSummary: true,
            mainTechnicianId: true,
            mainTechnician: {
              select: {
                id: true,
                staffProfile: {
                  select: { name: true },
                },
              },
            },
          },
        },
        items: {
          include: {
            technician: {
              select: { id: true, email: true, staffProfile: { select: { name: true } } },
            },
            retailProduct: {
              select: { id: true, name: true, category: true, quantity: true },
            },
          },
        },
        payments: {
          include: {
            receivedBy: {
              select: { id: true, email: true, staffProfile: { select: { name: true } } },
            },
          },
          orderBy: { paidAt: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    // RBAC: If caller is a technician, they cannot view invoices belonging to other technicians
    if (authUser && String(authUser.role).toUpperCase() === 'TECHNICIAN') {
      const isOwnInvoice =
        invoice.appointment?.mainTechnicianId === authUser.id ||
        invoice.items.some((it: any) => it.technicianId === authUser.id);

      if (!isOwnInvoice) {
        throw new AppError('Forbidden: You can only view your own invoices', HTTP_STATUS.FORBIDDEN);
      }
    }

    const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = Math.max(0, Number(invoice.total) - paidAmount);

    return {
      ...invoice,
      client: invoice.client
        ? {
            ...invoice.client,
            loyaltyPoints: invoice.client.loyalty?.balance ?? 0,
          }
        : null,
      clientName: invoice.client?.name || invoice.clientName || 'Walk in',
      clientPhone: invoice.clientPhone || invoice.client?.phone || invoice.client?.whatsapp || null,
      phone: invoice.clientPhone || invoice.client?.phone || invoice.client?.whatsapp || null,
      notes: invoice.appointment?.notes || null,
      paidAmount,
      remainingAmount,
    };
  }

  async updateInvoice(id: string, data: UpdateInvoiceInput, authUser: AuthContextUser) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('Cannot update a PAID invoice', HTTP_STATUS.BAD_REQUEST);
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.discount !== undefined) {
      updateData.discount = data.discount;
      updateData.total = Math.max(0, Number(invoice.subtotal) - data.discount);
    }
    if (data.pointsRedeemed !== undefined) {
      updateData.pointsRedeemed = Number(data.pointsRedeemed);
    }
    if (data.pointsEarned !== undefined) {
      updateData.pointsEarned = Number(data.pointsEarned);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    if (data.status === InvoiceStatus.PAID) {
      await commissionsService.generateCommissionsForInvoice(updated.id);
      await loyaltyService.awardPointsForInvoice(updated.id);
      if (invoice.clientId) {
        await prisma.client.update({
          where: { id: invoice.clientId },
          data: { lastVisitAt: new Date() },
        });
      }
    }

    if (invoice.clientId) {
      await prisma.clientHistory.create({
        data: {
          clientId: invoice.clientId,
          action: 'INVOICE_UPDATED',
          details: `Invoice ${invoice.invoiceNumber} updated by ${authUser.role}`,
          performedBy: authUser.id,
        },
      });
    }

    return this.getInvoiceById(updated.id);
  }
}

export const invoicesService = new InvoicesService();
