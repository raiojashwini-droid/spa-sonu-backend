import { Request, Response, NextFunction } from 'express';
export declare class ServicesController {
    getServices(req: Request, res: Response, next: NextFunction): Promise<void>;
    getServiceById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createService(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateService(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteService(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const servicesController: ServicesController;
//# sourceMappingURL=services.controller.d.ts.map