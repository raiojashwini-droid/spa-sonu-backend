"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const job_seekers_controller_1 = require("./job-seekers.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Authentication required for all job seeker routes
router.use(authMiddleware_1.authMiddleware);
// GET /api/v1/job-seekers - List candidates with search & filters (Manager, Reception)
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => job_seekers_controller_1.jobSeekersController.getJobSeekers(req, res, next));
// GET /api/v1/job-seekers/:id - Candidate details (Manager, Reception)
router.get('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => job_seekers_controller_1.jobSeekersController.getJobSeekerById(req, res, next));
// POST /api/v1/job-seekers - Add new candidate (Manager, Reception)
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => job_seekers_controller_1.jobSeekersController.createJobSeeker(req, res, next));
// PATCH /api/v1/job-seekers/:id - Update candidate status / details (Manager, Reception)
router.patch('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => job_seekers_controller_1.jobSeekersController.updateJobSeeker(req, res, next));
// DELETE /api/v1/job-seekers/:id - Remove candidate (Manager only)
router.delete('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => job_seekers_controller_1.jobSeekersController.deleteJobSeeker(req, res, next));
exports.default = router;
//# sourceMappingURL=job-seekers.routes.js.map