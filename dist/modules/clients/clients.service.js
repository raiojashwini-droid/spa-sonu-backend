"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsService = exports.ClientsService = void 0;
exports.parseCelebrationDate = parseCelebrationDate;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
/**
 * Safely parse a celebration date (Birthday or Anniversary).
 * Accepts:
 * - Full date: "1990-05-14", "1990/05/14", ISO string
 * - Day & Month only: "05-14", "14-05", "14/05", "05/14", etc.
 * Defaults missing year to 2000 (leap year) so MySQL DATE is valid and Feb 29 is preserved.
 */
function parseCelebrationDate(val) {
    if (!val)
        return null;
    const str = String(val).trim();
    if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
        return null;
    }
    // 1. Full date YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymdMatch) {
        const y = parseInt(ymdMatch[1], 10);
        const m = parseInt(ymdMatch[2], 10);
        const d = parseInt(ymdMatch[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return new Date(Date.UTC(y, m - 1, d));
        }
    }
    // 2. Full date DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return new Date(Date.UTC(y, m - 1, d));
        }
    }
    // 3. Month & Day only: "MM-DD" or "DD-MM"
    const mdMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})$/);
    if (mdMatch) {
        const n1 = parseInt(mdMatch[1], 10);
        const n2 = parseInt(mdMatch[2], 10);
        let month = 0;
        let day = 0;
        if (n1 > 12 && n2 <= 12) {
            day = n1;
            month = n2;
        }
        else if (n2 > 12 && n1 <= 12) {
            month = n1;
            day = n2;
        }
        else {
            // Default standard MM-DD
            month = n1;
            day = n2;
        }
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return new Date(Date.UTC(2000, month - 1, day));
        }
    }
    // Fallback to standard Date
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
    return null;
}
class ClientsService {
    async createClient(data, authUser) {
        const trimmedPhone = data.phone.trim();
        const cleanPhone = trimmedPhone.replace(/[\s\-\+\(\)]/g, '');
        // 1. Check duplicate phone (exact and normalized digits comparison)
        const existing = await database_1.default.client.findFirst({
            where: {
                OR: [
                    { phone: trimmedPhone },
                    { whatsapp: trimmedPhone },
                ],
            },
        });
        if (existing) {
            throw new errorHandler_1.AppError(`Client with this phone number already exists (${existing.name})`, constants_1.HTTP_STATUS.CONFLICT);
        }
        if (cleanPhone) {
            const allClients = await database_1.default.client.findMany({ select: { id: true, name: true, phone: true, whatsapp: true } });
            const duplicateNormalized = allClients.find((c) => {
                const cPhoneClean = (c.phone || '').replace(/[\s\-\+\(\)]/g, '');
                const cWaClean = (c.whatsapp || '').replace(/[\s\-\+\(\)]/g, '');
                return (cPhoneClean && cPhoneClean === cleanPhone) || (cWaClean && cWaClean === cleanPhone);
            });
            if (duplicateNormalized) {
                throw new errorHandler_1.AppError(`Client with this phone number already exists (${duplicateNormalized.name})`, constants_1.HTTP_STATUS.CONFLICT);
            }
        }
        // 2. Client Acquisition / Referral Attribution Rule:
        let introducedByEmployeeId = null;
        let source = client_1.ClientSource.DIRECT;
        let referredByClientId = null;
        let recommendedByName = null;
        let recommendedByPhone = null;
        if (authUser.role === 'MANAGER') {
            // Manager client creation:
            // Manager can optionally specify an active, eligible staff member as referrer
            const cleanIntroducedId = data.introducedByEmployeeId ? String(data.introducedByEmployeeId).trim() : null;
            if (cleanIntroducedId) {
                const staffUser = await database_1.default.user.findFirst({
                    where: {
                        id: cleanIntroducedId,
                        isActive: true,
                    },
                    include: { role: true },
                });
                if (!staffUser) {
                    throw new errorHandler_1.AppError('Selected referring staff member does not exist or is inactive', constants_1.HTTP_STATUS.BAD_REQUEST);
                }
                // Manager cannot attribute to another manager or cleaner (must be technician or reception)
                const staffRole = staffUser.role?.name;
                if (staffRole === 'MANAGER' || staffRole === 'CLEANER') {
                    throw new errorHandler_1.AppError('Selected staff member is not eligible for client referral attribution', constants_1.HTTP_STATUS.BAD_REQUEST);
                }
                introducedByEmployeeId = staffUser.id;
                source = client_1.ClientSource.STAFF_REFERRAL;
            }
            else {
                // Direct / Walk-In
                introducedByEmployeeId = null;
                source = client_1.ClientSource.DIRECT;
            }
        }
        else {
            // Non-manager staff (TECHNICIAN, RECEPTION, etc.):
            // Derive referring employee strictly from authenticated session.
            // Do NOT trust any client-submitted employee ID.
            introducedByEmployeeId = authUser.id;
            source = client_1.ClientSource.STAFF_REFERRAL;
        }
        if (data.referredByClientId) {
            referredByClientId = data.referredByClientId;
            source = client_1.ClientSource.CLIENT_REFERRAL;
        }
        if (data.recommendedByName) {
            recommendedByName = data.recommendedByName.trim() || null;
        }
        if (data.recommendedByPhone) {
            recommendedByPhone = data.recommendedByPhone.trim() || null;
        }
        // Parse dates (supports full YYYY-MM-DD or Day-Month only)
        const birthday = parseCelebrationDate(data.birthday);
        const anniversary = parseCelebrationDate(data.anniversary);
        // 3. Create client in database
        const client = await database_1.default.client.create({
            data: {
                name: data.name.trim(),
                phone: trimmedPhone,
                whatsapp: data.whatsapp ? data.whatsapp.trim() : null,
                quartier: data.quartier ? data.quartier.trim() : null,
                birthday,
                anniversary,
                source,
                introducedByEmployeeId,
                referredByClientId,
                recommendedByName,
                recommendedByPhone,
                isActive: true,
                status: 'ACTIVE',
            },
            include: {
                introducedByEmployee: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
            },
        });
        // 4. Create client history record: CLIENT_CREATED
        await database_1.default.clientHistory.create({
            data: {
                clientId: client.id,
                action: 'CLIENT_CREATED',
                details: `Client registered via ${source} by ${authUser.role}`,
                performedBy: authUser.id,
            },
        });
        // 5. Trigger automated Welcome Message via WhatsApp immediately
        try {
            const { whatsappService } = require('../whatsapp/whatsapp.service');
            whatsappService.triggerClientWelcome(client.id).catch((err) => {
                console.warn('[ClientsService] Note: Welcome WhatsApp message could not be sent:', err?.message || err);
            });
        }
        catch (e) {
            // Non-blocking background dispatch
        }
        return client;
    }
    async getClients(query, authUser) {
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(1000, parseInt(String(query.limit || 50), 10)));
        const skip = (page - 1) * limit;
        const where = {};
        // Dynamic status filtering: ACTIVE, INACTIVE, ALL
        const rawStatus = (query.status || '').toString().toUpperCase();
        if (rawStatus === 'ACTIVE' || query.isActive === true || query.isActive === 'true') {
            where.isActive = true;
        }
        else if (rawStatus === 'INACTIVE' || query.isActive === false || query.isActive === 'false') {
            where.isActive = false;
        }
        // If rawStatus === 'ALL' or query.isActive === 'all' or empty, returns both active and inactive
        // Referral query filtering with role-based server-side isolation:
        // Marketers are strictly locked to their own introduced clients (req.user.id).
        // Technicians requesting referred clients are strictly locked to their own referrals (req.user.id).
        // Managers and Reception staff can query any specific staff member's referrals or view all.
        const roleUpper = authUser?.role?.toUpperCase();
        if (roleUpper === 'MARKETER' && authUser) {
            where.introducedByEmployeeId = authUser.id;
        }
        else if (roleUpper === 'TECHNICIAN' && authUser) {
            if (query.introducedByEmployeeId !== undefined && query.introducedByEmployeeId !== null) {
                where.introducedByEmployeeId = authUser.id;
            }
        }
        else {
            if (query.introducedByEmployeeId && typeof query.introducedByEmployeeId === 'string' && query.introducedByEmployeeId.trim()) {
                where.introducedByEmployeeId = query.introducedByEmployeeId.trim();
            }
        }
        if (query.search && query.search.trim() !== '') {
            const search = query.search.trim();
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
                { whatsapp: { contains: search } },
            ];
        }
        const [total, clients] = await Promise.all([
            database_1.default.client.count({ where }),
            database_1.default.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    introducedByEmployee: {
                        select: {
                            id: true,
                            email: true,
                            staffProfile: { select: { name: true } },
                        },
                    },
                    appointments: {
                        orderBy: { appointmentDate: 'desc' },
                        take: 1,
                        select: {
                            appointmentDate: true,
                            serviceSummary: true,
                            appointmentServices: {
                                take: 1,
                                select: {
                                    service: {
                                        select: { name: true },
                                    },
                                },
                            },
                        },
                    },
                    _count: {
                        select: { appointments: true },
                    },
                },
            }),
        ]);
        return {
            clients: clients.map((c) => {
                const { _count, appointments, ...rest } = c;
                const latestAppt = appointments?.[0];
                const latestServiceName = latestAppt?.serviceSummary ||
                    latestAppt?.appointmentServices?.[0]?.service?.name ||
                    c.firstAppointmentService ||
                    null;
                const latestServiceDate = c.lastServiceDate ||
                    latestAppt?.appointmentDate ||
                    c.lastVisitAt ||
                    null;
                return {
                    ...rest,
                    status: c.status || (c.isActive ? 'ACTIVE' : 'INACTIVE'),
                    lastService: latestServiceName,
                    lastServiceDate: latestServiceDate,
                    appointmentsCount: _count.appointments,
                };
            }),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getClientById(id, authUser) {
        const client = await database_1.default.client.findUnique({
            where: { id },
            include: {
                media: {
                    orderBy: { createdAt: 'desc' },
                },
                history: {
                    orderBy: { createdAt: 'desc' },
                },
                introducedByEmployee: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true, phone: true } },
                    },
                },
                referredByClient: {
                    select: { id: true, name: true, phone: true },
                },
                appointments: {
                    orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'desc' }],
                    include: {
                        appointmentServices: {
                            include: {
                                service: { select: { id: true, name: true, category: true, price: true } },
                                technician: {
                                    include: { staffProfile: { select: { name: true } } },
                                },
                            },
                        },
                        mainTechnician: {
                            include: { staffProfile: { select: { name: true } } },
                        },
                    },
                },
                _count: {
                    select: { appointments: true },
                },
            },
        });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // Role-based security: Marketers are strictly restricted to their own introduced clients
        if (authUser?.role?.toUpperCase() === 'MARKETER') {
            if (client.introducedByEmployeeId !== authUser.id) {
                throw new errorHandler_1.AppError('Access denied: You can only view details of clients you introduced', constants_1.HTTP_STATUS.FORBIDDEN);
            }
        }
        const { _count, appointments, ...rest } = client;
        const latestAppt = appointments?.[0];
        const latestServiceName = latestAppt?.serviceSummary ||
            latestAppt?.appointmentServices?.[0]?.service?.name ||
            client.firstAppointmentService ||
            null;
        const latestServiceDate = client.lastServiceDate ||
            latestAppt?.appointmentDate ||
            client.lastVisitAt ||
            null;
        return {
            ...rest,
            status: client.status || (client.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastService: latestServiceName,
            lastServiceDate: latestServiceDate,
            appointmentsCount: _count.appointments,
            appointments: appointments || [],
        };
    }
    async updateClient(id, data, authUser) {
        const client = await database_1.default.client.findUnique({ where: { id } });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (data.phone && data.phone.trim() !== client.phone) {
            const newTrimmed = data.phone.trim();
            const newClean = newTrimmed.replace(/[\s\-\+\(\)]/g, '');
            const allOtherClients = await database_1.default.client.findMany({
                where: { id: { not: id } },
                select: { id: true, name: true, phone: true, whatsapp: true },
            });
            const phoneExists = allOtherClients.find((c) => {
                const cPhoneClean = (c.phone || '').replace(/[\s\-\+\(\)]/g, '');
                const cWaClean = (c.whatsapp || '').replace(/[\s\-\+\(\)]/g, '');
                return c.phone === newTrimmed || (cPhoneClean && cPhoneClean === newClean) || (cWaClean && cWaClean === newClean);
            });
            if (phoneExists) {
                throw new errorHandler_1.AppError(`Phone number already in use by client "${phoneExists.name}"`, constants_1.HTTP_STATUS.CONFLICT);
            }
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
        if (data.phone !== undefined) {
            updateData.phone = data.phone.trim();
            updateData.whatsapp = data.phone.trim();
        }
        if (data.whatsapp !== undefined && data.whatsapp) {
            updateData.whatsapp = data.whatsapp.trim();
        }
        if (data.quartier !== undefined)
            updateData.quartier = data.quartier ? data.quartier.trim() : null;
        if (data.birthday !== undefined)
            updateData.birthday = parseCelebrationDate(data.birthday);
        if (data.anniversary !== undefined)
            updateData.anniversary = parseCelebrationDate(data.anniversary);
        if (data.status !== undefined) {
            const s = data.status.toUpperCase();
            updateData.status = s;
            updateData.isActive = s === 'ACTIVE';
        }
        else if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
            updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE';
        }
        if (data.lastServiceDate !== undefined) {
            updateData.lastServiceDate = data.lastServiceDate ? new Date(data.lastServiceDate) : null;
        }
        const updatedClient = await database_1.default.client.update({
            where: { id },
            data: updateData,
        });
        await database_1.default.clientHistory.create({
            data: {
                clientId: id,
                action: 'CLIENT_UPDATED',
                details: `Client updated by ${authUser.role} (${authUser.id})`,
                performedBy: authUser.id,
            },
        });
        return updatedClient;
    }
    async setClientStatus(id, status, authUser) {
        const client = await database_1.default.client.findUnique({ where: { id } });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const isActive = status === 'ACTIVE';
        const updated = await database_1.default.client.update({
            where: { id },
            data: {
                isActive,
                status,
            },
        });
        await database_1.default.clientHistory.create({
            data: {
                clientId: id,
                action: isActive ? 'CLIENT_RESTORED' : 'CLIENT_DEACTIVATED',
                details: isActive
                    ? `Client status restored to Active by ${authUser.role}`
                    : `Client marked as Inactive by ${authUser.role}`,
                performedBy: authUser.id,
            },
        });
        return updated;
    }
    async deactivateClient(id, authUser) {
        return this.setClientStatus(id, 'INACTIVE', authUser);
    }
    async activateClient(id, authUser) {
        return this.setClientStatus(id, 'ACTIVE', authUser);
    }
    async addClientMedia(clientId, data, authUser) {
        const client = await database_1.default.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const media = await database_1.default.clientMedia.create({
            data: {
                clientId,
                mediaType: data.mediaType,
                fileUrl: data.fileUrl.trim(),
                note: data.note ? data.note.trim() : null,
            },
        });
        await database_1.default.clientHistory.create({
            data: {
                clientId,
                action: 'MEDIA_ADDED',
                details: `${data.mediaType} photo added by ${authUser.role}`,
                performedBy: authUser.id,
            },
        });
        return media;
    }
    async getClientHistory(clientId) {
        const client = await database_1.default.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return database_1.default.clientHistory.findMany({
            where: { clientId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.ClientsService = ClientsService;
exports.clientsService = new ClientsService();
//# sourceMappingURL=clients.service.js.map