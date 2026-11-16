/**
 * OMEGA SPA POS — Media Retention & Auto Cleanup Automated Test Suite
 *
 * Validates:
 * 1. Cleaning proof photos (>30 days): Deleted from Cloudinary & MySQL CleaningMedia deleted.
 * 2. Attendance photos (>30 days): Deleted from Cloudinary & Attendance clockInPhoto/clockOutPhoto nullified.
 * 3. Client Before/After photos (Permanent): Never deleted, permanently preserved.
 * 4. Audit Log Requirement: System audit logs recorded with all required fields.
 */
export {};
//# sourceMappingURL=testMediaRetention.d.ts.map