import { CreateUserInput, UpdateUserInput, UserResponse, SalaryContractInput, SalaryContractResponse } from './users.types';
export declare class UsersService {
    private formatUser;
    getUsers(): Promise<UserResponse[]>;
    getUserById(id: string): Promise<UserResponse>;
    createUser(input: CreateUserInput): Promise<UserResponse>;
    updateUser(id: string, input: UpdateUserInput): Promise<UserResponse>;
    deleteUser(id: string): Promise<void>;
    updateSalaryContract(userId: string, input: SalaryContractInput): Promise<SalaryContractResponse>;
}
export declare const usersService: UsersService;
//# sourceMappingURL=users.service.d.ts.map