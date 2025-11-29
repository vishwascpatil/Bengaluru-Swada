import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reel } from '../models/reel.model';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss']
})
export class VideoCardComponent {
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

  play() {
    this.videoEl?.nativeElement.play().catch(() => { });
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

