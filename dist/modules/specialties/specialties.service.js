"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.specialtiesService = exports.SpecialtiesService = void 0;
const crypto_1 = require("crypto");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class SpecialtiesService {
    formatRow(row) {
        const isActive = Boolean(row.isActive);
        return {
            id: String(row.id),
            name: String(row.name),
            isActive,
            active: isActive,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
    async getSpecialties() {
        const rows = await database_1.default.$queryRawUnsafe('SELECT id, name, isActive, createdAt, updatedAt FROM `Specialty` ORDER BY name ASC');
        return rows.map((r) => this.formatRow(r));
    }
    async getSpecialtyById(id) {
        const rows = await database_1.default.$queryRawUnsafe('SELECT id, name, isActive, createdAt, updatedAt FROM `Specialty` WHERE id = ? LIMIT 1', id);
        if (!rows || rows.length === 0) {
            throw new errorHandler_1.AppError('Specialty not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return this.formatRow(rows[0]);
    }
    async createSpecialty(input) {
        const nameTrimmed = input.name.trim();
        if (!nameTrimmed) {
            throw new errorHandler_1.AppError('Specialty name is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Duplicate specialty names blocked
        const existing = await database_1.default.$queryRawUnsafe('SELECT id FROM `Specialty` WHERE LOWER(name) = LOWER(?) LIMIT 1', nameTrimmed);
        if (existing && existing.length > 0) {
            throw new errorHandler_1.AppError('A specialty with this name already exists', constants_1.HTTP_STATUS.CONFLICT);
        }
        const id = (0, crypto_1.randomUUID)();
        const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : 1;
        await database_1.default.$executeRawUnsafe('INSERT INTO `Specialty` (id, name, isActive, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())', id, nameTrimmed, isActive);
        return this.getSpecialtyById(id);
    }
    async updateSpecialty(id, input) {
        const existing = await this.getSpecialtyById(id);
        let name = existing.name;
        if (input.name !== undefined) {
            const nameTrimmed = input.name.trim();
            if (!nameTrimmed) {
                throw new errorHandler_1.AppError('Specialty name cannot be empty', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            // Duplicate specialty names blocked
            const duplicate = await database_1.default.$queryRawUnsafe('SELECT id FROM `Specialty` WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1', nameTrimmed, id);
            if (duplicate && duplicate.length > 0) {
                throw new errorHandler_1.AppError('A specialty with this name already exists', constants_1.HTTP_STATUS.CONFLICT);
            }
            name = nameTrimmed;
        }
        let isActive = existing.isActive ? 1 : 0;
        if (input.isActive !== undefined) {
            isActive = input.isActive ? 1 : 0;
        }
        else if (input.active !== undefined) {
            isActive = input.active ? 1 : 0;
        }
        await database_1.default.$executeRawUnsafe('UPDATE `Specialty` SET name = ?, isActive = ?, updatedAt = NOW() WHERE id = ?', name, isActive, id);
        // If specialty name was changed, cascade to services, stock, and staff profile specialties
        if (existing.name !== name) {
            try {
                await database_1.default.service.updateMany({
                    where: { category: existing.name },
                    data: { category: name },
                });
                await database_1.default.serviceStock.updateMany({
                    where: { category: existing.name },
                    data: { category: name },
                });
                const profiles = await database_1.default.staffProfile.findMany();
                for (const profile of profiles) {
                    let specs = [];
                    if (Array.isArray(profile.specialties)) {
                        specs = profile.specialties;
                    }
                    else if (typeof profile.specialties === 'string') {
                        try {
                            specs = JSON.parse(profile.specialties);
                        }
                        catch {
                            specs = [];
                        }
                    }
                    if (specs.includes(existing.name)) {
                        const updated = specs.map((s) => (s === existing.name ? name : s));
                        await database_1.default.staffProfile.update({
                            where: { id: profile.id },
                            data: { specialties: updated },
                        });
                    }
                }
            }
            catch (cascadeErr) {
                console.warn('Non-fatal error cascading specialty rename:', cascadeErr?.message);
            }
        }
        return this.getSpecialtyById(id);
    }
    async deleteSpecialty(id) {
        const specialty = await this.getSpecialtyById(id);
        // Check if any active service uses this specialty category
        const servicesCount = await database_1.default.service.count({
            where: { category: specialty.name },
        });
        if (servicesCount > 0) {
            throw new errorHandler_1.AppError(`Cannot delete specialty "${specialty.name}" because it is currently assigned to ${servicesCount} service(s). Please deactivate it instead.`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Clean up deleted specialty from staff profile specialties
        try {
            const profiles = await database_1.default.staffProfile.findMany();
            for (const profile of profiles) {
                let specs = [];
                if (Array.isArray(profile.specialties)) {
                    specs = profile.specialties;
                }
                else if (typeof profile.specialties === 'string') {
                    try {
                        specs = JSON.parse(profile.specialties);
                    }
                    catch {
                        specs = [];
                    }
                }
                if (specs.includes(specialty.name)) {
                    const updated = specs.filter((s) => s !== specialty.name);
                    await database_1.default.staffProfile.update({
                        where: { id: profile.id },
                        data: { specialties: updated },
                    });
                }
            }
        }
        catch (cleanupErr) {
            console.warn('Non-fatal error cleaning up deleted specialty from staff profiles:', cleanupErr?.message);
        }
        await database_1.default.$executeRawUnsafe('DELETE FROM `Specialty` WHERE id = ?', id);
    }
}
exports.SpecialtiesService = SpecialtiesService;
exports.specialtiesService = new SpecialtiesService();
//# sourceMappingURL=specialties.service.js.map