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

  // Double-tap to mute/unmute
  private lastTapTime = 0;
  showLikeAnimation = false;
  isProgressBarVisible = false;
  private progressBarHideTimeout: any;
  private singleTapTimeout?: number;

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
  isSeeking = false;
  isMuted = true;
  showMuteIcon = false;
  private progressInterval: any;

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
        if (event === 'playing' || event === 'canplay' || event === 'loadeddata') {
          this.isLoading = false;
          this.startProgressTracking();
        }
        if (event === 'waiting') {
          this.isLoading = true;
        }
        if (event === 'error') {
          console.error('[VideoCard] Video error:', video.error);
          this.isLoading = false; // Hide spinner on error
        }
        if (event === 'ended') {
          // Reset progress when video ends
          this.progress = 0;
        }
      });
    });

    // Initial check
    this.checkVideoReady();

    // Safety timeout: if video doesn't load in 2 seconds, hide spinner
    setTimeout(() => {
      if (this.isLoading) {
        console.warn('[VideoCard] Loading timed out, hiding spinner');
        this.isLoading = false;
      }
    }, 2000); // Reduced from 5000ms for faster perceived loading
  }

  private startProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    const video = this.videoEl?.nativeElement;
    if (!video) return;

    this.progressInterval = setInterval(() => {
      if (!this.isSeeking && video.duration) {
        this.progress = (video.currentTime / video.duration) * 100;
      }
    }, 50); // Update progress more frequently for smoother animation
  }

  ngOnDestroy() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (this.progressBarHideTimeout) {
      clearTimeout(this.progressBarHideTimeout);
    }
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

  // Toggle bookmark status
  bookmark(): void {
    this.isBookmarked = !this.isBookmarked;
    this.bookmarked.emit();
  }

  // Open Google Maps with the reel's location
  openGoogleMaps(): void {
    if (this.reel?.latitude && this.reel?.longitude) {
      const { latitude, longitude } = this.reel;
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(url, '_blank');
    } else {
      console.warn('No location data available for this reel');
      // Optional: Show a toast or alert to the user
    }
  }

  share() {
    this.shared.emit();
  }

  toggleLike() {
    this.isLiked = !this.isLiked;
    this.liked.emit();
    if (this.isLiked) {
      this.showLikeAnimationEffect();
    }
  }

  /**
   * Handle double-tap to like
   */
  toggleMute() {
    const video = this.videoEl?.nativeElement;
    if (video) {
      if (video.paused) {
        video.play().catch(err => console.error('[VideoCard] Error playing on tap:', err));
      }

      video.muted = !video.muted;
      this.isMuted = video.muted;
      this.showMuteAnimation();

      // Show the progress bar when muting/unmuting
      this.isProgressBarVisible = true;

      // Auto-hide after 2 seconds
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

  /**
   * Handle double-tap to like (only like, never unlike)
   */
  doubleTapLike() {
    if (!this.isLiked) {
      this.toggleLike();
    } else {
      this.showLikeAnimationEffect();
    }
  }

  /**
   * Handle video tap - single tap mutes/unmutes, double tap likes
   */
  onVideoTap(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected - like the video
      // Clear any pending single tap action
      if (this.singleTapTimeout) {
        clearTimeout(this.singleTapTimeout);
        this.singleTapTimeout = undefined;
      }
      this.doubleTapLike();
      this.lastTapTime = 0;
    } else {
      // Potential single tap - wait to see if double tap follows
      this.lastTapTime = currentTime;
      this.singleTapTimeout = window.setTimeout(() => {
        this.toggleMute();
        this.singleTapTimeout = undefined;
      }, 300); // Wait 300ms to see if double tap comes
    }
  }

  /**
   * Toggle progress bar visibility with auto-hide
   */
  private toggleProgressBar(): void {
    // Clear any existing timeout
    if (this.progressBarHideTimeout) {
      clearTimeout(this.progressBarHideTimeout);
    }

    // Toggle visibility
    this.isProgressBarVisible = !this.isProgressBarVisible;

    // Auto-hide after 3 seconds if shown
    if (this.isProgressBarVisible) {
      this.progressBarHideTimeout = setTimeout(() => {
        this.isProgressBarVisible = false;
      }, 3000);
    }
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

  /**
   * Handle progress bar interaction for seeking
   */
  onProgressBarClick(event: MouseEvent | TouchEvent): void {
    event.stopPropagation();
    this.seekToPosition(event);
  }

  onProgressBarTouchStart(event: TouchEvent): void {
    this.isSeeking = true;
    this.seekToPosition(event);
  }

  onProgressBarTouchMove(event: TouchEvent): void {
    if (this.isSeeking) {
      this.seekToPosition(event);
    }
  }

  onProgressBarTouchEnd(): void {
    this.isSeeking = false;
  }

  private seekToPosition(event: MouseEvent | TouchEvent): void {
    const progressContainer = (event.currentTarget as HTMLElement);
    const rect = progressContainer.getBoundingClientRect();

    let clientX: number;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
    } else {
      // For touch events, use the first touch point
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return;
      clientX = touch.clientX;
    }

    // Calculate the position within the progress bar
    const clickPosition = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = clickPosition / rect.width;

    // Update the video's current time
    const video = this.videoEl?.nativeElement;
    if (video && video.readyState > 0) {
      video.currentTime = percentage * video.duration;
      this.progress = percentage * 100; // Update progress immediately
    }
  }
}
