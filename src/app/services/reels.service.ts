import { Injectable } from '@angular/core';
import {
    Firestore,
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    limit,
    startAfter,
    where,
    increment,
    arrayUnion,
    arrayRemove,
    Timestamp,
    DocumentSnapshot,
    onSnapshot
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Reel } from '../models/reel.model';
import { Observable, lastValueFrom } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
    providedIn: 'root'
})
export class ReelsService {
    private readonly collectionName = 'reels';

    constructor(private firestore: Firestore, private http: HttpClient, private auth: Auth) { }

    /**
     * Get Trending Reels based on weighted score + time decay
     * Score = (Views * 1) + (Likes * 3) + (Saves * 5)
     * Decay = Score / (HoursSinceUpload + 2)^1.5
     */
    async getTrendingReels(limitCount: number = 20): Promise<Reel[]> {
        try {
            // Fetch a larger pool to sort effectively
            const reelsRef = collection(this.firestore, this.collectionName);
            const q = query(
                reelsRef,
                where('isPublic', '==', true),
                orderBy('createdAt', 'desc'),
                limit(limitCount * 3) // Fetch 3x required to find gems
            );

            const snapshot = await getDocs(q);
            const reels = snapshot.docs.map(doc => {
                const data = doc.data() as Reel;
                // SANITIZE: Rewrite old domain at source
                if (data.videoUrl && data.videoUrl.includes('videos.bengaluru-swada.com')) {
                    data.videoUrl = data.videoUrl.replace('https://videos.bengaluru-swada.com', 'https://r2-video-uploader.bengaluru-swada.workers.dev');
                }
                return { id: doc.id, ...data };
            });

            // Calculate score for each reel
            const now = Date.now();
            const scoredReels = reels.map(reel => {
                const views = reel.viewCount || 0;
                const likes = reel.likes || 0;
                // Assuming bookmarkedBy length is proxy for 'Saves' for now
                const saves = reel.bookmarkedBy?.length || 0;

                const rawScore = (views * 1) + (likes * 3) + (saves * 5);

                // Time Decay
                const createdAt = (reel.createdAt as Timestamp).toDate().getTime();
                const hoursSinceUpload = Math.max(0, (now - createdAt) / (1000 * 60 * 60));

                // Gravity factor: 1.5 ensures newer processing-hot content rises, older content needs massive engagement to stay
                const finalScore = rawScore / Math.pow(hoursSinceUpload + 2, 1.5);

                return { ...reel, _score: finalScore };
            });

            // Sort by Score Descending
            scoredReels.sort((a, b) => b._score - a._score);

            // Pseudo-random reshuffle of top items to keep feed "alive"
            // We take top X and shuffle them slightly so it's not IDENTICAL every refresh
            const topReels = scoredReels.slice(0, limitCount);
            return this.shuffleArray(topReels);

        } catch (error) {
            console.error('Error fetching trending:', error);
            return [];
        }
    }

    /**
     * Get New Arrivals (Strict Chronological + Freshness Window)
     */
    async getNewArrivals(limitCount: number = 20): Promise<Reel[]> {
        const reels = await this.getReels(limitCount); // Reuse basic fetch which is already time-sorted
        return reels;
    }

    private shuffleArray(array: any[]): any[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get paginated reels ordered by creation date
     * @param limitCount Number of reels to fetch
     * @param lastDoc Last document for pagination
     * @returns Promise with array of reels
     */
    async getReels(limitCount: number = 10, lastDoc?: DocumentSnapshot): Promise<Reel[]> {
        try {
            const reelsRef = collection(this.firestore, this.collectionName);
            let q = query(
                reelsRef,
                where('isPublic', '==', true),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Reel));
        } catch (error) {
            console.error('Error fetching reels:', error);
            return [];
        }
    }

