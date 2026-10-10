/**
 * OMEGA SPA POS — Media Types
 * Phase 23: Media Storage Integration
 */

export type MediaCategory =
  | 'CLIENT_BEFORE_AFTER'
  | 'ATTENDANCE_LOGIN'
  | 'ATTENDANCE_LOGOUT'
  | 'CLEANING_PROOF'
  | 'STAFF_PROFILE';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface ClientMediaUploadInput {
  clientId: string;
  mediaType: 'BEFORE' | 'AFTER';
  note?: string;
}

export interface AttendancePhotoUploadInput {
  employeeId?: string;
  type: 'clockIn' | 'clockOut';
  date?: string;
}

export interface CleaningRecordCreateInput {
  area: string;
  taskId?: string;
  notes?: string;
  slot?: 'before' | 'after';
}

export interface CleaningMediaItem {
  id: string;
  url: string;
  publicId?: string | null;
}

export interface CleaningRecordResponse {
  id: string;
  cleanerId: string;
  cleanerName: string;
  area: string;
  photo?: string | null;
  beforePhoto?: string | null;
  afterPhoto?: string | null;
  photos: CleaningMediaItem[];
  photoCount: number;
  note?: string | null;
  date: string;
  time: string;
  createdAt: Date;
}

