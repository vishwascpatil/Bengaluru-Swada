import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reel } from '../models/reel.model';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss']
})
export class VideoCardComponent implements AfterViewInit, OnChanges {
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

  // Social features
  @Input() likes = 0;
  @Input() viewCount = 0;
  @Input() isLiked = false;
  @Input() isBookmarked = false;

  @Output() liked = new EventEmitter<void>();
  @Output() bookmarked = new EventEmitter<void>();
  @Output() shared = new EventEmitter<void>();

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  // Double-tap to like
  private lastTapTime = 0;
  showLikeAnimation = false;

  // Get display values from reel or fallback to individual inputs
  get displaySrc(): string {
    return this.reel?.videoUrl || this.src;
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
    return this.reel?.isLiked || this.isLiked;
  }

  get displayIsBookmarked(): boolean {
    return this.reel?.isBookmarked || this.isBookmarked;
  }

  isLoading = true;
  progress = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reel'] || changes['src']) {
      this.isLoading = true;
      if (this.videoEl && this.videoEl.nativeElement) {
        this.videoEl.nativeElement.load();
      }
    }
  }

  ngAfterViewInit() {
    const video = this.videoEl.nativeElement;

    // Log all relevant events to debug
    const events = [
      'loadstart', 'loadedmetadata', 'loadeddata', 'canplay',
      'playing', 'waiting', 'error', 'stalled', 'suspend', 'emptied'
    ];

    events.forEach(event => {
      video.addEventListener(event, () => {
        // console.log(`[VideoCard] Event: ${event}, ReadyState: ${video.readyState}, Paused: ${video.paused}`);
        if (event === 'playing' || event === 'canplay' || event === 'loadeddata') {
          this.isLoading = false;
        }
        if (event === 'waiting') {
          this.isLoading = true;
        }
      });
    });

    // Initial check
    this.checkVideoReady();

    // Safety timeout: if video doesn't load in 5 seconds, hide spinner
    setTimeout(() => {
      if (this.isLoading) {
        console.warn('[VideoCard] Loading timed out, hiding spinner');
        this.isLoading = false;
      }
    }, 5000);

    // Track video progress
    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        this.progress = (video.currentTime / video.duration) * 100;
      }
    });
  }

  private checkVideoReady() {
    if (this.videoEl && this.videoEl.nativeElement) {
      const video = this.videoEl.nativeElement;
      if (video.readyState >= 3) {
        this.isLoading = false;
      }
    }
  }

  play() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      // Ensure muted is set for autoplay
      video.muted = true;

      // Reset loading state if we're trying to play
      if (video.readyState < 3) {
        this.isLoading = true;
      }

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error('[VideoCard] Error playing video:', err);
          // If play fails, hide spinner so user can see poster/interact
          this.isLoading = false;
        });
      }
    }
  }

  preload() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      video.preload = 'auto';
      video.load();
    }
  }

  pause() {
    this.videoEl?.nativeElement.pause();
  }

  toggleLike() {
    this.liked.emit();
  }

  bookmark() {
    this.bookmarked.emit();
  }

  share() {
    this.shared.emit();
  }

  /**
   * Handle double-tap to like
   */
  isMuted = true;
  showMuteIcon = false;

  toggleMute() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      video.muted = !video.muted;
      this.isMuted = video.muted;
      this.showMuteAnimation();
    }
  }

  private showMuteAnimation() {
    this.showMuteIcon = true;
    setTimeout(() => {
      this.showMuteIcon = false;
    }, 1000);
  }

  /**
   * Handle double-tap to like, single tap to mute/unmute
   */
  onVideoTap(event: MouseEvent | TouchEvent): void {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      if (!this.displayIsLiked) {
        this.toggleLike();
        this.showLikeAnimationEffect();
      }
    } else {
      // Single tap detected (wait briefly to ensure it's not a double tap)
      // For instant response, we can toggle mute immediately, but double tap might trigger it twice.
      // However, Instagram toggles mute on single tap immediately.
      this.toggleMute();
    }

    this.lastTapTime = currentTime;
  }

  /**
   * Show heart animation on double-tap
   */
  private showLikeAnimationEffect(): void {
    this.showLikeAnimation = true;
    setTimeout(() => {
      this.showLikeAnimation = false;
    }, 1000);
  }

  /**
   * Format view count for display (e.g., 1.2K, 1.5M)
   */
  formatViewCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }
}
