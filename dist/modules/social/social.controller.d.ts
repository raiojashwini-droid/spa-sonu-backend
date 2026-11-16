import { Request, Response, NextFunction } from 'express';
export declare class SocialController {
    getAccounts(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getPosts(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createPost(req: Request, res: Response, next: NextFunction): Promise<void>;
    publishPostNow(req: Request, res: Response, next: NextFunction): Promise<void>;
    deletePost(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const socialController: SocialController;
//# sourceMappingURL=social.controller.d.ts.map