export declare class InvoicePdfService {
    /**
     * Generates a luxury, branded PDF receipt matching the exact in-app receipt design (ReceiptModal)
     */
    generateInvoicePdf(invoiceId: string): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
}
export declare const invoicePdfService: InvoicePdfService;
//# sourceMappingURL=invoice-pdf.service.d.ts.map