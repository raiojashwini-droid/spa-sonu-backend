import { CreateSocialPostDto, PublishResult } from './social.types';
export declare class SocialService {
    /**
     * Return authentic status of all connected social accounts
     */
    getAccounts(): Promise<import("./social.types").SocialAccountStatus[]>;
    /**
     * Get all social posts from database (ordered by newest first)
     */
    getPosts(): Promise<any>;
    /**
     * Create social media post (Post Now or Schedule)
     */
    createPost(dto: CreateSocialPostDto): Promise<any>;
    /**
     * Execute real publishing across all platforms for a post
     */
    executePublish(postId: string): Promise<{
        post: any;
        results: PublishResult[];
        success: boolean;
        errorMessage: string | null;
    }>;
    /**
     * Trigger immediate publish for a scheduled or failed post
     */
    publishPostNow(postId: string): Promise<{
        post: any;
        results: PublishResult[];
        success: boolean;
        errorMessage: string | null;
    }>;
    /**
     * Delete a post
     */
    deletePost(postId: string): Promise<{
        success: boolean;
    }>;
}
export declare const socialService: SocialService;
//# sourceMappingURL=social.service.d.ts.map