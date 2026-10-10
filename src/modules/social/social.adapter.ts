import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { SocialPlatformId, SocialAccountStatus, PublishResult } from './social.types';

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
export class SocialAdapter {
  private readonly metaAccessToken: string;
  private readonly metaPageId: string;
  private readonly instagramAccountId: string;
  private readonly tiktokAccessToken: string;

  constructor() {
    this.metaAccessToken = env.META_PAGE_ACCESS_TOKEN || '';
    this.metaPageId = env.META_PAGE_ID || '';
    this.instagramAccountId = env.INSTAGRAM_ACCOUNT_ID || '';
    this.tiktokAccessToken = env.TIKTOK_ACCESS_TOKEN || '';
  }

  isFacebookConfigured(): boolean {
    return Boolean(this.metaAccessToken.trim() && this.metaPageId.trim());
  }

  isInstagramConfigured(): boolean {
    return Boolean(this.metaAccessToken.trim() && this.instagramAccountId.trim());
  }

  isTikTokConfigured(): boolean {
    return Boolean(this.tiktokAccessToken.trim());
  }

  getAccountStatuses(): SocialAccountStatus[] {
    const fbOk = this.isFacebookConfigured();
    const fbMissing: string[] = [];
    if (!this.metaAccessToken.trim()) fbMissing.push('META_PAGE_ACCESS_TOKEN');
    if (!this.metaPageId.trim()) fbMissing.push('META_PAGE_ID');

    const igOk = this.isInstagramConfigured();
    const igMissing: string[] = [];
    if (!this.metaAccessToken.trim()) igMissing.push('META_PAGE_ACCESS_TOKEN');
    if (!this.instagramAccountId.trim()) igMissing.push('INSTAGRAM_ACCOUNT_ID');

    return [
      {
        id: 'facebook',
        name: 'Facebook',
        handle: fbOk ? 'OMEGA SPA' : 'Omega Spa Douala',
        connected: fbOk,
        statusText: fbOk ? 'Connected' : 'API Key Required',
        missingKeys: fbMissing,
        iconColor: '#1877F2',
      },
      {
        id: 'instagram',
        name: 'Instagram',
        handle: igOk ? '@omegaspa237' : '@omegaspa237',
        connected: igOk,
        statusText: igOk ? 'Connected' : 'API Key Required',
        missingKeys: igMissing,
        iconColor: '#E1306C',
      },
    ];
  }

  /**
   * Publish post to Facebook Page via Meta Graph API v20.0
   */
  async publishToFacebook(params: {
    caption: string;
    mediaUrl?: string | null;
    mediaUrls?: string[];
  }): Promise<PublishResult> {
    if (!this.isFacebookConfigured()) {
      return {
        platform: 'facebook',
        success: false,
        error: 'Facebook API credentials (META_PAGE_ACCESS_TOKEN, META_PAGE_ID) are not configured in backend .env',
      };
    }

    const { caption, mediaUrl, mediaUrls } = params;
    const allImages = (mediaUrls && mediaUrls.length > 0)
      ? mediaUrls
      : (mediaUrl ? [mediaUrl] : []);

    try {
      // 1. Multi-image / Before-After Carousel Post to Facebook Page
      if (allImages.length > 1) {
        // Upload each photo with published=false to obtain media_fbid
        const mediaFbids: string[] = [];
        for (const imgUrl of allImages) {
          const photoRes = await fetch(
            `https://graph.facebook.com/v20.0/${this.metaPageId}/photos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: imgUrl,
                published: false,
                access_token: this.metaAccessToken,
              }),
            }
          );
          const photoData = (await photoRes.json()) as any;
          if (photoData?.id) {
            mediaFbids.push(photoData.id);
          }
        }

        if (mediaFbids.length === 0) {
          throw new Error('Failed to stage photos on Facebook');
        }

        // Create feed post with attached media
        const attachedMedia = mediaFbids.map((id) => ({ media_fbid: id }));
        const feedRes = await fetch(
          `https://graph.facebook.com/v20.0/${this.metaPageId}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: caption,
              attached_media: attachedMedia,
              access_token: this.metaAccessToken,
            }),
          }
        );
        const feedData = (await feedRes.json()) as any;
        if (feedData.error) {
          throw new Error(feedData.error.message || 'Facebook multi-photo post failed');
        }

        return {
          platform: 'facebook',
          success: true,
          postId: feedData.id,
        };
      }

