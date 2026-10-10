import { AppointmentStatus, AppointmentServiceStatus } from '@prisma/client';

export interface CreateAppointmentServiceItem {
  serviceId: string;
  technicianId?: string;
  price?: number;
}

export interface CreateAppointmentInput {
  clientId: string;
  appointmentDate: string;
  appointmentTime: string;
  mainTechnicianId: string;
  notes?: string | null;
  services: CreateAppointmentServiceItem[];
}

export interface UpdateAppointmentInput {
  appointmentDate?: string;
  appointmentTime?: string;
  mainTechnicianId?: string;
  notes?: string | null;
  lateMinutes?: number | null;
  noShowReason?: string | null;
}

export interface ChangeAppointmentStatusInput {
  status: AppointmentStatus;
  notes?: string | null;
  lateMinutes?: number | null;
  noShowReason?: string | null;
}

export interface AppointmentQueryFilter {
  date?: string;
  technicianId?: string;
  status?: AppointmentStatus;
  clientId?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuthContextUser {
  id: string;
  role: string;
}
