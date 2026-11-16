import { SocialAccountStatus, PublishResult } from './social.types';
/**
 * Meta Graph API & Social Media Adapter (v20.0)
 *
 * Implements real API posting for:
 * 1. Facebook Page (Single photo, multi-photo Before/After albums, and feed status)
 * 2. Instagram Professional/Business (Single photo and Before/After carousel containers)
 * 3. TikTok Content Posting API structure
 *
 * Provides live configuration status:
 * If keys are missing, reports honest "API Key Required" status and rejects publish
 * with informative guidance on which keys are needed in backend .env.
 */
export declare class SocialAdapter {
    private readonly metaAccessToken;
    private readonly metaPageId;
    private readonly instagramAccountId;
    private readonly tiktokAccessToken;
    constructor();
    isFacebookConfigured(): boolean;
    isInstagramConfigured(): boolean;
    isTikTokConfigured(): boolean;
    getAccountStatuses(): SocialAccountStatus[];
    /**
     * Publish post to Facebook Page via Meta Graph API v20.0
     */
    publishToFacebook(params: {
        caption: string;
        mediaUrl?: string | null;
        mediaUrls?: string[];
    }): Promise<PublishResult>;
    /**
     * Poll Instagram media container until status_code === 'FINISHED'
     * Prevents "Media ID is not available" (Error 9007 / 2207027) while Meta processes the media
     */
    private waitForInstagramContainerReady;
    /**
     * Publish post to Instagram Professional/Business via Meta Graph API v20.0
     */
    publishToInstagram(params: {
        caption: string;
        mediaUrl?: string | null;
        mediaUrls?: string[];
    }): Promise<PublishResult>;
    /**
     * Publish post to TikTok Content Posting API
     */
    publishToTikTok(params: {
        caption: string;
        mediaUrl?: string | null;
    }): Promise<PublishResult>;
}
export declare const socialAdapter: SocialAdapter;
//# sourceMappingURL=social.adapter.d.ts.map