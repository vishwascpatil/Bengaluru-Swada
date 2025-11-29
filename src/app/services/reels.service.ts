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
import { Reel } from '../models/reel.model';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReelsService {
    private readonly collectionName = 'reels';

    constructor(private firestore: Firestore) { }

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
     * Delete a reel
     * @param reelId Reel document ID
     */
    async deleteReel(reelId: string): Promise<void> {
        try {
            const reelDoc = doc(this.firestore, this.collectionName, reelId);
            await deleteDoc(reelDoc);
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