      // 2. Single Photo Post
      if (allImages.length === 1) {
        const photoRes = await fetch(
          `https://graph.facebook.com/v20.0/${this.metaPageId}/photos`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: allImages[0],
              caption: caption,
              access_token: this.metaAccessToken,
            }),
          }
        );
        const photoData = (await photoRes.json()) as any;
        if (photoData.error) {
          throw new Error(photoData.error.message || 'Facebook photo post failed');
        }

        return {
          platform: 'facebook',
          success: true,
          postId: photoData.id || photoData.post_id,
        };
      }

      // 3. Text-only Post
      const textRes = await fetch(
        `https://graph.facebook.com/v20.0/${this.metaPageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: caption,
            access_token: this.metaAccessToken,
          }),
        }
      );
      const textData = (await textRes.json()) as any;
      if (textData.error) {
        throw new Error(textData.error.message || 'Facebook status post failed');
      }

      return {
        platform: 'facebook',
        success: true,
        postId: textData.id,
      };
    } catch (err: any) {
      logger.error('Facebook publish error:', { error: err?.message || String(err) });
      return {
        platform: 'facebook',
        success: false,
        error: err?.message || 'Facebook API request failed',
      };
    }
  }

  /**
   * Poll Instagram media container until status_code === 'FINISHED'
   * Prevents "Media ID is not available" (Error 9007 / 2207027) while Meta processes the media
   */
  private async waitForInstagramContainerReady(
    containerId: string,
    maxAttempts = 15,
    delayMs = 2000
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${this.metaAccessToken}`
        );
        const data = (await res.json()) as any;

        if (data?.status_code === 'FINISHED') {
          return;
        }

        if (data?.status_code === 'ERROR') {
          throw new Error(data?.status || 'Instagram media processing failed on Meta servers');
        }

        if (data?.error) {
          throw new Error(data.error.message || 'Error checking Instagram container status');
        }
      } catch (err: any) {
        if (
          err.message &&
          (err.message.includes('Instagram media processing') ||
            err.message.includes('Error checking'))
        ) {
          throw err;
        }
        logger.warn(
          `Instagram container status check attempt ${attempt}/${maxAttempts} warning:`,
          { error: err?.message }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(
      'Instagram media container preparation timed out on Meta servers. Please try again.'
    );
  }

  /**
   * Publish post to Instagram Professional/Business via Meta Graph API v20.0
   */
  async publishToInstagram(params: {
    caption: string;
    mediaUrl?: string | null;
    mediaUrls?: string[];
  }): Promise<PublishResult> {
    if (!this.isInstagramConfigured()) {
      return {
        platform: 'instagram',
        success: false,
        error: 'Instagram API credentials (META_PAGE_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID) are not configured in backend .env',
      };
    }

    const { caption, mediaUrl, mediaUrls } = params;
    const allImages = (mediaUrls && mediaUrls.length > 0)
      ? mediaUrls
      : (mediaUrl ? [mediaUrl] : []);

    if (allImages.length === 0) {
      return {
        platform: 'instagram',
        success: false,
        error: 'Instagram requires at least one image or video to publish.',
      };
    }

    try {
      // 1. Multi-image / Before-After Carousel to Instagram
      if (allImages.length > 1) {
        const itemIds: string[] = [];
        for (const imgUrl of allImages) {
          const itemRes = await fetch(
            `https://graph.facebook.com/v20.0/${this.instagramAccountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: imgUrl,
                is_carousel_item: true,
                access_token: this.metaAccessToken,
              }),
            }
          );
          const itemData = (await itemRes.json()) as any;
          if (itemData?.id) {
            itemIds.push(itemData.id);
          }
        }

        if (itemIds.length === 0) {
          throw new Error('Failed to create Instagram carousel item containers');
        }

        // Wait for all child item containers to finish processing on Meta servers
        for (const itemId of itemIds) {
          await this.waitForInstagramContainerReady(itemId);
        }

        // Parent carousel container
        const parentRes = await fetch(
          `https://graph.facebook.com/v20.0/${this.instagramAccountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'CAROUSEL',
              children: itemIds,
              caption: caption,
              access_token: this.metaAccessToken,
            }),
          }
        );
        const parentData = (await parentRes.json()) as any;
        if (!parentData?.id) {
          throw new Error(parentData?.error?.message || 'Failed to create Instagram carousel parent container');
        }

        // Wait for parent carousel container to finish processing
        await this.waitForInstagramContainerReady(parentData.id);

        // Publish container with retry for replication lag
        let publishData: any = null;
        for (let pubAttempt = 1; pubAttempt <= 3; pubAttempt++) {
          const publishRes = await fetch(
            `https://graph.facebook.com/v20.0/${this.instagramAccountId}/media_publish`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creation_id: parentData.id,
                access_token: this.metaAccessToken,
              }),
            }
          );
          publishData = (await publishRes.json()) as any;
          if (!publishData?.error) {
            break;
          }
          const errMsg = publishData.error.message || '';
          if (errMsg.includes('Media ID is not available') && pubAttempt < 3) {
            logger.warn(`Instagram carousel publish retry ${pubAttempt}: Media ID not available yet. Retrying in 2.5s...`);
            await new Promise((resolve) => setTimeout(resolve, 2500));
            continue;
          }
          throw new Error(errMsg || 'Instagram carousel publish failed');
        }

        return {
          platform: 'instagram',
          success: true,
          postId: publishData.id,
        };
      }

      // 2. Single Image to Instagram
      const containerRes = await fetch(
        `https://graph.facebook.com/v20.0/${this.instagramAccountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: allImages[0],
            caption: caption,
            access_token: this.metaAccessToken,
          }),
        }
      );
      const containerData = (await containerRes.json()) as any;
      if (!containerData?.id) {
        throw new Error(containerData?.error?.message || 'Failed to create Instagram media container');
      }

      // Wait for media container to finish processing on Meta servers
      await this.waitForInstagramContainerReady(containerData.id);

      // Publish media container with retry for replication lag
      let publishData: any = null;
      for (let pubAttempt = 1; pubAttempt <= 3; pubAttempt++) {
        const publishRes = await fetch(
          `https://graph.facebook.com/v20.0/${this.instagramAccountId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: containerData.id,
              access_token: this.metaAccessToken,
            }),
          }
        );
        publishData = (await publishRes.json()) as any;
        if (!publishData?.error) {
          break;
        }
        const errMsg = publishData.error.message || '';
        if (errMsg.includes('Media ID is not available') && pubAttempt < 3) {
          logger.warn(`Instagram single image publish retry ${pubAttempt}: Media ID not available yet. Retrying in 2.5s...`);
          await new Promise((resolve) => setTimeout(resolve, 2500));
          continue;
        }
        throw new Error(errMsg || 'Instagram media publish failed');
      }

      return {
        platform: 'instagram',
        success: true,
        postId: publishData.id,
      };
    } catch (err: any) {
      logger.error('Instagram publish error:', { error: err?.message || String(err) });
      return {
        platform: 'instagram',
        success: false,
        error: err?.message || 'Instagram API request failed',
      };
    }
  }

  /**
   * Publish post to TikTok Content Posting API
   */
  async publishToTikTok(params: {
    caption: string;
    mediaUrl?: string | null;
  }): Promise<PublishResult> {
    if (!this.isTikTokConfigured()) {
      return {
        platform: 'tiktok',
        success: false,
        error: 'TikTok API credentials (TIKTOK_ACCESS_TOKEN) are not configured in backend .env',
      };
    }

    try {
      // Direct Post API call to TikTok
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tiktokAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: params.caption,
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: params.mediaUrl,
          },
        }),
      });
      const data = (await res.json()) as any;
      if (data?.error?.code !== 'ok') {
        throw new Error(data?.error?.message || 'TikTok publish error');
      }

      return {
        platform: 'tiktok',
        success: true,
        postId: data?.data?.publish_id,
      };
    } catch (err: any) {
      logger.error('TikTok publish error:', { error: err?.message || String(err) });
      return {
        platform: 'tiktok',
        success: false,
        error: err?.message || 'TikTok API request failed',
      };
    }
  }
}

export const socialAdapter = new SocialAdapter();
