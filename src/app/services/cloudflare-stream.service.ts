import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

export interface CloudflareVideoMetadata {
    uid: string;
    status: {
        state: string;
        pctComplete: string;
    };
    meta: {
        name: string;
    };
    created: string;
    modified: string;
    size: number;
    preview: string;
    allowedOrigins: string[];
    requireSignedURLs: boolean;
    uploaded: string;
    uploadExpiry: string | null;
    maxSizeBytes: number;
    maxDurationSeconds: number;
    duration: number;
    input: {
        width: number;
        height: number;
    };
    playback: {
        hls: string;
        dash: string;
    };
    watermark: any;
}

export interface CloudflareUploadResponse {
    result: {
        uid: string;
        uploadURL: string;
    };
    success: boolean;
    errors: any[];
    messages: any[];
}

@Injectable({
    providedIn: 'root'
})
export class CloudflareStreamService {
    private readonly accountId = environment.cloudflare?.accountId || '';
    private readonly apiToken = environment.cloudflare?.streamApiToken || '';
    private readonly baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;

    constructor() { }

    /**
     * Upload a video file to Cloudflare Stream using TUS resumable upload
     * @param file Video file to upload
     * @param metadata Additional metadata for the video
     * @returns Promise with Cloudflare video ID
     */
    async uploadVideo(file: File, metadata?: { name?: string }): Promise<string> {
        try {
            // Step 1: Get direct upload URL from Cloudflare
            const uploadUrlResponse = await fetch(`${this.baseUrl}/direct_upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    maxDurationSeconds: 300, // 5 minutes max
                    requireSignedURLs: false,
                    meta: {
                        name: metadata?.name || file.name
                    }
                })
            });

            if (!uploadUrlResponse.ok) {
                throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
            }

            const uploadData: CloudflareUploadResponse = await uploadUrlResponse.json();

            if (!uploadData.success) {
                throw new Error('Failed to create upload URL');
            }

            const { uid, uploadURL } = uploadData.result;

            // Step 2: Upload the video file using TUS protocol
            const uploadResponse = await fetch(uploadURL, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload video: ${uploadResponse.statusText}`);
            }

            return uid;
        } catch (error) {
            console.error('Error uploading video to Cloudflare Stream:', error);
            throw error;
        }
    }

    /**
     * Get video details from Cloudflare Stream
     * @param videoId Cloudflare video ID
     * @returns Promise with video metadata
     */
    async getVideoDetails(videoId: string): Promise<CloudflareVideoMetadata> {
        try {
            const response = await fetch(`${this.baseUrl}/${videoId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get video details: ${response.statusText}`);
            }

            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    }

    /**
     * Get HLS playback URL for a video
     * @param videoId Cloudflare video ID
     * @returns HLS manifest URL
     */
    getStreamUrl(videoId: string): string {
        return `https://customer-${this.getCustomerCode()}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
    }

    /**
     * Get thumbnail URL for a video
     * @param videoId Cloudflare video ID
     * @param time Optional timestamp in seconds for thumbnail
     * @returns Thumbnail URL
     */
    getThumbnailUrl(videoId: string, time?: number): string {
        const timeParam = time ? `?time=${time}s` : '';
        return `https://customer-${this.getCustomerCode()}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg${timeParam}`;
    }

    /**
     * Delete a video from Cloudflare Stream
     * @param videoId Cloudflare video ID
     */
    async deleteVideo(videoId: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete video: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            throw error;
        }
    }

    /**
     * Check if video is ready for playback
     * @param videoId Cloudflare video ID
     * @returns Promise<boolean> indicating if video is ready
     */
    async isVideoReady(videoId: string): Promise<boolean> {
        try {
            const details = await this.getVideoDetails(videoId);
            return details.status.state === 'ready';
        } catch (error) {
            console.error('Error checking video status:', error);
            return false;
        }
    }

    /**
     * Poll video status until it's ready or timeout
     * @param videoId Cloudflare video ID
     * @param maxAttempts Maximum number of polling attempts
     * @param intervalMs Interval between polls in milliseconds
     */
    async waitForVideoReady(videoId: string, maxAttempts = 30, intervalMs = 2000): Promise<CloudflareVideoMetadata> {
        for (let i = 0; i < maxAttempts; i++) {
            const details = await this.getVideoDetails(videoId);

            if (details.status.state === 'ready') {
                return details;
            }

            if (details.status.state === 'error') {
                throw new Error('Video processing failed');
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error('Video processing timeout');
    }

    /**
     * Extract customer code from account ID or use placeholder
     * This is a simplified version - in production, you'd get this from Cloudflare
     */
    private getCustomerCode(): string {
        // The customer code is typically part of your Cloudflare Stream subdomain
        // For now, we'll use a placeholder that should be configured in environment
        return environment.cloudflare?.customerCode || 'CUSTOMER_CODE';
    }
}
