import { MediaType, AppointmentServiceStatus, AppointmentStatus } from '@prisma/client';

export interface ServiceMediaItemInput {
  mediaType: MediaType;
  fileUrl: string;
  note?: string | null;
}

export interface CompleteServiceInput {
  notes?: string | null;
  media?: ServiceMediaItemInput[];
}

export interface ServiceCompletionResponse {
  id: string;
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  technicianId: string;
  technicianName: string;
  price: number | string;
  status: AppointmentServiceStatus;
  completedAt: Date | null;
  appointmentStatus: AppointmentStatus;
  appointmentCompleted: boolean;
  notes?: string | null;
  media?: Array<{
    id: string;
    mediaType: MediaType;
    fileUrl: string;
    note: string | null;
  }>;
}

export interface AuthContextUser {
  id: string;
  role: string;
}
