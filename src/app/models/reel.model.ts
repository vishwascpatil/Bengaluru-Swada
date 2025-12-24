import { Timestamp } from '@angular/fire/firestore';

export interface Reel {
    id?: string;

    // Cloudflare Stream integration
    cloudflareVideoId: string;      // Cloudflare Stream video identifier
    videoUrl: string;                // Cloudflare Stream playback URL (HLS/DASH)
    thumbnailUrl: string;            // Cloudflare-generated thumbnail
    duration: number;                // Video duration in seconds

    // Content metadata
    title: string;
    vendor: string;
    price: number;
    categories: string[];

    // Location data
    latitude: number;                // Reel location latitude
    longitude: number;               // Reel location longitude
    distance?: string;               // Computed distance from user (client-side only)

    // User tracking
    uploadedBy: string;              // User ID who uploaded the reel
    createdAt: Timestamp;            // Upload timestamp

    // Analytics
    viewCount: number;               // Total views

    // Social features
    likes: number;                   // Denormalized like count for quick display
    likedBy: string[];              // Array of user IDs who liked this reel
    bookmarkedBy: string[];         // Array of user IDs who bookmarked this reel

    // Client-side state (not stored in Firestore)
    isLiked?: boolean;              // Current user's like status
    isBookmarked?: boolean;         // Current user's bookmark status
}
