export interface JwtPayload {
    userId: string;
    role: string;
}
export declare const generateToken: (payload: JwtPayload, expiresIn?: string | number) => string;
export declare const verifyToken: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.d.ts.map