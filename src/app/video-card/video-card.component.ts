import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

declare const window: any;
declare const document: any;
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Reel } from '../models/reel.model';
import Hls from 'hls.js';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() reel?: Reel;
  @Input() src = '';
  @Input() poster = '';
  @Input() title = '';
  @Input() vendor = '';
  @Input() price: number | string = '';
  @Input() distance = '';
  @Input() active = false;
  @Input() relativeIndex = 0;
  @Input() priority: 'high' | 'auto' | 'low' = 'low';
  @Input() swipeDeltaY = 0;
  @Input() isSwiping = false;

  // Social features
  @Input() likes = 0;
  @Input() viewCount = 0;
  @Input() isLiked = false;
  @Input() isBookmarked = false;

  @Output() liked = new EventEmitter<void>();
  @Output() bookmarked = new EventEmitter<void>();
  @Output() shared = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  @Output() muteChanged = new EventEmitter<boolean>();

  @Input() canDelete = false;
  @Input() isMuted = true;

  @ViewChild('videoEl') videoEl!: ElementRef<any>;

  // Double-tap to like
  private lastTapTime = 0;
  showLikeAnimation = false;
  showMuteIcon = false;
  isProgressBarVisible = false;
  private progressBarHideTimeout: any;
  private singleTapTimeout?: any;

  private hls: Hls | null = null;
  private isBrowser = false;
  private currentInitSrc = '';

  isLoading = true;
  isVideoInitialized = false;
  isVideoReady = false;
  hasError = false;
  progress = 0;
  isSeeking = false;

  // --- Display getters ---
  get displaySrc(): string {
    let url = this.reel?.videoUrl || this.src;
    if (url && url.includes('videos.bengaluru-swada.com')) {
      url = url.replace('https://videos.bengaluru-swada.com', 'https://r2-video-uploader.bengaluru-swada.workers.dev');
    }
    return url;
  }
  get displayPoster(): string { return this.reel?.thumbnailUrl || this.poster; }
  get displayTitle(): string { return this.reel?.title || this.title; }
  get displayVendor(): string { return this.reel?.vendor || this.vendor; }
  get displayPrice(): number | string { return this.reel?.price || this.price; }
  get displayDistance(): string { return this.reel?.distance || this.distance; }
  get displayLikes(): number { return this.reel?.likes || this.likes; }
  get displayViewCount(): number { return this.reel?.viewCount || this.viewCount; }
  get displayIsLiked(): boolean { return this.reel ? (this.reel.isLiked || false) : this.isLiked; }
  get displayIsBookmarked(): boolean { return this.reel ? (this.reel.isBookmarked || false) : this.isBookmarked; }

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.isBrowser) return;

    // Source changed → reinit
    if (changes['reel'] || changes['src']) {
      const newSrc = this.displaySrc;
      const prevSrc = changes['reel']?.previousValue?.videoUrl || changes['src']?.previousValue;
      if (newSrc !== prevSrc) {
        this.isVideoReady = false;
        this.hasError = false;
        if (this.isVideoInitialized) {
          this.initVideo();
        }
      }
    }

    // Priority changed
    if (changes['priority'] && !changes['priority'].firstChange) {
      this.handlePriorityChange(changes['priority'].currentValue, changes['priority'].previousValue);
    }

    // Active changed → play or pause, and sync mute
    if (changes['active']) {
      if (this.active) {
        this.syncMute();
        this.play();
      } else {
        this.pause();
      }
    }

    // Mute changed externally while active
    if (changes['isMuted'] && !changes['isMuted'].firstChange && this.active) {
      this.syncMute();
    }
  }

  /** Sync the video element's muted state with component state */
  private syncMute() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      // Only unmute if this card is the active one
      video.muted = !this.active || this.isMuted;
    }
  }

  ngOnDestroy() {
    this.destroyHls();
    if (this.progressBarHideTimeout) clearTimeout(this.progressBarHideTimeout);
    if (this.singleTapTimeout) clearTimeout(this.singleTapTimeout);
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    // Short delay so DOM is painted before HLS attaches
    setTimeout(() => {
      this.isVideoInitialized = true;
      this.cdr.detectChanges();
      this.initVideo();
    }, 30);
  }

  // ─── HLS & Playback ────────────────────────────────────────────────────────

  private initVideo() {
    const video = this.videoEl?.nativeElement;
    const src = this.displaySrc;

    if (!video || !src) {
      this.isLoading = false;
      return;
    }

    // Only init for high/auto priority; skip low
    if (this.priority === 'low') {
      this.isLoading = false;
      return;
    }

    // Prevent double-init for same src
    if (this.hls && this.currentInitSrc === src) {
      this.handlePriorityChange(this.priority, this.priority);
      return;
    }

    this.destroyHls();
    this.currentInitSrc = src;
    this.isLoading = (this.priority === 'high');

    if (!src.endsWith('.m3u8')) {
      console.error('[VideoCard] Non-HLS src not supported:', src);
      this.isLoading = false;
      return;
    }

    if (Hls.isSupported()) {
      const config: Partial<any> = {
        debug: false,
        // Disable worker — Capacitor Android WebView blocks SharedArrayBuffer
        // (requires COOP/COEP headers which aren't set in a Capacitor app)
        enableWorker: false,
        // Let HLS auto-pick quality based on bandwidth (good for 4G/5G variance)
        startLevel: -1,
        autoStartLoad: true,
        // Mobile-conservative buffer: 5s ahead is enough, saves RAM
        maxBufferLength: 5,
        maxMaxBufferLength: 15,
        // Don't keep old segments — on Android with 2-3GB RAM this matters
        backBufferLength: 0,
        // Prefetch the next fragment while current is playing
        startFragPrefetch: true,
        // Generous timeouts for 4G networks in India
        fragLoadingTimeOut: 10000,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 500,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 3,
        lowLatencyMode: false,
        // Prevent ABR from switching to higher quality on slow connections mid-segment
        abrEwmaFastLive: 3,
        abrEwmaSlowLive: 9,
      };

      this.hls = new Hls(config);
      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        this.hls?.loadSource(src); // Use original src WITHOUT cache-buster for caching
      });

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (this.priority === 'high' && this.active) {
          this.syncMute();
          video.play().catch((e: any) => console.warn('[VideoCard] Play failed:', e));
        }
      });

      this.hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              this.hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.hls?.recoverMediaError();
              break;
            default:
              this.destroyHls();
              break;
          }
        }
      });

      this.setupNativeListeners();

    } else if (video.canPlayType('application/vnd.apple.mpegurl') === 'probably') {
      // Native Safari HLS (iOS)
      video.src = src;
      this.setupNativeListeners();
      if (this.priority === 'high') {
        this.syncMute();
        video.play().catch((e: any) => console.warn('[VideoCard] iOS play failed:', e));
      }
    }
  }

  private handlePriorityChange(newPriority: string, _oldPriority: string) {
    const video = this.videoEl?.nativeElement;

    switch (newPriority) {
      case 'high':
        // Must have HLS running
        if (!this.hls) {
          this.initVideo();
          return;
        }
        this.hls.startLoad();
        if (this.active) {
          this.syncMute();
          video?.play().catch((e: any) => console.warn('[VideoCard] Play failed on priority high:', e));
        }
        break;

      case 'auto':
        // Preload only — load manifest so we know total duration, but don't
        // fetch segments yet. Segments start fetching when priority becomes 'high'.
        // This saves mobile data on 4G connections.
        if (!this.hls) {
          this.initVideo();
          // After init, immediately pause segment loading
          setTimeout(() => this.hls?.stopLoad(), 100);
          return;
        }
        this.hls.startLoad(-1); // Load manifest only (startPosition = -1 means don't seek)
        setTimeout(() => this.hls?.stopLoad(), 500); // Stop after manifest is fetched
        video?.pause();
        break;

      case 'low':
        // Destroy & free memory — only keep active ± 1 in memory
        this.destroyHls();
        if (video) {
          video.src = '';
          video.load();
        }
        this.currentInitSrc = '';
        this.isVideoReady = false;
        break;
    }
  }

  private destroyHls() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  private setupNativeListeners() {
    const video = this.videoEl?.nativeElement;
    if (!video) return;

    video.addEventListener('loadeddata', () => {
      this.isVideoReady = true;
      this.isLoading = false;
      this.cdr.detectChanges();
    });

    video.addEventListener('timeupdate', () => {
      if (!this.isSeeking && video.duration) {
        this.progress = (video.currentTime / video.duration) * 100;
      }
      if (video.currentTime > 0.05 && !this.isVideoReady) {
        this.isVideoReady = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    video.addEventListener('waiting', () => {
      if (this.active) {
        this.isLoading = true;
        this.cdr.detectChanges();
      }
    });

    video.addEventListener('playing', () => {
      this.isLoading = false;
      this.cdr.detectChanges();
    });

    video.addEventListener('ended', () => {
      this.progress = 0;
      video.currentTime = 0;
      // Only auto-loop if this card is still the active one
      if (this.active) {
        video.play().catch(() => {});
      }
    });
  }

  play() {
    const video = this.videoEl?.nativeElement;
    if (!video) return;
    if (!this.active) return; // Only the active card should play — prevents overlapping audio on Android
    if (!video.paused) return; // Already playing

    this.syncMute();

    if (this.hls) {
      this.hls.startLoad();
    }

    video.play().catch((err: any) => console.warn('[VideoCard] Play failed:', err));
  }

  pause() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      video.pause();
      video.muted = true; // Force mute as safety net for Android WebView
    }
  }

  // ─── Interaction ─────────────────────────────────────────────────────────

  onVideoTap(event: any): void {
    if (event.cancelable) event.preventDefault();

    const now = Date.now();
    const gap = now - this.lastTapTime;

    if (gap < 300 && gap > 0) {
      // Double tap
      if (this.singleTapTimeout) {
        clearTimeout(this.singleTapTimeout);
        this.singleTapTimeout = undefined;
      }
      this.doubleTapLike();
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
      this.singleTapTimeout = setTimeout(() => {
        this.toggleMute();
        this.singleTapTimeout = undefined;
      }, 300);
    }
  }

  toggleMute() {
    const video = this.videoEl?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    }

    this.isMuted = !this.isMuted;
    video.muted = !this.active || this.isMuted;
    this.muteChanged.emit(this.isMuted);
    this.showMuteAnimation();

    this.isProgressBarVisible = true;
    if (this.progressBarHideTimeout) clearTimeout(this.progressBarHideTimeout);
    this.progressBarHideTimeout = setTimeout(() => {
      this.isProgressBarVisible = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  private showMuteAnimation() {
    this.showMuteIcon = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showMuteIcon = false;
      this.cdr.detectChanges();
    }, 900);
  }

  doubleTapLike() {
    if (!this.displayIsLiked) {
      this.toggleLike();
    }
    this.showLikeAnimationEffect();
  }

  toggleLike() {
    if (!this.reel) this.isLiked = !this.isLiked;
    this.liked.emit();
  }

  bookmark(): void {
    if (!this.reel) this.isBookmarked = !this.isBookmarked;
    this.bookmarked.emit();
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.deleted.emit();
  }
  openGoogleMaps(): void {
    if (!this.isBrowser) return;
    if (this.reel?.latitude && this.reel?.longitude) {
      window.open(`https://www.google.com/maps?q=${this.reel.latitude},${this.reel.longitude}`, '_blank');
    } else {
      const q = encodeURIComponent(`${this.displayVendor} ${this.displayTitle} Bangalore`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
    }
  }

  shareApp(): void {
    if (!this.isBrowser) return;
    this.shared.emit();
    const nav = window.navigator as any;
    const data = {
      title: 'Bengaluru Swada',
      text: `Check out ${this.displayTitle} from ${this.displayVendor}!`,
      url: window.location.origin
    };
    if (nav?.share) {
      nav.share(data).catch(() => this.fallbackShare());
    } else {
      this.fallbackShare();
    }
  }

  private fallbackShare(): void {
    const nav = window.navigator as any;
    const text = `Check out Bengaluru Swada! ${window.location.origin}`;
    if (nav?.clipboard) {
      nav.clipboard.writeText(text).catch(() => {});
    }
  }

  private showLikeAnimationEffect(): void {
    this.showLikeAnimation = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showLikeAnimation = false;
      this.cdr.detectChanges();
    }, 800);
  }

  goToProfile(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/profile']);
  }

  formatViewCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }

  // ─── Progress Bar ─────────────────────────────────────────────────────────

  onProgressBarClick(event: any): void {
    event.stopPropagation();
    this.seekToPosition(event);
  }

  onProgressBarTouchStart(event: any): void {
    this.isSeeking = true;
    this.seekToPosition(event);
  }

  onProgressBarTouchMove(event: any): void {
    if (this.isSeeking) this.seekToPosition(event);
  }

  onProgressBarTouchEnd(): void {
    this.isSeeking = false;
  }

  private seekToPosition(event: any): void {
    const rect = event.currentTarget.getBoundingClientRect();
    let clientX = event.type.includes('touch')
      ? (event.touches[0] || event.changedTouches[0])?.clientX ?? 0
      : event.clientX;

    const pct = Math.max(0, Math.min(clientX - rect.left, rect.width)) / rect.width;
    const video = this.videoEl?.nativeElement;
    if (video?.readyState > 0) {
      video.currentTime = pct * video.duration;
      this.progress = pct * 100;
    }
  }
}
