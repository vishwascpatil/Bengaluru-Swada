import { Component, AfterViewInit, ViewChildren, QueryList, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoCardComponent } from '../video-card/video-card.component';
import { ReelsService } from '../services/reels.service';
import { Reel } from '../models/reel.model';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-video-feed',
  standalone: true,
  imports: [CommonModule, VideoCardComponent],
  templateUrl: './video-feed.component.html',
  styleUrls: ['./video-feed.component.scss']
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
    private auth: Auth
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
    this.isLoading = true;
    try {
      const fetchedReels = await this.reelsService.getReels(20);

      // Set client-side like/bookmark state based on current user
      const currentUser = this.auth.currentUser;
      if (currentUser) {
        this.reels = fetchedReels.map(reel => ({
          ...reel,
          isLiked: this.reelsService.isLikedByUser(reel, currentUser.uid),
          isBookmarked: this.reelsService.isBookmarkedByUser(reel, currentUser.uid)
        }));
      } else {
        this.reels = fetchedReels;
      }
    } catch (error) {
      console.error('Error loading reels:', error);
    } finally {
      this.isLoading = false;
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
      if (idx === this.currentIndex) c.play();
      else c.pause();
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
}
