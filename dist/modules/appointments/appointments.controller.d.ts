import { Request, Response, NextFunction } from 'express';
export declare class AppointmentsController {
    createAppointment(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAppointments(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAppointmentById(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void>;
    changeAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const appointmentsController: AppointmentsController;
//# sourceMappingURL=appointments.controller.d.ts.map