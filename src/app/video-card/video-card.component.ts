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
        console.log(`[VideoCard] Event: ${event}, ReadyState: ${video.readyState}, Paused: ${video.paused}, Src: ${this.displaySrc}`);
      });
    });

    video.addEventListener('waiting', () => {
      console.log('[VideoCard] Waiting...');
      this.isLoading = true;
    });

    video.addEventListener('playing', () => {
      console.log('[VideoCard] Playing!');
      this.isLoading = false;
    });

    video.addEventListener('canplay', () => {
      console.log('[VideoCard] Can play!');
      this.isLoading = false;
    });

    video.addEventListener('loadeddata', () => {
      console.log('[VideoCard] Loaded data!');
      this.isLoading = false;
    });

    video.addEventListener('error', (e) => {
      console.error('[VideoCard] Error:', video.error);
      this.isLoading = false;
    });

    // Initial check
    console.log(`[VideoCard] Initial check - ReadyState: ${video.readyState}`);
    if (video.readyState >= 3) {
      this.isLoading = false;
    }

    // Safety timeout: if video doesn't load in 5 seconds, hide spinner
    setTimeout(() => {
      if (this.isLoading) {
        console.warn('[VideoCard] Loading timed out, hiding spinner');
        this.isLoading = false;
      }
    }, 5000);
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
  onVideoTap(event: MouseEvent | TouchEvent): void {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      if (!this.displayIsLiked) {
        this.toggleLike();
        this.showLikeAnimationEffect();
      }
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

