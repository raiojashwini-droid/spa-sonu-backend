import { Request, Response, NextFunction } from 'express';
export declare class ClientsController {
    createClient(req: Request, res: Response, next: NextFunction): Promise<void>;
    getClients(req: Request, res: Response, next: NextFunction): Promise<void>;
    getClientById(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateClient(req: Request, res: Response, next: NextFunction): Promise<void>;
    setClientStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    activateClient(req: Request, res: Response, next: NextFunction): Promise<void>;
    deactivateClient(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteClient(req: Request, res: Response, next: NextFunction): Promise<void>;
    addClientMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
    getClientHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const clientsController: ClientsController;
//# sourceMappingURL=clients.controller.d.ts.map