import { Component, AfterViewInit, ViewChildren, QueryList, OnInit, OnDestroy, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';

declare const window: any;
declare const confirm: any;
declare const alert: any;
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
export class VideoFeedComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() isActive: boolean = true;
  activeTab: 'all' | 'trending' | 'new' = 'all';

  isGlobalMuted = true;
  reels: Reel[] = [];
  currentIndex = 0;

  // Touch Handling
  touchStartY = 0;
  touchStartX = 0;
  pullStartY = 0;
  pullMoveY = 0;
  isRefreshing = false;
  private hasTriggeredHaptic = false;
  readonly pullThreshold = 80; // Lowered from 150 for easier trigger
  readonly swipeThresholdX = 50; // Horizontal swipe threshold

  isLoading = true; // Start true for skeleton

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
    // 2. NETWORK UPDATE: Fetch fresh content silently
    await this.loadReels();
  }

  ngAfterViewInit() {
    // Removed redundant trackView timeout
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isActive']) {
      // Logic handled by [active] input propagation to children
    }
  }

  onMuteChanged(muted: boolean) {
    this.isGlobalMuted = muted;
  }

  ngOnDestroy() {
    if (this.viewTrackingTimeout) {
      clearTimeout(this.viewTrackingTimeout);
    }
  }

  /**
   * Reload reels when location changes
   */
  async reloadReelsForNewLocation() {
    console.log('[VideoFeed] Reloading reels for new location...');
    const currentReels = [...this.reels];

    // Recalculate distances for current reels
    const reelsWithUpdatedDistances = await Promise.all(
      currentReels.map(async (reel) => {
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
          distance
        };
      })
    );

    // Sort reels if on 'all' tab, otherwise just update distances
    if (this.activeTab === 'all') {
      reelsWithUpdatedDistances.sort((a, b) => {
        const distA = a.distance === '-- km' ? Infinity : parseFloat(a.distance.split(' ')[0]);
        const distB = b.distance === '-- km' ? Infinity : parseFloat(b.distance.split(' ')[0]);
        return distA - distB;
      });
    }

    this.reels = reelsWithUpdatedDistances;
    this.currentIndex = 0;
    this.cdr.detectChanges();
  }

  isOwner(reel: Reel): boolean {
    return this.auth.currentUser?.uid === reel.uploadedBy;
  }

  async onReelDeleted(reel: Reel) {
    if (!confirm('Are you sure you want to delete this reel permanently?')) return;

    try {
      await this.reelsService.deleteReel(reel.id!);
      // Remove from local list
      this.reels = this.reels.filter(r => r.id !== reel.id);

      // Adjust index if needed
      if (this.currentIndex >= this.reels.length) {
        this.currentIndex = Math.max(0, this.reels.length - 1);
      }
    } catch (error) {
      console.error('Failed to delete reel:', error);
      alert('Failed to delete reel. Please try again.');
    }
  }

  async switchTab(tab: 'all' | 'trending' | 'new') {
    if (this.activeTab === tab) return;

    this.activeTab = tab;
    this.reels = []; // Clear current list to triggers skeleton
    this.currentIndex = 0;
    this.isLoading = true;

    await this.loadReels();
  }

  async loadReels() {
    console.log(`[VideoFeed] Loading ${this.activeTab} reels...`);
    this.isLoading = true;
    try {
      let fetchedReels: Reel[] = [];

      if (this.activeTab === 'trending') {
        fetchedReels = await this.reelsService.getTrendingReels(20);
      } else if (this.activeTab === 'new') {
        fetchedReels = await this.reelsService.getNewArrivals(20);
      } else {
        // 'all' tab - fetch more to ensure good proximity variety
        fetchedReels = await this.reelsService.getReels(50);
      }

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

      // If it's the 'all' tab, sort strictly by proximity
      if (this.activeTab === 'all') {
        reelsWithDistance.sort((a, b) => {
          const distA = a.distance === '-- km' ? Infinity : parseFloat(a.distance.split(' ')[0]);
          const distB = b.distance === '-- km' ? Infinity : parseFloat(b.distance.split(' ')[0]);
          return distA - distB;
        });
      }

      this.reels = reelsWithDistance;
      console.log('[VideoFeed] Final reels count:', this.reels.length);
    } catch (error) {
      console.error('[VideoFeed] Error loading reels:', error);
    } finally {
      setTimeout(() => {
        this.isLoading = false;
        this.cdr.detectChanges();

        if (this.reels.length > 0) {
          this.trackView();
        }
      }, 50);
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

  // Pull to refresh variables are already defined above

  onTouchStart(e: any) {
    this.touchStartY = e.touches[0].clientY;
    this.touchStartX = e.touches[0].clientX;

    // Pull to refresh logic (vertical)
    if (this.currentIndex === 0 && !this.isRefreshing) {
      this.pullStartY = e.touches[0].clientY;
      this.hasTriggeredHaptic = false;
    }
  }

  onTouchMove(e: any) {
    // Vertical / Pull Logic
    if (this.currentIndex === 0 && !this.isRefreshing && this.pullStartY > 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - this.pullStartY;
      if (diff > 0) {
        this.pullMoveY = diff * 0.5;
        if (diff > 10 && e.cancelable) e.preventDefault(); // Lock scroll for PTR

        // Instagram-style tactile feedback when threshold is reached
        if (this.pullMoveY >= this.pullThreshold && !this.hasTriggeredHaptic) {
          this.hasTriggeredHaptic = true;
          if ((navigator as any).vibrate) {
            (navigator as any).vibrate(15); // Light tactile tick
          }
        } else if (this.pullMoveY < this.pullThreshold && this.hasTriggeredHaptic) {
          // Reset if they pull back up
          this.hasTriggeredHaptic = false;
        }
      }
    }
  }

  async onTouchEnd(e: any) {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;

    const deltaY = this.touchStartY - endY;
    const deltaX = this.touchStartX - endX; // Positive = Swipe Left, Negative = Swipe Right

    // Horizontal Swipe (Tab Switch)
    // Ensure it's mostly horizontal swipe
    if (Math.abs(deltaX) > this.swipeThresholdX && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swipe Left -> Go Right
        if (this.activeTab === 'all') this.switchTab('trending');
        else if (this.activeTab === 'trending') this.switchTab('new');
      } else {
        // Swipe Right -> Go Left
        if (this.activeTab === 'new') this.switchTab('trending');
        else if (this.activeTab === 'trending') this.switchTab('all');
      }
      return; // Exit if handled as swipe
    }

    // Vertical Swipe (Video Navigation)
    const thresholdY = 80;
    if (deltaY > thresholdY) {
      this.next();
    } else if (deltaY < -thresholdY) {
      // Only prev if not PTR
      if (this.pullMoveY < this.pullThreshold) {
        this.prev();
      }
    }

    // Handle pull-to-refresh
    // console.log('[VideoFeed] PTR check:', this.pullMoveY, '>=', this.pullThreshold);
    if (this.pullMoveY >= this.pullThreshold && !this.isRefreshing) {
      console.log('[VideoFeed] Refresh triggered!');
      await this.refresh();
    }

    // Reset pull state
    this.pullStartY = 0;
    this.pullMoveY = 0;
    this.hasTriggeredHaptic = false;
  }

  /**
   * Public method to scroll to the first reel and refresh the feed with an animation
   */
  async scrollToTopAndRefresh() {
    console.log('[VideoFeed] Animated scroll to top and refreshing...');

    if (this.currentIndex > 0) {
      this.isGlobalMuted = true;
      const steps = this.currentIndex;
      // Faster animation if user scrolled deep
      const delay = Math.max(30, 80 - (steps * 2));

      for (let i = steps - 1; i >= 0; i--) {
        this.currentIndex = i;
        this.cdr.detectChanges();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    await this.refresh();
  }

  async refresh() {
    this.isRefreshing = true;
    // Haptic feedback if available
    if ((navigator as any).vibrate) {
      (navigator as any).vibrate(50);
    }

    try {
      await this.loadReels();
    } finally {
      // Small delay to show completion state
      setTimeout(() => {
        this.isRefreshing = false;
      }, 500);
    }
  }

  // Removed playCurrent/pauseCurrent/next/prev calls that manually triggered playback
  // Playback is now driven by [active] input binding in the template

  next() {
    if (this.currentIndex < this.reels.length - 1) {
      this.isGlobalMuted = true;
      this.currentIndex++;
      this.trackView();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.isGlobalMuted = true;
      this.currentIndex--;
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
    if ((navigator as any).share) {
      (navigator as any).share({
        title: reel.title,
        text: `Check out ${reel.title} from ${reel.vendor}!`,
        url: window.location.href
      }).catch((err: any) => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      const shareText = `Check out ${reel.title} from ${reel.vendor}! ₹${reel.price}`;
      (navigator as any).clipboard.writeText(shareText)
        .then(() => console.log('Link copied to clipboard!'))
        .catch((err: any) => console.error('Error copying:', err));
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
        videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        thumbnailUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=2070&auto=format&fit=crop',
        price: 120,
        categories: ['South Indian', 'Breakfast'],
        latitude: 12.9352, // Kormangala, Bangalore
        longitude: 77.6245,
        uploadedBy: this.auth.currentUser?.uid || 'system',
        cloudflareVideoId: 'sample-id-1',
        duration: 596,
        createdAt: Timestamp.now(),
        viewCount: 0,
        likes: 0,
        likedBy: [],
        bookmarkedBy: []
      },
      {
        title: 'Filter Coffee',
        vendor: 'Brahmins Coffee Bar',
        videoUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Idli_Sambar.JPG/1200px-Idli_Sambar.JPG',
        price: 80,
        categories: ['South Indian', 'Beverages'],
        latitude: 12.9716, // Indiranagar, Bangalore
        longitude: 77.6412,
        uploadedBy: this.auth.currentUser?.uid || 'system',
        cloudflareVideoId: 'sample-id-2',
        duration: 600,
        createdAt: Timestamp.now(),
        viewCount: 0,
        likes: 0,
        likedBy: [],
        bookmarkedBy: []
      }
    ];

    try {
      for (const reel of sampleReels) {
        await this.reelsService.createReel(reel as any);
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
      this.isGlobalMuted = true; // Reset to muted default
      setTimeout(() => {
        // Playback driven by [active]
        this.trackView();
      }, 100);
      console.log(`[VideoFeed] Successfully navigated to reel: ${reelId}`);
    } else {
      console.warn(`[VideoFeed] Reel not found in loaded reels: ${reelId}`);
      console.log('[VideoFeed] Available reel IDs:', this.reels.map(r => r.id));
    }
  }
  /**
   * Get priority for video loading/preloading
   * @param index Index of the reel
   */
  getPriority(index: number): 'high' | 'auto' | 'low' {
    const diff = Math.abs(index - this.currentIndex);
    if (diff === 0) return 'high';
    if (diff <= 2) return 'auto'; // Preload next 2 videos (Aggressive)
    return 'low';
  }

  /**
   * TrackBy function for ngFor
   */
  trackByReelId(index: number, reel: Reel): string {
    return reel.id || index.toString();
  }
}