    /**
     * Get reels uploaded by a specific user
     * @param userId User ID
     * @returns Promise with array of user's reels
     */
    async getReelsByUser(userId: string): Promise<Reel[]> {
        try {
            const reelsRef = collection(this.firestore, this.collectionName);
            const q = query(
                reelsRef,
                where('uploadedBy', '==', userId),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Reel));
        } catch (error) {
            console.error('Error fetching user reels:', error);
            return [];
        }
    }

    /**
     * Get a single reel by ID
     * @param reelId Reel document ID
     * @returns Promise with reel data
     */
    async getReelById(reelId: string): Promise<Reel | null> {
        try {
            const reelDoc = doc(this.firestore, this.collectionName, reelId);
            const snapshot = await getDoc(reelDoc);

            if (snapshot.exists()) {
                return {
                    id: snapshot.id,
                    ...snapshot.data()
                } as Reel;
            }
            return null;
        } catch (error) {
            console.error('Error fetching reel:', error);
            return null;
        }
    }

    /**
     * Create a new reel
     * @param reelData Reel data to create
     * @returns Promise with created reel ID
     */
    async createReel(reelData: Omit<Reel, 'id'>): Promise<string> {
        try {
            const reelsRef = collection(this.firestore, this.collectionName);
            const docRef = await addDoc(reelsRef, {
                ...reelData,
                isPublic: true,
                createdAt: Timestamp.now(),
                viewCount: 0,
                likes: 0,
                likedBy: [],
                bookmarkedBy: []
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating reel:', error);
            throw error;
        }
    }

    /**
     * Update reel metadata
     * @param reelId Reel document ID
     * @param updates Partial reel data to update
     */
    async updateReel(reelId: string, updates: Partial<Reel>): Promise<void> {
        try {
            const reelDoc = doc(this.firestore, this.collectionName, reelId);
            await updateDoc(reelDoc, updates);
        } catch (error) {
            console.error('Error updating reel:', error);
            throw error;
        }
    }

    /**
     * Delete a reel (Hard Delete: R2 + Firestore)
     * @param reelId Reel document ID
     */
    async deleteReel(reelId: string): Promise<void> {
        try {
            // 1. Get reel data to find video URL
            const reel = await this.getReelById(reelId);
            if (!reel) {
                console.warn('Reel not found, cannot delete');
                return;
            }

            // 2. Extract object key from URL
            // URL formats:
            // "https://r2-video-uploader.bengaluru-swada.workers.dev/videos/uid/filename.mp4"
            // "https://videos.bengaluru-swada.com/filename.mp4" (Old)
            let objectKey = '';
            if (reel.videoUrl) {
                // If it's a worker/cdn URL, we want the path after the domain
                if (reel.videoUrl.includes('bengaluru-swada.workers.dev')) {
                    const domain = 'bengaluru-swada.workers.dev/';
                    const index = reel.videoUrl.indexOf(domain);
                    if (index !== -1) {
                        objectKey = reel.videoUrl.substring(index + domain.length);
                    }
                } else {
                    // Fallback to last part for legacy URLs
                    const urlParts = reel.videoUrl.split('/');
                    objectKey = urlParts[urlParts.length - 1];
                }
            }

            // 3. Delete from R2 (Cloudflare) via Worker
            if (objectKey) {
                try {
                    await lastValueFrom(this.deleteFromR2(objectKey));
                    console.log(`Deleted ${objectKey} from R2`);
                } catch (r2Error) {
                    console.error('Failed to delete from R2, proceeding with DB delete:', r2Error);
                }
            }

            // 4. Delete from Firestore
            const reelDoc = doc(this.firestore, this.collectionName, reelId);
            await deleteDoc(reelDoc);
            console.log('Deleted reel metadata from Firestore');

        } catch (error) {
            console.error('Error deleting reel:', error);
            throw error;
        }
    }

    /**
     * Toggle like on a reel
     * @param reelId Reel document ID
     * @param userId User ID
     * @param isLiked Current like status
     */
    async toggleLike(reelId: string, userId: string, isLiked: boolean): Promise<void> {
        try {
            const reelDoc = doc(this.firestore, this.collectionName, reelId);

            if (isLiked) {
                // Unlike: remove user from likedBy array and decrement count
                await updateDoc(reelDoc, {
                    likedBy: arrayRemove(userId),
                    likes: increment(-1)
                });
            } else {
                // Like: add user to likedBy array and increment count
                await updateDoc(reelDoc, {
                    likedBy: arrayUnion(userId),
                    likes: increment(1)
                });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            throw error;
        }
    }

    /**
     * Toggle bookmark on a reel
     * @param reelId Reel document ID
     * @param userId User ID
     * @param isBookmarked Current bookmark status
     */
    async toggleBookmark(reelId: string, userId: string, isBookmarked: boolean): Promise<void> {
        try {
            const reelDoc = doc(this.firestore, this.collectionName, reelId);

            if (isBookmarked) {
                // Remove bookmark
                await updateDoc(reelDoc, {
                    bookmarkedBy: arrayRemove(userId)
                });
            } else {
                // Add bookmark
                await updateDoc(reelDoc, {
                    bookmarkedBy: arrayUnion(userId)
                });
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            throw error;
        }
    }

    /**
     * Increment view count for a reel
     * @param reelId Reel document ID
     */
    async incrementViewCount(reelId: string): Promise<void> {
        try {
            const reelDoc = doc(this.firestore, this.collectionName, reelId);
            await updateDoc(reelDoc, {
                viewCount: increment(1)
            });
        } catch (error) {
            console.error('Error incrementing view count:', error);
            // Don't throw error for view count - it's not critical
        }
    }

    /**
     * Get real-time updates for reels
     * @param limitCount Number of reels to watch
     * @returns Observable of reels array
     */
    getReelsRealtime(limitCount: number = 10): Observable<Reel[]> {
        return new Observable(observer => {
            const reelsRef = collection(this.firestore, this.collectionName);
            const q = query(
                reelsRef,
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const reels = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Reel));
                    observer.next(reels);
                },
                (error) => {
                    console.error('Error in realtime reels:', error);
                    observer.error(error);
                }
            );

            return () => unsubscribe();
        });
    }

    /**
     * Get a signed upload URL from Cloudflare Worker
     * @param fileName Unique filename
     * @param contentType MIME type of the file
     */
    getUploadUrl(fileName: string, contentType: string): Observable<{ uploadUrl: string, key: string }> {
        return this.http.post<{ uploadUrl: string, key: string }>(
            environment.cloudflare.workerUrl,
            { fileName, contentType }
        );
    }

    /**
     * Upload file directly to R2 using signed URL
     * @param uploadUrl Pre-signed URL
     * @param file File to upload
     */
    uploadToR2(uploadUrl: string, file: File): Observable<any> {
        return this.http.put(uploadUrl, file, {
            headers: { 'Content-Type': file.type },
            reportProgress: true,
            observe: 'events'
        });
    }

    /**
     * Delete file from R2 via Cloudflare Worker
     * @param objectKey Filename/Key to delete
     */
    deleteFromR2(objectKey: string): Observable<any> {
        // Worker expects DELETE /<key>
        return this.http.delete(`${environment.cloudflare.workerUrl}/${objectKey}`);
    }

    /**
     * Check if user has liked a reel
     * @param reel Reel object
     * @param userId User ID
     * @returns boolean indicating if user liked the reel
     */
    isLikedByUser(reel: Reel, userId: string): boolean {
        return reel.likedBy?.includes(userId) || false;
    }

    /**
     * Check if user has bookmarked a reel
     * @param reel Reel object
     * @param userId User ID
     * @returns boolean indicating if user bookmarked the reel
     */
    isBookmarkedByUser(reel: Reel, userId: string): boolean {
        return reel.bookmarkedBy?.includes(userId) || false;
    }


}

