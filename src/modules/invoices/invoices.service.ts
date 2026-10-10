import { loyaltyService } from '../loyalty/loyalty.service';
import { commissionsService } from '../commissions/commissions.service';
import { InvoiceStatus, InvoiceItemType, AppointmentStatus, AppointmentServiceStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
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
    const isRetailOnly = !data.appointmentId;
    let appointment: any = null;
    let billableServices: any[] = [];
    let subtotal = 0;

    if (!isRetailOnly) {
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

      // 2. Prevent duplicate invoice for same appointment
      const existingInvoice = await prisma.invoice.findUnique({
        where: { appointmentId: data.appointmentId! },
      });

      if (existingInvoice) {
        throw new AppError('Invoice already exists for this appointment', HTTP_STATUS.CONFLICT);
      }

      // 3. Create invoice from non-cancelled appointment services
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
    } else {
      if (!data.retailProducts || data.retailProducts.length === 0) {
        throw new AppError(
          'Cannot create retail invoice: at least one retail product is required',
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
        const dateObj = new Date();
        const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `INV-${dateStr}-`;

        // Count only invoices with today's date prefix for a tighter sequence
        const todayCount = await prisma.invoice.count({
          where: { invoiceNumber: { startsWith: prefix } },
        });

        const invoiceNumber = `${prefix}${String(todayCount + 1 + attempt).padStart(4, '0')}`;

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

          const targetClientId = appointment ? appointment.clientId : (data.clientId || null);

          const created = await tx.invoice.create({
            data: {
              appointmentId: appointment ? appointment.id : null,
              clientId: targetClientId,
              invoiceNumber,
              date: dateObj,
              status: invoiceStatus,
              subtotal: combinedSubtotal,
              discount,
              total,
            },
          });

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
              data: { status: AppointmentStatus.COMPLETED },
            });

            // Snapshot service items
            for (const s of billableServices) {
              await tx.invoiceItem.create({
                data: {
                  invoiceId: created.id,
                  appointmentServiceId: s.id,
                  serviceId: s.serviceId,
                  technicianId: s.technicianId,
                  itemType: InvoiceItemType.SERVICE,
                  name: s.service?.name || 'Spa Service',
                  price: s.price,
                  quantity: 1,
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

          // If status is PAID and paymentMethod is provided, create payment record
          if (invoiceStatus === InvoiceStatus.PAID && data.paymentMethod) {
            await tx.payment.create({
              data: {
                invoiceId: created.id,
                amount: total,
                paymentMethod: data.paymentMethod,
                receivedById: authUser.id,
                paidAt: dateObj,
                notes: isRetailOnly ? 'Retail sale paid at reception' : 'Invoice payment recorded',
              },
            });
          }

          // Log ClientHistory if client linked
          if (targetClientId) {
            const totalItems = billableServices.length + retailItemsToCreate.length;
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

  async getInvoices(query: InvoiceQueryFilter) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(1000, parseInt(String(query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.date) where.date = new Date(query.date);
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { client: { name: { contains: s, mode: 'insensitive' } } },
        { client: { phone: { contains: s, mode: 'insensitive' } } },
      ];
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
            select: { id: true, name: true, phone: true, quartier: true },
          },
          appointment: {
            select: { id: true, notes: true, appointmentDate: true, appointmentTime: true, serviceSummary: true },
          },
          items: true,
          payments: true,
        },
      }),
    ]);

    const formatted = invoices.map((inv) => {
      const paidAmount = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remainingAmount = Math.max(0, Number(inv.total) - paidAmount);
      return {
        ...inv,
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

  async getPendingInvoices() {
    return this.getInvoices({ status: InvoiceStatus.PENDING_PAYMENT, limit: 100 });
  }

  async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, phone: true, whatsapp: true, quartier: true },
        },
        appointment: {
          select: { id: true, notes: true, appointmentDate: true, appointmentTime: true, status: true, serviceSummary: true },
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

    const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = Math.max(0, Number(invoice.total) - paidAmount);

    return {
      ...invoice,
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

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    if (data.status === InvoiceStatus.PAID) {
      await commissionsService.generateCommissionsForInvoice(updated.id);
      await loyaltyService.awardPointsForInvoice(updated.id);
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
