export type SocialPlatformId = 'facebook' | 'instagram' | 'tiktok';
export interface SocialAccountStatus {
    id: SocialPlatformId;
    name: string;
    handle: string;
    connected: boolean;
    statusText: string;
    missingKeys?: string[];
    iconColor: string;
}
export interface CreateSocialPostDto {
    caption: string;
    mediaUrl?: string | null;
    mediaUrls?: string[];
    mediaType?: 'PHOTO' | 'VIDEO' | 'TEXT' | 'CAROUSEL';
    platforms: SocialPlatformId[];
    isScheduled?: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
}
export interface PublishResult {
    platform: SocialPlatformId;
    success: boolean;
    postId?: string;
    error?: string;
}
//# sourceMappingURL=social.types.d.ts.map