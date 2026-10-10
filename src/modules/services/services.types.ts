import { ServiceStatus } from '@prisma/client';

export interface CreateServiceInput {
  name: string;
  category: string;
  description?: string | null;
  duration: number;
  price: number;
  status?: ServiceStatus;
}

export interface UpdateServiceInput {
  name?: string;
  category?: string;
  description?: string | null;
  duration?: number;
  price?: number;
  status?: ServiceStatus;
}

export interface ServiceQueryFilter {
  category?: string;
  status?: ServiceStatus;
  search?: string;
}
