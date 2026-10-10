export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUserData {
  id: string;
  email: string;
  phone?: string | null;
  role: string;
  name?: string;
}

export interface LoginResponseData {
  token: string;
  user: AuthUserData;
}

export interface CurrentUserProfile {
  id: string;
  email: string;
  phone?: string | null;
  role: string;
  staffProfile: {
    id: string;
    name: string;
    phone: string | null;
    specialties: unknown;
  } | null;
}
