"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialService = exports.SocialService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const social_adapter_1 = require("./social.adapter");
const db = database_1.default;
class SocialService {
    /**
     * Return authentic status of all connected social accounts
     */
    async getAccounts() {
        return social_adapter_1.socialAdapter.getAccountStatuses();
    }
    /**
     * Get all social posts from database (ordered by newest first)
     */
    async getPosts() {
        const rawPosts = await db.socialPost.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return rawPosts.map((p) => {
            let platforms = ['facebook'];
            try {
                platforms = JSON.parse(p.platforms);
            }
            catch {
                platforms = [p.platforms];
            }
            let mediaUrls = [];
            if (p.mediaUrls) {
                try {
                    mediaUrls = JSON.parse(p.mediaUrls);
                }
                catch {
                    mediaUrls = [];
                }
            }
            let platformPostIds = null;
            if (p.platformPostIds) {
                try {
                    platformPostIds = JSON.parse(p.platformPostIds);
                }
                catch {
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
    async createPost(dto) {
        const { caption, mediaUrl, mediaUrls, mediaType = 'PHOTO', platforms, isScheduled, scheduledDate, scheduledTime, } = dto;
        if (!caption && (!mediaUrl && (!mediaUrls || mediaUrls.length === 0))) {
            throw new errorHandler_1.AppError('Post requires at least a caption or media', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (!platforms || platforms.length === 0) {
            throw new errorHandler_1.AppError('Select at least one social media platform', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        let scheduledFor = null;
        if (isScheduled && scheduledDate && scheduledTime) {
            scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`);
            if (isNaN(scheduledFor.getTime())) {
                throw new errorHandler_1.AppError('Invalid scheduled date/time format', constants_1.HTTP_STATUS.BAD_REQUEST);
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
                mediaType: effectiveMediaType,
                platforms: JSON.stringify(platforms),
                status: initialStatus,
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
    async executePublish(postId) {
        const post = await db.socialPost.findUnique({ where: { id: postId } });
        if (!post)
            throw new errorHandler_1.AppError('Post not found', constants_1.HTTP_STATUS.NOT_FOUND);
        // Prevent concurrent execution from overlapping scheduler ticks
        await db.socialPost.update({
            where: { id: postId },
            data: { status: 'PUBLISHING' },
        });
        let platforms = [];
        try {
            platforms = JSON.parse(post.platforms);
        }
        catch {
            platforms = ['facebook'];
        }
        let mediaUrls = [];
        if (post.mediaUrls) {
            try {
                mediaUrls = JSON.parse(post.mediaUrls);
            }
            catch {
                mediaUrls = [];
            }
        }
        let existingPostIds = {};
        if (post.platformPostIds) {
            try {
                existingPostIds = JSON.parse(post.platformPostIds);
            }
            catch {
                existingPostIds = {};
            }
        }
        const results = [];
        const postIds = { ...existingPostIds };
        const errors = [];
        for (const plat of platforms) {
            // If already successfully published to this platform, keep it and skip re-posting
            if (existingPostIds[plat]) {
                results.push({ platform: plat, success: true, postId: existingPostIds[plat] });
                continue;
            }
            let res = { platform: plat, success: false };
            if (plat === 'facebook') {
                res = await social_adapter_1.socialAdapter.publishToFacebook({
                    caption: post.caption,
                    mediaUrl: post.mediaUrl,
                    mediaUrls,
                });
            }
            else if (plat === 'instagram') {
                res = await social_adapter_1.socialAdapter.publishToInstagram({
                    caption: post.caption,
                    mediaUrl: post.mediaUrl,
                    mediaUrls,
                });
            }
            else if (plat === 'tiktok') {
                res = await social_adapter_1.socialAdapter.publishToTikTok({
                    caption: post.caption,
                    mediaUrl: post.mediaUrl,
                });
            }
            results.push(res);
            if (res.success && res.postId) {
                postIds[plat] = res.postId;
            }
            else if (!res.success && res.error) {
                errors.push(`${plat.toUpperCase()}: ${res.error}`);
            }
        }
        const anySuccess = results.some((r) => r.success);
        const updatedStatus = anySuccess ? 'PUBLISHED' : 'FAILED';
        const finalErrorMessage = errors.length > 0 ? errors.join(' | ') : null;
        const updated = await db.socialPost.update({
            where: { id: postId },
            data: {
                status: updatedStatus,
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
    async publishPostNow(postId) {
        return await this.executePublish(postId);
    }
    /**
     * Delete a post
     */
    async deletePost(postId) {
        const post = await db.socialPost.findUnique({ where: { id: postId } });
        if (!post)
            throw new errorHandler_1.AppError('Post not found', constants_1.HTTP_STATUS.NOT_FOUND);
        await db.socialPost.delete({ where: { id: postId } });
        return { success: true };
    }
}
exports.SocialService = SocialService;
exports.socialService = new SocialService();
//# sourceMappingURL=social.service.js.map