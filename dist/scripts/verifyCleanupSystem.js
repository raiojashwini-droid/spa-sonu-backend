"use strict";
/**
 * OMEGA SPA POS — Verification Script for Cloudinary 30 Day Auto Cleanup System
 *
 * Runs non-destructive step-by-step verification:
 * - Test 1: Cleaning Photos 30 Days Cleanup
 * - Test 2: Attendance Photos 30 Days Cleanup
 * - Test 3: Client Before/After Protection
 * - Scheduler Verification: Initialization, Cron expression (0 0 * * *), Timezone (Africa/Douala)
 * - Audit Log Verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const mediaCleanup_service_1 = require("../modules/media/mediaCleanup.service");
const mediaCleanup_scheduler_1 = require("../modules/media/mediaCleanup.scheduler");
const png1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
async function checkCloudinaryAsset(publicId) {
    try {
        const res = await cloudinary_1.default.api.resource(publicId);
        return { exists: true, details: res };
    }
    catch (err) {
        if (err?.http_code === 404 || err?.error?.http_code === 404) {
            return { exists: false };
        }
        return { exists: false, details: err?.message || err };
    }
}
async function runVerification() {
    console.log('======================================================================');
    console.log('  OMEGA SPA POS — CLOUDINARY 30-DAY AUTO CLEANUP VERIFICATION');
    console.log('======================================================================\n');
    // Find prerequisite cleaner and client
    const cleaner = await database_1.default.user.findFirst({ where: { role: { name: 'CLEANER' } } });
    const client = await database_1.default.client.findFirst();
    if (!cleaner || !client) {
        throw new Error('Prerequisite cleaner or client missing in database.');
    }
    const results = {
        test1_cleaning: false,
        test2_attendance: false,
        test3_client_protection: false,
        scheduler: false,
        audit_logs: false,
    };
    // --------------------------------------------------------------------
    // TEST 1: Cleaning Photos 30 Days Cleanup
    // --------------------------------------------------------------------
    console.log('▶ [TEST 1: Cleaning Photos 30 Days Cleanup]');
    console.log('  Step 1 & 2: Creating test CleaningRecord & Uploading photo to Cloudinary...');
    const cleanUpload = await cloudinary_1.default.uploader.upload(png1x1, {
        folder: 'omega-spa/cleaning/proof',
        tags: ['verify-cleaning'],
    });
    const cleaningRecord = await database_1.default.cleaningRecord.create({
        data: {
            area: 'Verification Test Restroom',
            cleanerId: cleaner.id,
            notes: 'Verification test for 30 day auto-cleanup',
            status: 'COMPLETED',
            media: {
                create: [
                    {
                        photoUrl: cleanUpload.secure_url,
                        publicId: cleanUpload.public_id,
                        uploadedBy: cleaner.id,
                    },
                ],
            },
        },
        include: { media: true },
    });
    const mediaRecord = cleaningRecord.media[0];
    console.log('  Step 3: Verification of created asset and database record:');
    console.log('    - Cloudinary URL exists:', cleanUpload.secure_url);
    console.log('    - publicId in DB:', mediaRecord.publicId);
    console.log('    - CleaningMedia record ID:', mediaRecord.id);
    const initialCleanAssetCheck = await checkCloudinaryAsset(cleanUpload.public_id);
    console.log('    - Cloudinary asset status before cleanup:', initialCleanAssetCheck.exists ? 'EXISTS (200 OK)' : 'MISSING');
    console.log('  Step 4: Changing createdAt date to 35 days old (retention expiry)...');
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    await database_1.default.cleaningMedia.update({
        where: { id: mediaRecord.id },
        data: { createdAt: thirtyFiveDaysAgo },
    });
    await database_1.default.cleaningRecord.update({
        where: { id: cleaningRecord.id },
        data: { createdAt: thirtyFiveDaysAgo },
    });
    console.log('  Step 5: Running cleanup function manually...');
    const cleanCleanupResult = await mediaCleanup_service_1.mediaCleanupService.cleanupExpiredCleaningPhotos(30);
    console.log('    - Cleanup result summary:', cleanCleanupResult);
    const cleanMediaInDbAfter = await database_1.default.cleaningMedia.findUnique({ where: { id: mediaRecord.id } });
    const cleanAssetInCloudinaryAfter = await checkCloudinaryAsset(cleanUpload.public_id);
    console.log('  Evaluation:');
    console.log('    - CleaningMedia removed from MySQL:', cleanMediaInDbAfter === null ? 'YES (null)' : 'NO');
    console.log('    - Cloudinary image deleted:', !cleanAssetInCloudinaryAfter.exists ? 'YES (404 Not Found)' : 'NO');
    if (cleanMediaInDbAfter === null && !cleanAssetInCloudinaryAfter.exists) {
        results.test1_cleaning = true;
        console.log('  ✔ TEST 1 PASSED: Cleaning photo & DB record cleanly deleted after 35 days.\n');
    }
    else {
        console.log('  ❌ TEST 1 FAILED\n');
    }
    // Clean up parent record
    await database_1.default.cleaningRecord.delete({ where: { id: cleaningRecord.id } }).catch(() => { });
    // --------------------------------------------------------------------
    // TEST 2: Attendance Photos 30 Days Cleanup
    // --------------------------------------------------------------------
    console.log('▶ [TEST 2: Attendance Photos 30 Days Cleanup]');
    console.log('  Step 1 & 2: Uploading Clock In and Clock Out photos to Cloudinary...');
    const clockInUpload = await cloudinary_1.default.uploader.upload(png1x1, {
        folder: 'omega-spa/attendance/login',
        tags: ['verify-clockin'],
    });
    const clockOutUpload = await cloudinary_1.default.uploader.upload(png1x1, {
        folder: 'omega-spa/attendance/logout',
        tags: ['verify-clockout'],
    });
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    fortyDaysAgo.setHours(0, 0, 0, 0);
    const attendanceRecord = await database_1.default.attendance.create({
        data: {
            employeeId: cleaner.id,
            date: fortyDaysAgo,
            clockInTime: fortyDaysAgo,
            clockInPhoto: clockInUpload.secure_url,
            clockOutTime: fortyDaysAgo,
            clockOutPhoto: clockOutUpload.secure_url,
            status: 'COMPLETED',
            createdAt: fortyDaysAgo,
        },
    });
    console.log('  Step 3: Verification of created attendance and photos:');
    console.log('    - Attendance ID:', attendanceRecord.id);
    console.log('    - Clock-In URL:', attendanceRecord.clockInPhoto);
    console.log('    - Clock-Out URL:', attendanceRecord.clockOutPhoto);
    console.log('    - Attendance date set to 40 days ago:', attendanceRecord.date.toISOString());
    console.log('  Step 4: Running attendance cleanup function...');
    const attCleanupResult = await mediaCleanup_service_1.mediaCleanupService.cleanupExpiredAttendancePhotos(30);
    console.log('    - Cleanup result summary:', attCleanupResult);
    const attendanceInDbAfter = await database_1.default.attendance.findUnique({ where: { id: attendanceRecord.id } });
    const clockInAssetInCloudinaryAfter = await checkCloudinaryAsset(clockInUpload.public_id);
    const clockOutAssetInCloudinaryAfter = await checkCloudinaryAsset(clockOutUpload.public_id);
    console.log('  Evaluation:');
    console.log('    - clockInPhoto field in DB:', attendanceInDbAfter?.clockInPhoto === null ? 'null (UPDATED)' : attendanceInDbAfter?.clockInPhoto);
    console.log('    - clockOutPhoto field in DB:', attendanceInDbAfter?.clockOutPhoto === null ? 'null (UPDATED)' : attendanceInDbAfter?.clockOutPhoto);
    console.log('    - Cloudinary login photo deleted:', !clockInAssetInCloudinaryAfter.exists ? 'YES (404 Not Found)' : 'NO');
    console.log('    - Cloudinary logout photo deleted:', !clockOutAssetInCloudinaryAfter.exists ? 'YES (404 Not Found)' : 'NO');
    if (attendanceInDbAfter?.clockInPhoto === null &&
        attendanceInDbAfter?.clockOutPhoto === null &&
        !clockInAssetInCloudinaryAfter.exists &&
        !clockOutAssetInCloudinaryAfter.exists) {
        results.test2_attendance = true;
        console.log('  ✔ TEST 2 PASSED: Attendance photos deleted from Cloudinary & DB fields set to null.\n');
    }
    else {
        console.log('  ❌ TEST 2 FAILED\n');
    }
    // Clean up test attendance
    await database_1.default.attendance.delete({ where: { id: attendanceRecord.id } }).catch(() => { });
    // --------------------------------------------------------------------
    // TEST 3: Client Before/After Protection
    // --------------------------------------------------------------------
    console.log('▶ [TEST 3: Client Before/After Protection (Permanent Retention)]');
    console.log('  Step 1 & 2: Uploading Before & After treatment photos for Client...');
    const beforeUpload = await cloudinary_1.default.uploader.upload(png1x1, {
        folder: 'omega-spa/clients/before-after',
        tags: ['verify-client-before'],
    });
    const afterUpload = await cloudinary_1.default.uploader.upload(png1x1, {
        folder: 'omega-spa/clients/before-after',
        tags: ['verify-client-after'],
    });
    console.log('  Step 3: Creating ClientMedia records with createdAt = 60 days old...');
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const beforeMedia = await database_1.default.clientMedia.create({
        data: {
            clientId: client.id,
            mediaType: 'BEFORE',
            fileUrl: beforeUpload.secure_url,
            publicId: beforeUpload.public_id,
            createdAt: sixtyDaysAgo,
        },
    });
    const afterMedia = await database_1.default.clientMedia.create({
        data: {
            clientId: client.id,
            mediaType: 'AFTER',
            fileUrl: afterUpload.secure_url,
            publicId: afterUpload.public_id,
            createdAt: sixtyDaysAgo,
        },
    });
    console.log('  Step 4: Running full cleanup job...');
    const fullCleanup = await mediaCleanup_service_1.mediaCleanupService.cleanupExpiredMedia(30);
    console.log('    - Full cleanup stats:', {
        cleaning: fullCleanup.cleaning,
        attendance: fullCleanup.attendance,
    });
    const beforeMediaAfter = await database_1.default.clientMedia.findUnique({ where: { id: beforeMedia.id } });
    const afterMediaAfter = await database_1.default.clientMedia.findUnique({ where: { id: afterMedia.id } });
    const beforeAssetCheckAfter = await checkCloudinaryAsset(beforeUpload.public_id);
    const afterAssetCheckAfter = await checkCloudinaryAsset(afterUpload.public_id);
    console.log('  Evaluation:');
    console.log('    - Client Before DB record preserved:', !!beforeMediaAfter ? 'YES (Record Intact)' : 'NO');
    console.log('    - Client After DB record preserved:', !!afterMediaAfter ? 'YES (Record Intact)' : 'NO');
    console.log('    - Cloudinary Before asset exists:', beforeAssetCheckAfter.exists ? 'YES (200 OK)' : 'NO');
    console.log('    - Cloudinary After asset exists:', afterAssetCheckAfter.exists ? 'YES (200 OK)' : 'NO');
    if (beforeMediaAfter && afterMediaAfter && beforeAssetCheckAfter.exists && afterAssetCheckAfter.exists) {
        results.test3_client_protection = true;
        console.log('  ✔ TEST 3 PASSED: Client treatment photos are permanently protected.\n');
    }
    else {
        console.log('  ❌ TEST 3 FAILED\n');
    }
    // Cleanup test client media
    await cloudinary_1.default.uploader.destroy(beforeUpload.public_id);
    await cloudinary_1.default.uploader.destroy(afterUpload.public_id);
    await database_1.default.clientMedia.deleteMany({ where: { id: { in: [beforeMedia.id, afterMedia.id] } } });
    // --------------------------------------------------------------------
    // SCHEDULER & AUDIT LOG VERIFICATION
    // --------------------------------------------------------------------
    console.log('▶ [SCHEDULER & CONFIGURATION VERIFICATION]');
    console.log('  - Cron Expression:', mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.CRON_EXPRESSION);
    console.log('  - Timezone:', mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.TIMEZONE);
    const schedulerTask = (0, mediaCleanup_scheduler_1.initMediaCleanupScheduler)();
    console.log('  - Scheduler initialization test:', schedulerTask ? 'ACTIVE (node-cron task initialized)' : 'FAILED');
    if (mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.CRON_EXPRESSION === '0 0 * * *' &&
        mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.TIMEZONE === 'Africa/Douala' &&
        !!schedulerTask) {
        results.scheduler = true;
        console.log('  ✔ SCHEDULER VERIFICATION PASSED: Daily midnight (00:00 Africa/Douala).\n');
    }
    console.log('▶ [AUDIT LOGS VERIFICATION]');
    const auditLogs = mediaCleanup_service_1.mediaCleanupService.getAuditLogs(10);
    console.log('  - Total audit logs captured:', auditLogs.length);
    if (auditLogs.length > 0) {
        console.log('  - Sample audit log entry:', JSON.stringify(auditLogs[0], null, 4));
        const hasRequiredFields = auditLogs[0].mediaType &&
            auditLogs[0].publicId &&
            auditLogs[0].deletionDate &&
            auditLogs[0].deletionReason &&
            auditLogs[0].deletedBy === 'SYSTEM';
        if (hasRequiredFields) {
            results.audit_logs = true;
            console.log('  ✔ AUDIT LOGS VERIFICATION PASSED: All required fields present (deletedBy = SYSTEM).\n');
        }
    }
    console.log('======================================================================');
    console.log('  VERIFICATION SUMMARY:');
    console.log('  - Test 1 (Cleaning 30 Days):', results.test1_cleaning ? 'PASSED' : 'FAILED');
    console.log('  - Test 2 (Attendance 30 Days):', results.test2_attendance ? 'PASSED' : 'FAILED');
    console.log('  - Test 3 (Client Protection):', results.test3_client_protection ? 'PASSED' : 'FAILED');
    console.log('  - Scheduler Verification:', results.scheduler ? 'PASSED' : 'FAILED');
    console.log('  - Audit Logs Verification:', results.audit_logs ? 'PASSED' : 'FAILED');
    console.log('======================================================================\n');
    await database_1.default.$disconnect();
}
runVerification().catch(async (err) => {
    console.error('VERIFICATION SCRIPT ERROR:', err);
    await database_1.default.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=verifyCleanupSystem.js.map