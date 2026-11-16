import { Request, Response, NextFunction } from 'express';
export declare class JobSeekersController {
    getJobSeekers(req: Request, res: Response, next: NextFunction): Promise<void>;
    getJobSeekerById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createJobSeeker(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateJobSeeker(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteJobSeeker(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const jobSeekersController: JobSeekersController;
//# sourceMappingURL=job-seekers.controller.d.ts.map