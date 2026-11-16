import { Request, Response, NextFunction } from 'express';
export declare class SpecialtiesController {
    getSpecialties(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSpecialtyById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createSpecialty(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateSpecialty(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteSpecialty(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const specialtiesController: SpecialtiesController;
//# sourceMappingURL=specialties.controller.d.ts.map