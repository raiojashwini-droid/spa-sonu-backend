/**
 * OMEGA SPA POS — Penalties & Conduct Rules Controller
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */
import { Request, Response, NextFunction } from 'express';
declare class PenaltiesController {
    /**
     * GET /api/v1/penalties/rules
     * Fetch standard conduct rules catalog with recommended penalty amounts
     */
    getRules(_req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/penalties
     * Record a new disciplinary infraction penalty (Manager only)
     */
    createPenalty(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/penalties
     * Retrieve penalty records
     * - Manager: Can view all staff penalties or filter by staffId/date/month
     * - Non-Manager: Strictly scoped to their own penalties only
     */
    getPenalties(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /api/v1/penalties/:id
     * Void / delete a mistaken penalty record (Manager only)
     */
    deletePenalty(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const penaltiesController: PenaltiesController;
export {};
//# sourceMappingURL=penalties.controller.d.ts.map