export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string | null;
  username?: string;
  role: string;
  password?: string;
  specialties?: string[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
  username?: string;
  role?: string;
  password?: string;
  specialties?: string[];
  active?: boolean;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  username: string;
  role: string;
  specialties: string[];
  active: boolean;
  salaryContract?: {
    monthlyTarget: number;
    basePay: number;
    commissionRate: number;
    fixedSalary: number;
    targetScope: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryContractInput {
  monthlyTarget: number;
  basePay: number;
  commissionRate: number;
  fixedSalary: number;
  targetScope?: 'INDIVIDUAL' | 'SPA_TOTAL';
}

export interface SalaryContractResponse {
  userId: string;
  staffName: string;
  monthlyTarget: number;
  basePay: number;
  commissionRate: number;
  fixedSalary: number;
  targetScope: string;
  advisoryWarning?: string | null;
}

