import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { socialAdapter } from './social.adapter';
import { CreateSocialPostDto, SocialPlatformId, PublishResult } from './social.types';

const db: any = prisma;

export class SocialService {
  /**
   * Return authentic status of all connected social accounts
   */
  async getAccounts() {
    return socialAdapter.getAccountStatuses();
  }

  /**
   * Get all social posts from database (ordered by newest first)
   */
  async getPosts() {
    const rawPosts = await db.socialPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rawPosts.map((p: any) => {
      let platforms: SocialPlatformId[] = ['facebook'];
      try {
        platforms = JSON.parse(p.platforms);
      } catch {
        platforms = [p.platforms as SocialPlatformId];
      }

      let mediaUrls: string[] = [];
      if (p.mediaUrls) {
        try {
          mediaUrls = JSON.parse(p.mediaUrls);
        } catch {
          mediaUrls = [];
        }
      }

      let platformPostIds = null;
      if (p.platformPostIds) {
        try {
          platformPostIds = JSON.parse(p.platformPostIds);
        } catch {
          platformPostIds = null;
        }
      }

      const now = new Date();
      const createdAtDate = new Date(p.createdAt);
      const isToday = now.toDateString() === createdAtDate.toDateString();
      const dateStr = isToday
        ? 'Today, ' + createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : createdAtDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
          ', ' +
          createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let scheduledAtStr = null;
      if (p.scheduledFor) {
        const sched = new Date(p.scheduledFor);
        scheduledAtStr =
          sched.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
          ' at ' +
          sched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      return {
        id: p.id,
        caption: p.caption,
        media: p.mediaUrl,
        mediaUrls,
        mediaType: p.mediaType.toLowerCase(),
        platforms,
        status: p.status.toLowerCase(), // 'published' | 'scheduled' | 'failed'
        publishedAt: p.publishedAt ? dateStr : null,
        scheduledAt: scheduledAtStr,
        scheduledDate: p.scheduledFor ? p.scheduledFor.toISOString().split('T')[0] : null,
        scheduledTime: p.scheduledFor
          ? p.scheduledFor.toISOString().split('T')[1].substring(0, 5)
          : null,
        errorMessage: p.errorMessage,
        platformPostIds,
        createdAt: dateStr,
      };
    });
  }

  /**
   * Create social media post (Post Now or Schedule)
   */
  async createPost(dto: CreateSocialPostDto) {
    const {
      caption,
      mediaUrl,
      mediaUrls,
      mediaType = 'PHOTO',
      platforms,
      isScheduled,
      scheduledDate,
      scheduledTime,
    } = dto;

    if (!caption && (!mediaUrl && (!mediaUrls || mediaUrls.length === 0))) {
      throw new AppError('Post requires at least a caption or media', HTTP_STATUS.BAD_REQUEST);
    }

    if (!platforms || platforms.length === 0) {
      throw new AppError('Select at least one social media platform', HTTP_STATUS.BAD_REQUEST);
    }

    let scheduledFor: Date | null = null;
    if (isScheduled && scheduledDate && scheduledTime) {
      scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`);
      if (isNaN(scheduledFor.getTime())) {
        throw new AppError('Invalid scheduled date/time format', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Determine initial status
    const initialStatus = isScheduled ? 'SCHEDULED' : 'PUBLISHING';
    const effectiveMediaType = (mediaUrls && mediaUrls.length > 1) ? 'CAROUSEL' : mediaType;

    const post = await db.socialPost.create({
      data: {
        caption: caption.trim(),
        mediaUrl: mediaUrl || (mediaUrls?.[0] || null),
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        mediaType: effectiveMediaType as any,
        platforms: JSON.stringify(platforms),
        status: initialStatus as any,
        scheduledFor,
      },
    });

    // If Post Now, execute publishing immediately
    if (!isScheduled) {
      return await this.executePublish(post.id);
    }

    return post;
  }

  /**
   * Execute real publishing across all platforms for a post
   */
  async executePublish(postId: string) {
    const post = await db.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);

    // Prevent concurrent execution from overlapping scheduler ticks
    await db.socialPost.update({
      where: { id: postId },
      data: { status: 'PUBLISHING' as any },
    });

    let platforms: SocialPlatformId[] = [];
    try {
      platforms = JSON.parse(post.platforms);
    } catch {
      platforms = ['facebook'];
    }

    let mediaUrls: string[] = [];
    if (post.mediaUrls) {
      try {
        mediaUrls = JSON.parse(post.mediaUrls);
      } catch {
        mediaUrls = [];
      }
    }

    let existingPostIds: Record<string, string> = {};
    if (post.platformPostIds) {
      try {
        existingPostIds = JSON.parse(post.platformPostIds);
      } catch {
        existingPostIds = {};
      }
    }

    const results: PublishResult[] = [];
    const postIds: Record<string, string> = { ...existingPostIds };
    const errors: string[] = [];

    for (const plat of platforms) {
      // If already successfully published to this platform, keep it and skip re-posting
      if (existingPostIds[plat]) {
        results.push({ platform: plat, success: true, postId: existingPostIds[plat] });
        continue;
      }

      let res: PublishResult = { platform: plat, success: false };

      if (plat === 'facebook') {
        res = await socialAdapter.publishToFacebook({
          caption: post.caption,
          mediaUrl: post.mediaUrl,
          mediaUrls,
        });
      } else if (plat === 'instagram') {
        res = await socialAdapter.publishToInstagram({
          caption: post.caption,
          mediaUrl: post.mediaUrl,
          mediaUrls,
        });
      } else if (plat === 'tiktok') {
        res = await socialAdapter.publishToTikTok({
          caption: post.caption,
          mediaUrl: post.mediaUrl,
        });
      }

      results.push(res);
      if (res.success && res.postId) {
        postIds[plat] = res.postId;
      } else if (!res.success && res.error) {
        errors.push(`${plat.toUpperCase()}: ${res.error}`);
      }
    }

    const anySuccess = results.some((r) => r.success);
    const updatedStatus = anySuccess ? 'PUBLISHED' : 'FAILED';
    const finalErrorMessage = errors.length > 0 ? errors.join(' | ') : null;

    const updated = await db.socialPost.update({
      where: { id: postId },
      data: {
        status: updatedStatus as any,
        publishedAt: anySuccess ? new Date() : null,
        errorMessage: finalErrorMessage,
        platformPostIds: Object.keys(postIds).length > 0 ? JSON.stringify(postIds) : null,
      },
    });

    return {
      post: updated,
      results,
      success: anySuccess,
      errorMessage: finalErrorMessage,
    };
  }

  /**
   * Trigger immediate publish for a scheduled or failed post
   */
  async publishPostNow(postId: string) {
    return await this.executePublish(postId);
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string) {
    const post = await db.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new AppError('Post not found', HTTP_STATUS.NOT_FOUND);

    await db.socialPost.delete({ where: { id: postId } });
    return { success: true };
  }
}

export const socialService = new SocialService();
