export type SocialPlatformId = 'facebook' | 'instagram' | 'tiktok';

export interface SocialAccountStatus {
  id: SocialPlatformId;
  name: string;
  handle: string;
  connected: boolean;
  statusText: string; // e.g. 'Connected' | 'API Key Required'
  missingKeys?: string[];
  iconColor: string;
}

export interface CreateSocialPostDto {
  caption: string;
  mediaUrl?: string | null;
  mediaUrls?: string[]; // Multiple photos / Before & After
  mediaType?: 'PHOTO' | 'VIDEO' | 'TEXT' | 'CAROUSEL';
  platforms: SocialPlatformId[];
  isScheduled?: boolean;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
}

export interface PublishResult {
  platform: SocialPlatformId;
  success: boolean;
  postId?: string;
  error?: string;
}
