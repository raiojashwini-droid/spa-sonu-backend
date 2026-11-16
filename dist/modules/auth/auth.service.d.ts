import { LoginInput, LoginResponseData, CurrentUserProfile } from './auth.types';
export declare class AuthService {
    login(input: LoginInput): Promise<LoginResponseData>;
    getCurrentUser(userId: string): Promise<CurrentUserProfile>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map