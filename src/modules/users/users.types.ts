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
  createdAt: Date;
  updatedAt: Date;
}
