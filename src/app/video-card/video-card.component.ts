import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
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
  styleUrls: ['./video-card.component.scss']
})
export class VideoCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  // Accept full Reel object or individual properties for backward compatibility
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

  @Input() canDelete = false;

  @ViewChild('videoEl') videoEl!: ElementRef<any>;

  // Double-tap to mute/unmute
  private lastTapTime = 0;
  showLikeAnimation = false;
  isProgressBarVisible = false;
  private progressBarHideTimeout: any;
  private singleTapTimeout?: any;
  private hls: Hls | null = null;
  private isBrowser = false;
  private currentInitSrc = '';

  // Get display values from reel or fallback to individual inputs
  get displaySrc(): string {
    let url = this.reel?.videoUrl || this.src;
    // Cloudflare Worker replacement if needed, though best done at service level
    if (url && url.includes('videos.bengaluru-swada.com')) {
      url = url.replace('https://videos.bengaluru-swada.com', 'https://r2-video-uploader.bengaluru-swada.workers.dev');
    }
    return url;
  }

  get displayPoster(): string {
    return this.reel?.thumbnailUrl || this.poster;
  }

  get displayTitle(): string {
    return this.reel?.title || this.title;
  }

  get displayVendor(): string {
    return this.reel?.vendor || this.vendor;
  }

  get displayPrice(): number | string {
    return this.reel?.price || this.price;
  }

  get displayDistance(): string {
    return this.reel?.distance || this.distance;
  }

  get displayLikes(): number {
    return this.reel?.likes || this.likes;
  }

  get displayViewCount(): number {
    return this.reel?.viewCount || this.viewCount;
  }

  get displayIsLiked(): boolean {
    return this.reel ? (this.reel.isLiked || false) : this.isLiked;
  }

  get displayIsBookmarked(): boolean {
    return this.reel ? (this.reel.isBookmarked || false) : this.isBookmarked;
  }

  isLoading = true;
  progress = 0;
  isSeeking = false;
  @Input() isMuted = true;
  @Output() muteChanged = new EventEmitter<boolean>();
  showMuteIcon = false;
  private progressInterval: any;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  goToProfile(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/profile']);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.isBrowser) return;

    // 1. Handle Source Changes
    if (changes['reel'] || changes['src']) {
      const currentSrc = this.displaySrc;
      const prevSrc = changes['reel']?.previousValue?.videoUrl || changes['src']?.previousValue;

      if (currentSrc !== prevSrc) {
        // removed this.isLoading = true; to prevent stuck state
        this.initVideo();
      }
    }

    // 2. Handle Priority Changes (Preloading logic)
    if (changes['priority']) {
      this.updateHlsPriority();
    }

    // 3. Handle Active State (Play/Pause)
    if (changes['active']) {
      if (this.active) {
        this.play();
      } else {
        this.pause();
        // If we dropping from active to specific priority handled in updateHlsPriority
        // But ensures we don't keep playing
      }
    }

    // 4. Mute State
    if (this.videoEl?.nativeElement) {
      this.videoEl.nativeElement.muted = !this.active || this.isMuted;
    }
  }

  ngOnDestroy() {
    this.destroyHls();
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (this.progressBarHideTimeout) {
      clearTimeout(this.progressBarHideTimeout);
    }
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      console.log('[VideoCard] ngAfterViewInit', this.reel?.id);
      this.initVideo();
      this.setupNativeListeners();

      // Safety check: verify init happened
      setTimeout(() => {
        if (!this.hls && (this.priority === 'high' || this.priority === 'auto')) {
          console.warn('[VideoCard] Safety Retry Init for', this.reel?.id);
          this.initVideo();
        }
      }, 500);
    }
  }

  private initVideo() {
    const video = this.videoEl?.nativeElement;
    const src = this.displaySrc;

    if (!video) {
      // Expected during early ngOnChanges
      console.warn('[VideoCard] initVideo skipped: No video element for', this.reel?.id);
      return;
    }
    if (!src) {
      console.warn('[VideoCard] initVideo skipped: No src available for', this.reel?.id);
      this.isLoading = false; // Ensure we don't show spinner if no content
      return;
    }

    // Now we are actually starting
    this.isLoading = (this.priority === 'high'); // Only show spinner for active video

    console.log('[VideoCard] InitVideo V2 for:', this.reel?.id, 'Idx:', this.relativeIndex, 'Priority:', this.priority);

    // RULE 4: Initial HLS only if priority is not low
    if (this.priority === 'low') {
      // console.log('[VideoCard] Skipping init due to low priority');
      this.isLoading = false; // Don't show spinner for low priority background items
      return;
    }

    // Prevent redundant initialization
    if (this.hls && this.currentInitSrc === src) {
      console.log('[VideoCard] Skipping HLS init (already active for src)');
      this.updateHlsPriority(); // Just update state
      return;
    }

    // Cleanup existing
    this.destroyHls();
    this.currentInitSrc = src;

    // CACHE BUSTING: Force fresh network fetch to avoid stale disk cache black screen
    const uniqueSrc = src.includes('?') ? `${src}&t=${Date.now()}` : `${src}?t=${Date.now()}`;
    console.log('[VideoCard] Loading Source:', uniqueSrc);

    // RULE 6: Strict Format Enforcement
    if (!src.endsWith('.m3u8')) {
      throw new Error('[VideoCard] MP4 playback is forbidden');
    }

    if (Hls.isSupported()) {
      // RULE 1: BUFFER INFLATION BUG FIX
      const config: Partial<any> = {
        debug: false,
        enableWorker: true,
        startLevel: 0, // RULE 2: PRELOAD BITRATE BUG FIX
        autoStartLoad: true, // Enabled for faster start (initVideo only runs for high/auto)
        maxBufferLength: 6, // Reverted to 6s for stability
        maxMaxBufferLength: 12, // Reverted to 12s
        backBufferLength: 3, // Reverted to 3s
        startFragPrefetch: true, // Enabled prefetch to reduce startup delay
        fragLoadingTimeOut: 2000,
        fragLoadingMaxRetry: 3,
      };

      this.hls = new Hls(config);
      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        this.hls?.loadSource(uniqueSrc);
        // Loading handled in updateHlsPriority
      });

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.updateHlsPriority();
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
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
    } else if (video.canPlayType('application/vnd.apple.mpegurl') === 'probably') {
      // RULE 5: NATIVE SAFARI HLS SAFETY
      video.src = uniqueSrc;
    }
  }

  private updateHlsPriority() {
    // If HLS instance doesn't exist and we moved to high/auto, we must init
    if (!this.hls && (this.priority === 'high' || this.priority === 'auto')) {
      this.initVideo();
      return;
    }

    if (!this.hls) return;

    switch (this.priority) {
      case 'high':
        // FIX 1: HIGH vs AUTO PLAYBACK DETERMINISM
        // console.log('[VideoCard] Priority HIGH -> Playing', this.reel?.id);
        this.hls.startLoad(0);
        this.videoEl?.nativeElement.play().catch((err: any) => console.warn('[VideoCard] Autoplay blocked?', err));
        break;

      case 'auto':
        this.hls.startLoad(0);
        this.videoEl?.nativeElement.pause();
        break;

      case 'low':
        // RULE 3: MEMORY LEAK ON LOW PRIORITY
        this.destroyHls();
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.src = '';
          this.videoEl.nativeElement.load();
        }
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
    const video = this.videoEl.nativeElement;
    const events = ['error', 'ended', 'timeupdate', 'waiting', 'playing'];

    events.forEach(event => {
      video.addEventListener(event, () => {
        if (event === 'timeupdate') {
          if (!this.isSeeking && video.duration) {
            this.progress = (video.currentTime / video.duration) * 100;
          }
          this.isLoading = false; // Playing implies loaded
        }
        if (event === 'waiting') {
          this.isLoading = true;
        }
        if (event === 'playing') {
          this.isLoading = false;
        }
        if (event === 'ended') {
          this.progress = 0;
          this.play(); // Loop
        }
      });
    });
  }


  play() {
    const video = this.videoEl?.nativeElement;
    if (!video) return;

    if (!video.paused) {
      // Already playing, ignore to prevent AbortErrors
      return;
    }

    this.videoEl.nativeElement.muted = !this.active || this.isMuted;

    // Ensure HLS is loading if we try to play
    if (this.hls) {
      this.hls.startLoad();
      // Ramp up buffer potential if it was low
      //this.hls.config.maxBufferLength = 30;
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err: any) => {
        console.warn('[VideoCard] Play failed:', err);
      });
    }
  }

  pause() {
    this.videoEl?.nativeElement.pause();
  }

  resetVideo() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      video.pause();
      // Optional: video.currentTime = 0; 
    }
  }

  preload() {
    // Handled via updateHlsPriority
  }

  // --- SOCIAL & UI METHODS (Unchanged logic mostly) ---

  bookmark(): void {
    if (!this.reel) {
      this.isBookmarked = !this.isBookmarked;
    }
    this.bookmarked.emit();
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.deleted.emit();
  }

  openGoogleMaps(): void {
    if (!this.isBrowser) return;

    if (this.reel?.latitude && this.reel?.longitude) {
      const { latitude, longitude } = this.reel;
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(url, '_blank');
    } else {
      const vendor = this.displayVendor;
      const title = this.displayTitle;
      const searchQuery = encodeURIComponent(`${vendor} ${title} Bangalore`);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
      window.open(mapsUrl, '_blank');
    }
  }

  share(): void {
    this.shareApp();
  }

  toggleLike() {
    if (!this.reel) {
      this.isLiked = !this.isLiked;
    }
    this.liked.emit();
    if (this.isLiked) {
      this.showLikeAnimationEffect();
    }
  }

  toggleMute() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      if (video.paused) {
        video.play().catch((err: any) => console.error('[VideoCard] Error playing on tap:', err));
      }
      const newMutedState = !this.isMuted;
      video.muted = !this.active || newMutedState;
      this.isMuted = newMutedState;
      this.muteChanged.emit(newMutedState);
      this.showMuteAnimation();
      this.isProgressBarVisible = true;
      if (this.progressBarHideTimeout) {
        clearTimeout(this.progressBarHideTimeout);
      }
      this.progressBarHideTimeout = setTimeout(() => {
        this.isProgressBarVisible = false;
      }, 2000);
    }
  }

  private showMuteAnimation() {
    this.showMuteIcon = true;
    setTimeout(() => {
      this.showMuteIcon = false;
    }, 1000);
  }

  doubleTapLike() {
    if (!this.isLiked) {
      this.toggleLike();
    } else {
      this.showLikeAnimationEffect();
    }
  }

  onVideoTap(event: any): void {
    if (event.cancelable) {
      event.preventDefault();
    }
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
      if (this.singleTapTimeout) {
        clearTimeout(this.singleTapTimeout);
        this.singleTapTimeout = undefined;
      }
      this.doubleTapLike();
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = currentTime;
      this.singleTapTimeout = setTimeout(() => {
        this.toggleMute();
        this.singleTapTimeout = undefined;
      }, 300);
    }
  }

  private showLikeAnimationEffect(): void {
    this.showLikeAnimation = true;
    setTimeout(() => {
      this.showLikeAnimation = false;
    }, 1000);
  }

  formatViewCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  onProgressBarClick(event: any): void {
    event.stopPropagation();
    this.seekToPosition(event);
  }

  onProgressBarTouchStart(event: any): void {
    this.isSeeking = true;
    this.seekToPosition(event);
  }

  onProgressBarTouchMove(event: any): void {
    if (this.isSeeking) {
      this.seekToPosition(event);
    }
  }

  onProgressBarTouchEnd(): void {
    this.isSeeking = false;
  }

  private seekToPosition(event: any): void {
    const progressContainer = event.currentTarget;
    const rect = progressContainer.getBoundingClientRect();

    let clientX: number;
    if (event.type.indexOf('touch') === -1) {
      clientX = event.clientX;
    } else {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return;
      clientX = touch.clientX;
    }

    const clickPosition = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = clickPosition / rect.width;

    const video = this.videoEl?.nativeElement;
    if (video && video.readyState > 0) {
      video.currentTime = percentage * video.duration;
      this.progress = percentage * 100;
    }
  }



  // Share the app with others
  shareApp(): void {
    if (!this.isBrowser) return;

    this.shared.emit();

    const shareData = {
      title: 'Bengaluru Swada - Discover Street Food',
      text: 'Check out this amazing street food discovery app! Find the best local food near you.',
      url: window.location.origin
    };

    // Use Web Share API if available
    const nav = window.navigator as any;
    if (nav && nav.share) {
      nav.share(shareData).catch((error: any) => {
        console.log('Error sharing:', error);
        this.fallbackShare();
      });
    } else {
      this.fallbackShare();
    }
  }

  // Fallback share method for browsers without Web Share API
  private fallbackShare(): void {
    const url = window.location.origin;
    const text = `Check out Bengaluru Swada - Discover amazing street food near you! ${url}`;

    // Copy to clipboard
    const nav = window.navigator as any;
    if (nav && nav.clipboard) {
      nav.clipboard.writeText(text).then(() => {
        window.alert('Link copied to clipboard! Share it with your friends.');
      }).catch(() => {
        this.showShareOptions(url);
      });
    } else {
      this.showShareOptions(url);
    }
  }

  // Show share options as fallback
  private showShareOptions(url: string): void {
    const message = encodeURIComponent('Check out Bengaluru Swada - Discover amazing street food!');
    const encodedUrl = encodeURIComponent(url);

    // Open WhatsApp share (most popular in India)
    const whatsappUrl = `https://wa.me/?text=${message}%20${encodedUrl}`;
    window.open(whatsappUrl, '_blank');
  }
}
