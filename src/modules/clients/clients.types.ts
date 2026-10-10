import { ClientSource, MediaType } from '@prisma/client';

export interface CreateClientInput {
  name: string;
  phone: string;
  whatsapp?: string | null;
  quartier?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  source?: ClientSource;
  introducedByEmployeeId?: string | null;
  referredByClientId?: string | null;
  recommendedByName?: string | null;
  recommendedByPhone?: string | null;
}

export interface UpdateClientInput {
  name?: string;
  phone?: string;
  whatsapp?: string | null;
  quartier?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'active' | 'inactive' | string;
  isActive?: boolean;
  lastServiceDate?: string | Date | null;
}

export interface AddClientMediaInput {
  mediaType: MediaType;
  fileUrl: string;
  note?: string | null;
}

export interface ClientQueryFilter {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: string;
  isActive?: boolean | string;
}


export interface AuthContextUser {
  id: string;
  role: string;
}
