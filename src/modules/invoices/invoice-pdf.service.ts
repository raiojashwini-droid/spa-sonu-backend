import PDFDocument from 'pdfkit';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';

export class InvoicePdfService {
  /**
   * Generates a luxury, branded PDF receipt matching the exact in-app receipt design (ReceiptModal)
   */
  async generateInvoicePdf(invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          include: { loyalty: true },
        },
        items: {
          include: {
            service: true,
            technician: {
              include: {
                staffProfile: true,
              },
            },
            retailProduct: true,
          },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    const clientName =
      invoice.client?.name && invoice.client.name.trim().toLowerCase() !== 'client'
        ? invoice.client.name
        : (invoice.clientId ? 'Client' : 'Walk in');

    const invNumber = invoice.invoiceNumber || invoice.id.slice(0, 8);
    const filename = `OMEGA_SPA_Receipt_${invNumber}.pdf`;

    const lastPayment = invoice.payments[0];
    const rawPaymentMethod = lastPayment?.paymentMethod || 'CASH';
    let paymentMethodDisplay = 'CASH';
    if (rawPaymentMethod) {
      const pm = String(rawPaymentMethod).toUpperCase().replace(/-/g, '_');
      if (pm.includes('ORANGE')) paymentMethodDisplay = 'ORANGE MONEY';
      else if (pm.includes('MTN') || pm.includes('MOMO')) paymentMethodDisplay = 'MTN MOMO';
      else paymentMethodDisplay = pm.replace(/_/g, ' ');
    }

    const paidDate = lastPayment?.paidAt || invoice.createdAt;
    const dateStr = new Date(paidDate).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }); // e.g. "Sat, 10 October 2026"
    const timeStr = new Date(paidDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }); // e.g. "11:48 AM"

    const technicians =
      Array.from(
        new Set(
          (invoice.items || [])
            .map((it) => it.technician?.staffProfile?.name || it.technician?.email)
            .filter(Boolean)
        )
      ).join(', ') || 'Staff';

    const subtotal = Number(invoice.subtotal);
    const discount = Number(invoice.discount);
    const total = Number(invoice.total);
    const pointsEarned = invoice.pointsEarned || Math.round(total / 1000);
    const pointsRedeemed = invoice.pointsRedeemed || 0;
    const loyaltyBalance = invoice.client?.loyalty?.balance !== undefined ? invoice.client.loyalty.balance : pointsEarned;

    // Filter items into Services, Drinks, and Cosmetics (same as in ReceiptModal)
    const items = invoice.items || [];
    const serviceItems = items.filter((item) => {
      const it = (item.itemType || '').toUpperCase();
      return it === 'SERVICE' || (!it && !item.retailProduct);
    });
    const drinkItems = items.filter((item) => {
      const it = (item.itemType || '').toUpperCase();
      const cat = (item.retailProduct?.category || '').toUpperCase();
      return it === 'DRINK' || cat === 'DRINK';
    });
    const cosmeticItems = items.filter((item) => {
      const it = (item.itemType || '').toUpperCase();
      const cat = (item.retailProduct?.category || '').toUpperCase();
      return it === 'COSMETIC' || cat === 'COSMETIC' || (it === 'RETAIL' && cat !== 'DRINK');
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `OMEGA SPA Receipt - ${invNumber}`,
          Author: 'OMEGA SPA Douala',
          Subject: 'Official Payment Receipt',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), filename }));
      doc.on('error', (err) => reject(err));

      // ── DIMENSIONS (Centered card matching ReceiptModal max-w-[460px]) ──
      const cardWidth = 460;
      const cardX = Math.round((595.28 - cardWidth) / 2); // 68
      const cardY = 35;

      // ── 1. TOP HEADER BAR (#2E2F31) ──
      doc.roundedRect(cardX, cardY, cardWidth, 56, 10).fill('#2E2F31');
      doc.rect(cardX, cardY + 25, cardWidth, 31).fill('#2E2F31');

      doc.fillColor('#FFFFFF')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('OMEGA SPA', cardX + 18, cardY + 12);

      doc.fillColor('#A3A3A3')
        .fontSize(8.5)
        .font('Helvetica')
        .text('DOUALA, CAMEROON', cardX + 18, cardY + 33);

      doc.fillColor('#9CA3AF')
        .fontSize(8.5)
        .font('Helvetica')
        .text('OFFICIAL RECEIPT', cardX + 220, cardY + 12, { width: 222, align: 'right' });

      doc.fillColor('#FFFFFF')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(invNumber, cardX + 220, cardY + 28, { width: 222, align: 'right' });

      // ── 2. DATE / CLIENT METADATA BLOCK ──
      let y = cardY + 56 + 14;

      // Date
      doc.fillColor('#76736F').fontSize(9).font('Helvetica').text('Date', cardX + 18, y);
      doc.fillColor('#2E2F31').fontSize(9).font('Helvetica-Bold').text(dateStr, cardX + 120, y);
      y += 16;

      // Time
      doc.fillColor('#76736F').fontSize(9).font('Helvetica').text('Time', cardX + 18, y);
      doc.fillColor('#2E2F31').fontSize(9).font('Helvetica-Bold').text(timeStr, cardX + 120, y);
      y += 16;

      // Client
      doc.fillColor('#76736F').fontSize(9).font('Helvetica').text('Client', cardX + 18, y);
      doc.fillColor('#2E2F31').fontSize(10).font('Helvetica-Bold').text(clientName, cardX + 120, y);
      y += 16;

      // Technician(s)
      doc.fillColor('#76736F').fontSize(9).font('Helvetica').text('Technician(s)', cardX + 18, y);
      doc.fillColor('#2E2F31').fontSize(9).font('Helvetica-Bold').text(technicians, cardX + 120, y);
      y += 20;

      // Divider line
      doc.moveTo(cardX + 18, y).lineTo(cardX + cardWidth - 18, y).strokeColor('#E8E1D9').lineWidth(1).stroke();
      y += 14;

      // ── 3. ITEMS & SERVICES RENDERED ──
      doc.fillColor('#76736F').fontSize(8.5).font('Helvetica-Bold').text('ITEMS & SERVICES RENDERED', cardX + 18, y);
      y += 16;

      // 3A. Services
      if (serviceItems.length > 0) {
        doc.fillColor('#2E2F31').fontSize(8.5).font('Helvetica-Bold').text(`SERVICES (${serviceItems.length})`, cardX + 18, y);
        y += 12;
        doc.moveTo(cardX + 18, y).lineTo(cardX + cardWidth - 18, y).strokeColor('#2E2F31').lineWidth(1).stroke();
        y += 8;

        serviceItems.forEach((item) => {
          const itemName = item.name || item.service?.name || 'Spa Service';
          const techName = item.technician?.staffProfile?.name || 'Staff';
          const itemPrice = Number(item.price);

          doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text(itemName, cardX + 18, y, { width: 280, ellipsis: true });
          doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text(`${itemPrice.toLocaleString('en-US')} FCFA`, cardX + 300, y, { width: 142, align: 'right' });
          doc.fillColor('#76736F').fontSize(8).font('Helvetica').text(`Tech: ${techName}`, cardX + 18, y + 13);

          doc.moveTo(cardX + 18, y + 26).lineTo(cardX + cardWidth - 18, y + 26).strokeColor('#E8E1D9').lineWidth(0.5).stroke();
          y += 32;
        });
      }

      // 3B. Drinks (if any)
      if (drinkItems.length > 0) {
        doc.fillColor('#2E2F31').fontSize(8.5).font('Helvetica-Bold').text(`DRINKS (${drinkItems.length})`, cardX + 18, y);
        y += 12;
        doc.moveTo(cardX + 18, y).lineTo(cardX + cardWidth - 18, y).strokeColor('#2E2F31').lineWidth(1).stroke();
        y += 8;

        drinkItems.forEach((item) => {
          const itemName = item.name || item.retailProduct?.name || 'Drink';
          const qty = item.quantity || 1;
          const itemPrice = Number(item.price);
          const unitPrice = Math.round(itemPrice / qty);

          doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text(itemName, cardX + 18, y, { width: 280, ellipsis: true });
          doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text(`${itemPrice.toLocaleString('en-US')} FCFA`, cardX + 300, y, { width: 142, align: 'right' });
          doc.fillColor('#76736F').fontSize(8).font('Helvetica').text(`Qty: ${qty}${qty > 1 ? ` · (${unitPrice.toLocaleString('en-US')} FCFA each)` : ' · Retail Drink'}`, cardX + 18, y + 13);

          doc.moveTo(cardX + 18, y + 26).lineTo(cardX + cardWidth - 18, y + 26).strokeColor('#E8E1D9').lineWidth(0.5).stroke();
          y += 32;
        });
      }

      // 3C. Cosmetics (if any)
      if (cosmeticItems.length > 0) {
        doc.fillColor('#2E2F31').fontSize(8.5).font('Helvetica-Bold').text(`COSMETICS (${cosmeticItems.length})`, cardX + 18, y);
        y += 12;
        doc.moveTo(cardX + 18, y).lineTo(cardX + cardWidth - 18, y).strokeColor('#2E2F31').lineWidth(1).stroke();
        y += 8;

        cosmeticItems.forEach((item) => {
          const itemName = item.name || item.retailProduct?.name || 'Cosmetic';
          const qty = item.quantity || 1;
          const itemPrice = Number(item.price);
          const unitPrice = Math.round(itemPrice / qty);

          doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text(itemName, cardX + 18, y, { width: 280, ellipsis: true });
          doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text(`${itemPrice.toLocaleString('en-US')} FCFA`, cardX + 300, y, { width: 142, align: 'right' });
          doc.fillColor('#76736F').fontSize(8).font('Helvetica').text(`Qty: ${qty}${qty > 1 ? ` · (${unitPrice.toLocaleString('en-US')} FCFA each)` : ' · Retail Cosmetic'}`, cardX + 18, y + 13);

          doc.moveTo(cardX + 18, y + 26).lineTo(cardX + cardWidth - 18, y + 26).strokeColor('#E8E1D9').lineWidth(0.5).stroke();
          y += 32;
        });
      }

      // Fallback if no categorized items
      if (serviceItems.length === 0 && drinkItems.length === 0 && cosmeticItems.length === 0) {
        doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text('Spa Services & Treatments', cardX + 18, y);
        doc.fillColor('#2E2F31').fontSize(9.5).font('Helvetica-Bold').text(`${total.toLocaleString('en-US')} FCFA`, cardX + 300, y, { width: 142, align: 'right' });
        doc.moveTo(cardX + 18, y + 20).lineTo(cardX + cardWidth - 18, y + 20).strokeColor('#E8E1D9').lineWidth(0.5).stroke();
        y += 26;
      }

      // ── 4. SUBTOTAL & DISCOUNT ──
      y += 4;
      doc.moveTo(cardX + 18, y).lineTo(cardX + cardWidth - 18, y).strokeColor('#E8E1D9').lineWidth(1).stroke();
      y += 8;

      doc.fillColor('#76736F').fontSize(9).font('Helvetica').text('Subtotal', cardX + 18, y);
      doc.fillColor('#2E2F31').fontSize(9).font('Helvetica-Bold').text(`${subtotal.toLocaleString('en-US')} FCFA`, cardX + 300, y, { width: 142, align: 'right' });
      y += 16;

      if (discount > 0) {
        doc.fillColor('#7FA285').fontSize(9).font('Helvetica').text(`Loyalty Discount (${pointsRedeemed} pts redeemed)`, cardX + 18, y);
        doc.fillColor('#7FA285').fontSize(9).font('Helvetica-Bold').text(`−${discount.toLocaleString('en-US')} FCFA`, cardX + 300, y, { width: 142, align: 'right' });
        y += 16;
      }

      // ── 5. TOTAL BAR (#F6F1EB) ──
      doc.rect(cardX + 18, y, cardWidth - 36, 28).fill('#F6F1EB');
      doc.rect(cardX + 18, y, cardWidth - 36, 28).strokeColor('#2E2F31').lineWidth(1).stroke();

      doc.fillColor('#2E2F31').fontSize(11).font('Helvetica-Bold').text('TOTAL', cardX + 28, y + 8);
      doc.fillColor('#2E2F31').fontSize(11).font('Helvetica-Bold').text(`${total.toLocaleString('en-US')} FCFA`, cardX + 280, y + 8, { width: 160, align: 'right' });
      y += 36;

      // ── 6. PAYMENT METHOD & STATUS ──
      doc.moveTo(cardX + 18, y).lineTo(cardX + cardWidth - 18, y).strokeColor('#E8E1D9').lineWidth(1).stroke();
      y += 8;

      doc.fillColor('#76736F').fontSize(9).font('Helvetica').text('Payment Method', cardX + 18, y);
      doc.fillColor('#2E2F31').fontSize(9).font('Helvetica-Bold').text(paymentMethodDisplay, cardX + 260, y, { width: 182, align: 'right' });
      y += 18;

      doc.fillColor('#76736F').fontSize(9).font('Helvetica').text('Status', cardX + 18, y + 2);

      const badgeW = 60;
      const badgeH = 18;
      const badgeX = cardX + cardWidth - 18 - badgeW;
      doc.roundedRect(badgeX, y, badgeW, badgeH, 4).fill('#EDF4EE');
      doc.fillColor('#4A8C5C').fontSize(8.5).font('Helvetica-Bold').text('✓ PAID', badgeX, y + 4.5, { width: badgeW, align: 'center' });
      y += 28;

      // ── 7. LOYALTY PROGRAM CARD (#F6F1EB) ──
      if (invoice.clientId || invoice.client?.loyalty) {
        const loyaltyBoxY = y;
        const loyaltyBoxHeight = pointsRedeemed > 0 ? 68 : 54;
        doc.roundedRect(cardX + 18, loyaltyBoxY, cardWidth - 36, loyaltyBoxHeight, 8).fill('#F6F1EB');

        doc.fillColor('#76736F').fontSize(8).font('Helvetica-Bold').text('LOYALTY PROGRAM', cardX + 28, loyaltyBoxY + 10);

        doc.fillColor('#2E2F31').fontSize(8.5).font('Helvetica').text('Points Earned This Visit', cardX + 28, loyaltyBoxY + 23);
        doc.fillColor('#7FA285').fontSize(8.5).font('Helvetica-Bold').text(`+${pointsEarned} pts`, cardX + 260, loyaltyBoxY + 23, { width: 182, align: 'right' });

        if (pointsRedeemed > 0) {
          doc.fillColor('#2E2F31').fontSize(8.5).font('Helvetica').text('Points Redeemed', cardX + 28, loyaltyBoxY + 36);
          doc.fillColor('#C77B6E').fontSize(8.5).font('Helvetica-Bold').text(`−${pointsRedeemed} pts`, cardX + 260, loyaltyBoxY + 36, { width: 182, align: 'right' });
        }

        const balY = pointsRedeemed > 0 ? loyaltyBoxY + 49 : loyaltyBoxY + 36;
        doc.moveTo(cardX + 28, balY).lineTo(cardX + cardWidth - 28, balY).strokeColor('#E8E1D9').lineWidth(0.5).stroke();

        doc.fillColor('#2E2F31').fontSize(8.5).font('Helvetica-Bold').text('Current Balance', cardX + 28, balY + 5);
        doc.fillColor('#2E2F31').fontSize(9).font('Helvetica-Bold').text(`${loyaltyBalance} pts`, cardX + 260, balY + 5, { width: 182, align: 'right' });

        y = loyaltyBoxY + loyaltyBoxHeight + 16;
      }

      // ── 8. FOOTER ──
      doc.moveTo(cardX + 18, y).lineTo(cardX + cardWidth - 18, y).strokeColor('#E8E1D9').lineWidth(1).stroke();
      y += 14;

      doc.fillColor('#2E2F31')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Thank you for visiting OMEGA SPA!', cardX, y, { width: cardWidth, align: 'center' });

      doc.fillColor('#76736F')
        .fontSize(8.5)
        .font('Helvetica')
        .text('We look forward to pampering you again soon.', cardX, y + 14, { width: cardWidth, align: 'center' });

      y += 36;

      // ── OUTER CARD STROKE ──
      doc.roundedRect(cardX, cardY, cardWidth, y - cardY, 10).strokeColor('#E8E1D9').lineWidth(1).stroke();

      doc.end();
    });
  }
}

export const invoicePdfService = new InvoicePdfService();
