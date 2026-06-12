import {
  Component, AfterViewInit, ViewChildren, QueryList, OnInit, OnDestroy,
  ChangeDetectorRef, Input, OnChanges, SimpleChanges, Inject, ChangeDetectionStrategy, NgZone
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

declare const window: any;
declare const confirm: any;
declare const alert: any;
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VideoCardComponent } from '../video-card/video-card.component';
import { ReelsService } from '../services/reels.service';
import { LocationService } from '../services/location.service';
import { Reel } from '../models/reel.model';
import { Auth } from '@angular/fire/auth';
import { Timestamp } from '@angular/fire/firestore';
import { AdmobService } from '../services/admob.service';
import { VideoFeedSkeletonComponent } from './video-feed-skeleton.component';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AudioMutexService } from '../services/audio-mutex.service';

@Component({
  selector: 'app-video-feed',
  standalone: true,
  imports: [CommonModule, VideoCardComponent, RouterModule, VideoFeedSkeletonComponent],
  templateUrl: './video-feed.html',
  styleUrls: ['./video-feed.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoFeedComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() isActive: boolean = true;
  activeTab: 'explore' | 'new' | 'near' = 'explore';

  isGlobalMuted = true;
  reels: Reel[] = [];
  currentIndex = 0;

  /**
   * Virtual window: only the 3 visible cards (prev, current, next) are rendered.
   * This is the CRITICAL fix for stutter — Angular never has to manage 50 video elements.
   */
  get visibleReels(): Array<{ reel: Reel; index: number; relativeIndex: number }> {
    const result: Array<{ reel: Reel; index: number; relativeIndex: number }> = [];
    const lo = Math.max(0, this.currentIndex - 1);
    const hi = Math.min(this.reels.length - 1, this.currentIndex + 1);
    for (let i = lo; i <= hi; i++) {
      result.push({
        reel: this.reels[i],
        index: i,
        relativeIndex: i - this.currentIndex
      });
    }
    return result;
  }

  // Touch Handling
  touchStartY = 0;
  touchStartX = 0;
  pullStartY = 0;
  pullMoveY = 0;
  isRefreshing = false;
  swipeDeltaY = 0;
  isSwiping = false;
  private hasTriggeredHaptic = false;
  readonly pullThreshold = 80;
  readonly swipeThresholdX = 50;

  isLoading = true;

  private viewedReels = new Set<string>();
  private viewTrackingTimeout?: number;
  private adsViewed = 0;
  private readonly INTERSTITIAL_THRESHOLD = 7;

  @ViewChildren(VideoCardComponent) cards!: QueryList<VideoCardComponent>;

  private appStateListener: any;
  private visibilityChangeHandler: any;

  constructor(
    private reelsService: ReelsService,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private locationService: LocationService,
    private router: Router,
    private admobService: AdmobService,
    private ngZone: NgZone,
    private audioMutex: AudioMutexService,
    @Inject(DOCUMENT) private document: any
  ) { }

  private centerActiveTab() {
    setTimeout(() => {
      const activeTabEl = this.document.querySelector('.tab-item.active');
      activeTabEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
  }

  async ngOnInit() {
    await this.loadReels();
    this.admobService.showBanner();
    this.setupAppLifecycle();
  }

  goToSearch() { this.router.navigate(['/search']); }
  goToProfile() { this.router.navigate(['/profile']); }

  ngAfterViewInit() {
    this.centerActiveTab();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isActive']) {
      if (this.isActive) {
        // Acquire the audio mutex — this silences any other tab playing audio
        this.audioMutex.acquire('feed', () => {
          // We were silenced by another component — mute all our cards
          this.isGlobalMuted = true;
          this.pauseActiveCard();
          this.cdr.markForCheck();
        });
      } else {
        // We are being hidden — immediately silence everything
        this.isGlobalMuted = true;
        this.pauseActiveCard();
        this.audioMutex.release('feed');
        this.cdr.markForCheck();
      }
    }
  }

  ngOnDestroy() {
    if (this.viewTrackingTimeout) clearTimeout(this.viewTrackingTimeout);
    this.admobService.hideBanner();
    // Remove app lifecycle listeners
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    if (this.visibilityChangeHandler) {
      this.document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  /**
   * Android/iOS: pause video when app goes to background, resume on foreground.
   * This prevents audio playing after the user presses the home button.
   */
  private setupAppLifecycle() {
    if (Capacitor.isNativePlatform()) {
      // Native Capacitor: use App plugin for reliable foreground/background detection
      App.addListener('appStateChange', (state: { isActive: boolean }) => {
        this.ngZone.run(() => {
          if (!state.isActive) {
            // App went to background — pause the active card
            this.pauseActiveCard();
          } else {
            // App came back to foreground — resume if feed is visible
            if (this.isActive) {
              this.resumeActiveCard();
            }
          }
        });
      }).then(listener => {
        this.appStateListener = listener;
      });
    } else {
      // Web fallback: visibilitychange (also works in Capacitor for some cases)
      this.visibilityChangeHandler = () => {
        if (this.document.hidden) {
          this.pauseActiveCard();
        } else if (this.isActive) {
          this.resumeActiveCard();
        }
      };
      this.document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  pauseActiveCard() {
    const activeCards = this.cards?.toArray();
    if (activeCards) {
      activeCards.forEach(card => card.pause());
    }
  }

  resumeActiveCard() {
    const activeCards = this.cards?.toArray();
    const active = activeCards?.find(c => (c as any).active);
    active?.play();
  }

  onMuteChanged(muted: boolean) {
    this.isGlobalMuted = muted;
  }

  isOwner(reel: Reel): boolean {
    return this.auth.currentUser?.uid === reel.uploadedBy;
  }

  async onReelDeleted(reel: Reel) {
    if (!confirm('Delete this reel permanently?')) return;
    try {
      await this.reelsService.deleteReel(reel.id!);
      this.reels = this.reels.filter(r => r.id !== reel.id);
      if (this.currentIndex >= this.reels.length) {
        this.currentIndex = Math.max(0, this.reels.length - 1);
      }
      this.cdr.markForCheck();
    } catch {
      alert('Failed to delete reel. Please try again.');
    }
  }

  async switchTab(tab: 'explore' | 'new' | 'near') {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.reels = [];
    this.currentIndex = 0;
    this.isLoading = true;
    this.cdr.markForCheck();
    this.centerActiveTab();
    await this.loadReels();
  }

  async loadReels() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      let fetchedReels: Reel[] = [];

      if (this.activeTab === 'new') {
        fetchedReels = await this.reelsService.getNewArrivals(20);
      } else {
        fetchedReels = await this.reelsService.getReels(50);
        if (this.activeTab === 'explore') {
          // Fisher-Yates shuffle
          for (let i = fetchedReels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fetchedReels[i], fetchedReels[j]] = [fetchedReels[j], fetchedReels[i]];
          }
        }
      }

      const currentUser = this.auth.currentUser;

      // Calculate distances in parallel — but don't block UI
      const reelsWithDistance = await Promise.all(
        fetchedReels.map(async (reel) => {
          let distance = '';
          if (reel.latitude && reel.longitude) {
            try {
              distance = await this.locationService.getDistanceFromUser(reel.latitude, reel.longitude);
            } catch { }
          }
          return {
            ...reel,
            distance,
            isLiked: currentUser ? this.reelsService.isLikedByUser(reel, currentUser.uid) : false,
            isBookmarked: currentUser ? this.reelsService.isBookmarkedByUser(reel, currentUser.uid) : false
          };
        })
      );

      if (this.activeTab === 'near') {
        reelsWithDistance.sort((a, b) => {
          const da = parseFloat((a.distance || '9999').replace(/[^\d.]/g, '')) || 9999;
          const db = parseFloat((b.distance || '9999').replace(/[^\d.]/g, '')) || 9999;
          return da - db;
        });
      }

      this.reels = reelsWithDistance;
    } catch (error) {
      console.error('[VideoFeed] Error loading reels:', error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();

      if (this.reels.length > 0) {
        setTimeout(() => this.trackView(), 100);
      }
    }
  }

  private trackView() {
    if (this.viewTrackingTimeout) clearTimeout(this.viewTrackingTimeout);
    const reel = this.reels[this.currentIndex];
    if (!reel?.id || this.viewedReels.has(reel.id)) return;

    this.viewTrackingTimeout = window.setTimeout(() => {
      if (reel.id) {
        this.reelsService.incrementViewCount(reel.id);
        this.viewedReels.add(reel.id);
        reel.viewCount = (reel.viewCount || 0) + 1;
        this.adsViewed++;
        if (this.adsViewed >= this.INTERSTITIAL_THRESHOLD) {
          this.admobService.showInterstitial();
          this.adsViewed = 0;
        }
      }
    }, 3000);
  }

  // ─── Touch Handling ─────────────────────────────────────────────────────

  onTouchStart(e: any) {
    this.touchStartY = e.touches[0].clientY;
    this.touchStartX = e.touches[0].clientX;

    if (this.currentIndex === 0 && !this.isRefreshing) {
      this.pullStartY = e.touches[0].clientY;
      this.hasTriggeredHaptic = false;
    }

    this.swipeDeltaY = 0;
    this.isSwiping = false;
  }

  onTouchMove(e: any) {
    const currentY = e.touches[0].clientY;
    const diffY = currentY - this.touchStartY;

    // Pull-to-refresh
    if (this.currentIndex === 0 && !this.isRefreshing && this.pullStartY > 0) {
      const diff = currentY - this.pullStartY;
      if (diff > 0) {
        this.pullMoveY = diff * 0.5;
        if (diff > 10 && e.cancelable) e.preventDefault();

        if (this.pullMoveY >= this.pullThreshold && !this.hasTriggeredHaptic) {
          this.hasTriggeredHaptic = true;
          (navigator as any).vibrate?.(15);
        } else if (this.pullMoveY < this.pullThreshold && this.hasTriggeredHaptic) {
          this.hasTriggeredHaptic = false;
        }
        // Only update PTR indicator — no cdr.detectChanges() needed for just pullMoveY
        return;
      }
    }

    // Vertical swipe
    const diffX = e.touches[0].clientX - this.touchStartX;
    if (!this.isSwiping && Math.abs(diffY) > 10 && Math.abs(diffY) > Math.abs(diffX)) {
      this.isSwiping = true;
    }

    if (this.isSwiping) {
      let clamped = diffY;
      if (this.currentIndex === 0 && diffY > 0) clamped = diffY * 0.3;
      else if (this.currentIndex === this.reels.length - 1 && diffY < 0) clamped = diffY * 0.3;

      this.swipeDeltaY = clamped;
      if (e.cancelable) e.preventDefault();
      // Use requestAnimationFrame to batch the DOM style update — prevents jank
      requestAnimationFrame(() => this.cdr.markForCheck());
    }
  }

  async onTouchEnd(e: any) {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const deltaY = this.touchStartY - endY;
    const deltaX = this.touchStartX - endX;

    // Horizontal swipe → tab change
    if (Math.abs(deltaX) > this.swipeThresholdX && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        if (this.activeTab === 'explore') this.switchTab('near');
        else if (this.activeTab === 'near') this.switchTab('new');
      } else {
        if (this.activeTab === 'new') this.switchTab('near');
        else if (this.activeTab === 'near') this.switchTab('explore');
      }
      this.resetSwipeState();
      return;
    }

    // Vertical swipe → navigate
    if (this.isSwiping) {
      if (deltaY > 80) this.next();
      else if (deltaY < -80 && this.pullMoveY < this.pullThreshold) this.prev();
    }

    // Pull to refresh
    if (this.pullMoveY >= this.pullThreshold && !this.isRefreshing) {
      await this.refresh();
    }

    this.resetSwipeState();
  }

  private resetSwipeState() {
    this.pullStartY = 0;
    this.pullMoveY = 0;
    this.swipeDeltaY = 0;
    this.isSwiping = false;
    this.hasTriggeredHaptic = false;
    this.cdr.markForCheck();
  }

  next() {
    if (this.currentIndex < this.reels.length - 1) {
      // Pause all audio immediately to prevent overlap
      this.isGlobalMuted = true;
      this.currentIndex++;
      this.cdr.markForCheck();
      this.trackView();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.isGlobalMuted = true;
      this.currentIndex--;
      this.cdr.markForCheck();
      this.trackView();
    }
  }

  async scrollToTopAndRefresh() {
    this.isGlobalMuted = true;
    if (this.currentIndex > 0) {
      const steps = this.currentIndex;
      const delay = Math.max(30, 80 - (steps * 2));
      for (let i = steps - 1; i >= 0; i--) {
        this.currentIndex = i;
        this.cdr.markForCheck();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    await this.refresh();
  }

  async refresh() {
    this.isRefreshing = true;
    (navigator as any).vibrate?.(50);
    try {
      await this.loadReels();
    } finally {
      setTimeout(() => {
        this.isRefreshing = false;
        this.cdr.markForCheck();
      }, 500);
    }
  }

  async reloadReelsForNewLocation() {
    const activeReelId = this.reels[this.currentIndex]?.id;
    const reelsWithDistance = await Promise.all(
      this.reels.map(async (reel) => {
        let distance = '';
        if (reel.latitude && reel.longitude) {
          try { distance = await this.locationService.getDistanceFromUser(reel.latitude, reel.longitude); } catch { }
        }
        return { ...reel, distance };
      })
    );
    this.reels = reelsWithDistance;
    if (activeReelId) {
      const idx = this.reels.findIndex(r => r.id === activeReelId);
      this.currentIndex = idx !== -1 ? idx : 0;
    } else {
      this.currentIndex = 0;
    }
    this.cdr.markForCheck();
  }

  // ─── Like / Bookmark / Share ─────────────────────────────────────────────

  async onLike(index: number) {
    const reel = this.reels[index];
    if (!reel?.id) return;
    const user = this.auth.currentUser;
    if (!user) return;

    const wasLiked = reel.isLiked || false;
    reel.isLiked = !wasLiked;
    reel.likes = (reel.likes || 0) + (wasLiked ? -1 : 1);
    this.cdr.markForCheck();

    try {
      await this.reelsService.toggleLike(reel.id, user.uid, wasLiked);
    } catch {
      reel.isLiked = wasLiked;
      reel.likes = (reel.likes || 0) + (wasLiked ? 1 : -1);
      this.cdr.markForCheck();
    }
  }

  async onBookmark(index: number) {
    const reel = this.reels[index];
    if (!reel?.id) return;
    const user = this.auth.currentUser;
    if (!user) return;

    const wasBookmarked = reel.isBookmarked || false;
    reel.isBookmarked = !wasBookmarked;
    this.cdr.markForCheck();

    try {
      await this.reelsService.toggleBookmark(reel.id, user.uid, wasBookmarked);
    } catch {
      reel.isBookmarked = wasBookmarked;
      this.cdr.markForCheck();
    }
  }

  onShare(index: number) {
    const reel = this.reels[index];
    if (!reel) return;
    const nav = window.navigator as any;
    if (nav?.share) {
      nav.share({
        title: reel.title,
        text: `Check out ${reel.title} from ${reel.vendor}!`,
        url: window.location.href
      }).catch(() => {});
    }
  }

  // ─── Priority ─────────────────────────────────────────────────────────────

  /**
   * Only prev-1, current, next+1 get high/auto priority.
   * Everything else gets 'low' so HLS destroys and frees memory.
   */
  getPriority(index: number): 'high' | 'auto' | 'low' {
    const diff = index - this.currentIndex;
    if (diff === 0) return 'high';
    if (diff === 1 || diff === -1) return 'auto';
    return 'low';
  }

  trackByReelId(_index: number, item: { reel: Reel }): string {
    return item.reel.id || '';
  }

  navigateToReel(reelId: string) {
    const index = this.reels.findIndex(r => r.id === reelId);
    if (index !== -1) {
      this.isGlobalMuted = true;
      this.currentIndex = index;
      this.cdr.markForCheck();
      this.trackView();
    }
  }

  getTotalViews(): string {
    const total = this.reels.reduce((s, r) => s + (r.viewCount || 0), 0);
    return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toString();
  }

  // ─── Seed Data ─────────────────────────────────────────────────────────────

  async seedData() {
    this.isLoading = true;
    this.cdr.markForCheck();
    const sample: any[] = [
      {
        title: 'Masala Dosa', vendor: 'CTR',
        videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        thumbnailUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=2070',
        price: 120, categories: ['South Indian', 'Breakfast'],
        latitude: 12.9352, longitude: 77.6245,
        uploadedBy: this.auth.currentUser?.uid || 'system',
        cloudflareVideoId: '', duration: 0,
        createdAt: Timestamp.now(), viewCount: 0, likes: 0, likedBy: [], bookmarkedBy: [], isPublic: true
      },
      {
        title: 'Filter Coffee', vendor: 'Brahmins Coffee Bar',
        videoUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Idli_Sambar.JPG/1200px-Idli_Sambar.JPG',
        price: 80, categories: ['South Indian', 'Beverages'],
        latitude: 12.9716, longitude: 77.6412,
        uploadedBy: this.auth.currentUser?.uid || 'system',
        cloudflareVideoId: '', duration: 0,
        createdAt: Timestamp.now(), viewCount: 0, likes: 0, likedBy: [], bookmarkedBy: [], isPublic: true
      }
    ];
    try {
      for (const reel of sample) await this.reelsService.createReel(reel);
      await this.loadReels();
    } catch (e) {
      console.error('Error seeding:', e);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
