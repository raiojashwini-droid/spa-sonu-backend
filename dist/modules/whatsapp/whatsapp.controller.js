"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappController = exports.WhatsAppController = void 0;
const whatsapp_service_1 = require("./whatsapp.service");
const holiday_service_1 = require("./holiday.service");
const whatsapp_validation_1 = require("./whatsapp.validation");
const constants_1 = require("../../config/constants");
const errorHandler_1 = require("../../middleware/errorHandler");
const whatsapp_adapter_1 = require("./whatsapp.adapter");
function getParamId(req, key = 'id') {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
class WhatsAppController {
    /**
     * GET /api/v1/whatsapp/webhook — Meta webhook verification handshake
     * Meta sends: hub.mode, hub.verify_token, hub.challenge
     * We validate the token and echo back the challenge string.
     */
    async verifyWebhook(req, res, _next) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const expectedToken = whatsapp_adapter_1.whatsappAdapter.getWebhookVerifyToken();
        if (mode === 'subscribe' && token && token === expectedToken) {
            res.status(200).send(challenge || 'OK');
        }
        else {
            res.status(403).json({ error: 'Webhook verification failed' });
        }
    }
    async getAutomations(_req, res, next) {
        try {
            const data = await whatsapp_service_1.whatsappService.getAutomations();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAutomationByType(req, res, next) {
        try {
            const rawType = getParamId(req, 'type');
            const type = (0, whatsapp_service_1.normalizeAutomationType)(rawType);
            const data = await whatsapp_service_1.whatsappService.getAutomationByType(type);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateAutomation(req, res, next) {
        try {
            const rawType = getParamId(req, 'type');
            const type = (0, whatsapp_service_1.normalizeAutomationType)(rawType);
            const validated = whatsapp_validation_1.updateAutomationSchema.parse(req.body);
            const data = await whatsapp_service_1.whatsappService.updateAutomation(type, validated);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: `${type} automation updated successfully`,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async processReminders(_req, res, next) {
        try {
            const result = await whatsapp_service_1.whatsappService.processScheduledReminders();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Scheduled appointment reminders processed',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async triggerDailyClose(req, res, next) {
        try {
            const validated = whatsapp_validation_1.dailyCloseTriggerSchema.parse(req.body);
            const authUser = req.user;
            const result = await whatsapp_service_1.whatsappService.triggerDailyCloseBoss(validated, authUser);
            if (result.log?.status === 'FAILED') {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: result.log.failureReason || 'Failed to dispatch WhatsApp daily close summary',
                    data: result,
                });
                return;
            }
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.alreadySent
                    ? 'Daily close summary was already sent for this date'
                    : 'Daily close summary dispatched to Manager/Boss',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async triggerClientWelcome(req, res, next) {
        try {
            const clientId = req.body.clientId;
            if (!clientId) {
                throw new errorHandler_1.AppError('clientId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const result = await whatsapp_service_1.whatsappService.triggerClientWelcome(clientId);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.alreadySent ? 'Welcome message was already sent to this client' : 'Welcome message dispatched to client',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async triggerAfterService(req, res, next) {
        try {
            const { appointmentId } = req.body;
            if (!appointmentId)
                throw new errorHandler_1.AppError('appointmentId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            const result = await whatsapp_service_1.whatsappService.triggerAfterService(appointmentId);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.alreadySent ? 'Already sent (idempotent)' : 'After-service thank you triggered',
                data: result.log,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async triggerPaymentConfirmation(req, res, next) {
        try {
            const { invoiceId } = req.body;
            if (!invoiceId)
                throw new errorHandler_1.AppError('invoiceId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            const result = await whatsapp_service_1.whatsappService.triggerPaymentConfirmation(invoiceId);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.alreadySent ? 'Already sent (idempotent)' : 'Payment confirmation triggered',
                data: result.log,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async sendInvoicePdf(req, res, next) {
        try {
            const { invoiceId, phone } = req.body;
            if (!invoiceId)
                throw new errorHandler_1.AppError('invoiceId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            const result = await whatsapp_service_1.whatsappService.sendInvoicePdf(invoiceId, phone);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: result.success,
                message: result.success ? 'PDF Receipt delivered to WhatsApp' : 'Failed to deliver PDF Receipt',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async sendInvoiceFeedback(req, res, next) {
        try {
            const { invoiceId, phone } = req.body;
            if (!invoiceId)
                throw new errorHandler_1.AppError('invoiceId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            const result = await whatsapp_service_1.whatsappService.sendInvoiceFeedback(invoiceId, phone);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Feedback link dispatched to WhatsApp',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoiceReceiptStatus(req, res, next) {
        try {
            const invoiceId = getParamId(req, 'id');
            const result = await whatsapp_service_1.whatsappService.getInvoiceReceiptStatus(invoiceId);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async triggerCelebrations(_req, res, next) {
        try {
            const data = await whatsapp_service_1.whatsappService.processCelebrationReminders();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Celebration greetings processed',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async triggerRebookingReminders(req, res, next) {
        try {
            const data = await whatsapp_service_1.whatsappService.processRebookingReminders(req.body.clientId);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Rebooking reminders processed',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async sendCustom(req, res, next) {
        try {
            const validated = whatsapp_validation_1.sendCustomMessageSchema.parse(req.body);
            const result = await whatsapp_service_1.whatsappService.sendCustomMessage(validated);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.alreadySent
                    ? 'Message was already sent (idempotent)'
                    : 'WhatsApp message queued/dispatched',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getLogs(req, res, next) {
        try {
            const query = whatsapp_validation_1.logsQuerySchema.parse(req.query);
            const result = await whatsapp_service_1.whatsappService.getMessageLogs(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async retryMessage(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const data = await whatsapp_service_1.whatsappService.retryFailedMessage(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Message retry dispatched',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async purgeOldLogs(req, res, next) {
        try {
            const parsed = whatsapp_validation_1.purgeLogsSchema.parse(req.body || {});
            const days = parsed.days || 30;
            const result = await whatsapp_service_1.whatsappService.purgeOldMessageLogs(days);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: `Successfully purged ${result.deletedCount} message logs older than ${days} days.`,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getRetentionSettings(_req, res, next) {
        try {
            const days = whatsapp_service_1.whatsappService.getRetentionDays();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: { retentionDays: days },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateRetentionSettings(req, res, next) {
        try {
            const parsed = whatsapp_validation_1.updateRetentionSchema.parse(req.body);
            const days = whatsapp_service_1.whatsappService.setRetentionDays(parsed.days);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: `Auto-cleanup retention updated to ${days} days.`,
                data: { retentionDays: days },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getBossPhone(_req, res, next) {
        try {
            const phone = whatsapp_service_1.whatsappService.getBossPhoneNumber();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: { bossPhone: phone },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateBossPhone(req, res, next) {
        try {
            const phoneInput = req.body.bossPhone || req.body.phone;
            if (!phoneInput || typeof phoneInput !== 'string' || !phoneInput.trim()) {
                throw new errorHandler_1.AppError('Valid boss phone number is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const savedPhone = await whatsapp_service_1.whatsappService.setBossPhoneNumber(phoneInput.trim());
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: `Boss WhatsApp phone number updated to ${savedPhone}`,
                data: { bossPhone: savedPhone },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getHolidays(_req, res, next) {
        try {
            const holidays = holiday_service_1.holidayService.getHolidays();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: holidays,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateHoliday(req, res, next) {
        try {
            const idOrCode = getParamId(req, 'id');
            const updated = holiday_service_1.holidayService.updateHoliday(idOrCode, req.body);
            if (!updated) {
                throw new errorHandler_1.AppError('Holiday not found', constants_1.HTTP_STATUS.NOT_FOUND);
            }
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: `Holiday ${updated.name} updated successfully`,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async testSendHoliday(req, res, next) {
        try {
            const idOrCode = getParamId(req, 'id');
            const { phone, clientName } = req.body;
            const targetPhone = phone || whatsapp_service_1.whatsappService.getBossPhoneNumber() || '+237676761349';
            const result = await holiday_service_1.holidayService.testSendGreeting(idOrCode, targetPhone, clientName);
            res.status(result.success ? constants_1.HTTP_STATUS.OK : constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: result.success,
                message: result.success ? `Test greeting sent successfully to ${targetPhone}!` : `Failed to send test greeting: ${result.error || 'Provider rejected message'}`,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async triggerTodayHolidays(_req, res, next) {
        try {
            const now = new Date();
            const doualaStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Africa/Douala',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(now);
            const year = parseInt(doualaStr.split('-')[0], 10);
            const todaysHolidays = holiday_service_1.holidayService.getHolidaysForDate(doualaStr);
            const results = [];
            for (const h of todaysHolidays) {
                const dispatchRes = await holiday_service_1.holidayService.dispatchHolidayGreetings(h.code, year);
                results.push(dispatchRes);
            }
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: `Processed ${todaysHolidays.length} holiday(s) for ${doualaStr}`,
                data: {
                    date: doualaStr,
                    holidaysCount: todaysHolidays.length,
                    results,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async handleWebhook(req, res, next) {
        try {
            const result = await whatsapp_service_1.whatsappService.handleWebhook(req.body);
            res.status(constants_1.HTTP_STATUS.OK).json(result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WhatsAppController = WhatsAppController;
exports.whatsappController = new WhatsAppController();
//# sourceMappingURL=whatsapp.controller.js.map