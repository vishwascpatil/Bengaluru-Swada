import { Component, AfterViewInit, ViewChildren, QueryList, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VideoCardComponent } from '../video-card/video-card.component';
import { ReelsService } from '../services/reels.service';
import { LocationService } from '../services/location.service';
import { Reel } from '../models/reel.model';
import { Auth } from '@angular/fire/auth';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-video-feed',
  standalone: true,
  imports: [CommonModule, VideoCardComponent, RouterModule],
  templateUrl: './video-feed.html',
  styleUrls: ['./video-feed.scss']
})
export class VideoFeedComponent implements OnInit, AfterViewInit, OnDestroy {
  reels: Reel[] = [];
  currentIndex = 0;
  touchStartY = 0;
  isLoading = false;

  // Track which videos have been viewed
  private viewedReels = new Set<string>();
  private viewTrackingTimeout?: number;

  @ViewChildren(VideoCardComponent) cards!: QueryList<VideoCardComponent>;

  constructor(
    private reelsService: ReelsService,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private locationService: LocationService
  ) { }

  async ngOnInit() {
    await this.loadReels();
  }

  ngAfterViewInit() {
    // Wait for data to load before playing
    setTimeout(() => {
      if (this.reels.length > 0) {
        this.playCurrent();
        this.trackView();
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.viewTrackingTimeout) {
      clearTimeout(this.viewTrackingTimeout);
    }
  }

  /**
   * Load reels from Firestore
   */
  async loadReels() {
    console.log('[VideoFeed] Starting to load reels...');
    this.isLoading = true;
    try {
      const fetchedReels = await this.reelsService.getReels(20);
      console.log('[VideoFeed] Fetched reels:', fetchedReels.length);

      // Set client-side like/bookmark state based on current user
      const currentUser = this.auth.currentUser;
      console.log('[VideoFeed] Current user:', currentUser?.uid || 'Not logged in');

      // Calculate distances for all reels
      const reelsWithDistance = await Promise.all(
        fetchedReels.map(async (reel) => {
          let distance = '-- km';
          if (reel.latitude && reel.longitude) {
            try {
              distance = await this.locationService.getDistanceFromUser(
                reel.latitude,
                reel.longitude
              );
            } catch (error) {
              console.error('[VideoFeed] Error calculating distance:', error);
            }
          }

          return {
            ...reel,
            distance,
            isLiked: currentUser ? this.reelsService.isLikedByUser(reel, currentUser.uid) : false,
            isBookmarked: currentUser ? this.reelsService.isBookmarkedByUser(reel, currentUser.uid) : false
          };
        })
      );

      this.reels = reelsWithDistance;
      console.log('[VideoFeed] Final reels count:', this.reels.length);
    } catch (error) {
      console.error('[VideoFeed] Error loading reels:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); // Force view update
      console.log('[VideoFeed] Loading complete. isLoading:', this.isLoading);

      // Auto-play the first video after loading
      if (this.reels.length > 0) {
        setTimeout(() => {
          this.playCurrent();
          this.trackView();
        }, 100);
      }
    }
  }

  /**
   * Track video view after 3 seconds
   */
  private trackView() {
    if (this.viewTrackingTimeout) {
      clearTimeout(this.viewTrackingTimeout);
    }

    const currentReel = this.reels[this.currentIndex];
    if (!currentReel || !currentReel.id) return;

    // Only track if not already viewed
    if (!this.viewedReels.has(currentReel.id)) {
      this.viewTrackingTimeout = window.setTimeout(() => {
        if (currentReel.id) {
          this.reelsService.incrementViewCount(currentReel.id);
          this.viewedReels.add(currentReel.id);
          // Update local view count
          currentReel.viewCount = (currentReel.viewCount || 0) + 1;
        }
      }, 3000); // Track view after 3 seconds
    }
  }

  onTouchStart(e: TouchEvent) {
    this.touchStartY = e.touches[0].clientY;
  }

  onTouchEnd(e: TouchEvent) {
    const delta = this.touchStartY - e.changedTouches[0].clientY;
    const threshold = 80;
    if (delta > threshold) this.next();
    else if (delta < -threshold) this.prev();
  }

  playCurrent() {
    this.cards.forEach((c, idx) => {
      if (idx === this.currentIndex) {
        c.play();
      } else if (Math.abs(idx - this.currentIndex) <= 1) {
        // Preload adjacent videos
        c.preload();
      } else {
        c.pause();
      }
    });
  }

  pauseCurrent() {
    this.cards.forEach(c => c.pause());
  }

  next() {
    if (this.currentIndex < this.reels.length - 1) {
      this.currentIndex++;
      this.playCurrent();
      this.trackView();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.playCurrent();
      this.trackView();
    }
  }

  /**
   * Handle like action
   */
  async onLike(index: number) {
    const reel = this.reels[index];
    if (!reel || !reel.id) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.warn('User must be logged in to like');
      return;
    }

    const wasLiked = reel.isLiked || false;

    // Optimistic update
    reel.isLiked = !wasLiked;
    reel.likes = (reel.likes || 0) + (wasLiked ? -1 : 1);

    try {
      await this.reelsService.toggleLike(reel.id, currentUser.uid, wasLiked);
    } catch (error) {
      // Revert on error
      reel.isLiked = wasLiked;
      reel.likes = (reel.likes || 0) + (wasLiked ? 1 : -1);
      console.error('Error toggling like:', error);
    }
  }

  /**
   * Handle bookmark action
   */
  async onBookmark(index: number) {
    const reel = this.reels[index];
    if (!reel || !reel.id) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.warn('User must be logged in to bookmark');
      return;
    }

    const wasBookmarked = reel.isBookmarked || false;

    // Optimistic update
    reel.isBookmarked = !wasBookmarked;

    try {
      await this.reelsService.toggleBookmark(reel.id, currentUser.uid, wasBookmarked);
    } catch (error) {
      // Revert on error
      reel.isBookmarked = wasBookmarked;
      console.error('Error toggling bookmark:', error);
    }
  }

  /**
   * Handle share action
   */
  onShare(index: number) {
    const reel = this.reels[index];
    if (!reel) return;

    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: reel.title,
        text: `Check out ${reel.title} from ${reel.vendor}!`,
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      const shareText = `Check out ${reel.title} from ${reel.vendor}! ₹${reel.price}`;
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying:', err));
    }
  }
  /**
   * Seed sample data for testing
   */
  async seedData() {
    this.isLoading = true;
    const sampleReels = [
      {
        title: 'Masala Dosa',
        vendor: 'CTR',
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Masala_Dosa_with_Chutney_and_Sambar.jpg/1200px-Masala_Dosa_with_Chutney_and_Sambar.jpg',
        price: 120,
        latitude: 12.9352, // Koramangala, Bangalore
        longitude: 77.6245,
        uploadedBy: this.auth.currentUser?.uid || 'system',
        cloudflareVideoId: 'sample-id-1',
        duration: 60,
        createdAt: Timestamp.now(),
        viewCount: 0,
        likes: 0,
        likedBy: [],
        bookmarkedBy: []
      },
      {
        title: 'Idli Vada',
        vendor: 'Brahmins Coffee Bar',
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Idli_Sambar.JPG/1200px-Idli_Sambar.JPG',
        price: 80,
        latitude: 12.9716, // Indiranagar, Bangalore
        longitude: 77.6412,
        uploadedBy: this.auth.currentUser?.uid || 'system',
        cloudflareVideoId: 'sample-id-2',
        duration: 60,
        createdAt: Timestamp.now(),
        viewCount: 0,
        likes: 0,
        likedBy: [],
        bookmarkedBy: []
      }
    ];

    try {
      for (const reel of sampleReels) {
        await this.reelsService.createReel(reel);
      }
      await this.loadReels();
    } catch (error) {
      console.error('Error seeding data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navigate to a specific reel by ID
   * @param reelId The ID of the reel to navigate to
   */
  navigateToReel(reelId: string) {
    console.log(`[VideoFeed] Attempting to navigate to reel: ${reelId}`);
    console.log(`[VideoFeed] Total reels loaded: ${this.reels.length}`);

    if (this.reels.length === 0) {
      console.warn(`[VideoFeed] No reels loaded yet, cannot navigate to ${reelId}`);
      return;
    }

    const index = this.reels.findIndex(r => r.id === reelId);
    if (index !== -1) {
      console.log(`[VideoFeed] Found reel at index ${index}, navigating...`);
      this.currentIndex = index;
      setTimeout(() => {
        this.playCurrent();
        this.trackView();
      }, 100);
      console.log(`[VideoFeed] Successfully navigated to reel: ${reelId}`);
    } else {
      console.warn(`[VideoFeed] Reel not found in loaded reels: ${reelId}`);
      console.log('[VideoFeed] Available reel IDs:', this.reels.map(r => r.id));
    }
  }
}
