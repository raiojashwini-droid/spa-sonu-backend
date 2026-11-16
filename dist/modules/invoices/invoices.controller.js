"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesController = exports.InvoicesController = void 0;
const invoices_service_1 = require("./invoices.service");
const invoices_validation_1 = require("./invoices.validation");
const constants_1 = require("../../config/constants");
const invoice_pdf_service_1 = require("./invoice-pdf.service");
function getParamId(req, key = 'id') {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
class InvoicesController {
    async createInvoice(req, res, next) {
        try {
            const validated = invoices_validation_1.createInvoiceSchema.parse(req.body);
            const authUser = req.user;
            const invoice = await invoices_service_1.invoicesService.createInvoice(validated, authUser);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Invoice created successfully',
                data: invoice,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addInvoiceItem(req, res, next) {
        try {
            const invoiceId = getParamId(req, 'id');
            const validated = invoices_validation_1.addInvoiceItemSchema.parse(req.body);
            const authUser = req.user;
            const item = await invoices_service_1.invoicesService.addInvoiceItem(invoiceId, validated, authUser);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Invoice item added successfully',
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPendingInvoices(req, res, next) {
        try {
            const authUser = req.user;
            const result = await invoices_service_1.invoicesService.getPendingInvoices(authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoices(req, res, next) {
        try {
            const query = invoices_validation_1.invoiceQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await invoices_service_1.invoicesService.getInvoices(query, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoiceById(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const authUser = req.user;
            const invoice = await invoices_service_1.invoicesService.getInvoiceById(id, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: invoice,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateInvoice(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const validated = invoices_validation_1.updateInvoiceSchema.parse(req.body);
            const authUser = req.user;
            const invoice = await invoices_service_1.invoicesService.updateInvoice(id, validated, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Invoice updated successfully',
                data: invoice,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoicePdf(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const { buffer, filename } = await invoice_pdf_service_1.invoicePdfService.generateInvoicePdf(id);
            res.setHeader('Content-Type', 'application/pdf');
            const isDownload = req.query.download === 'true';
            res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);
            res.status(constants_1.HTTP_STATUS.OK).send(buffer);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InvoicesController = InvoicesController;
exports.invoicesController = new InvoicesController();
//# sourceMappingURL=invoices.controller.js.map