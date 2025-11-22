import { Component, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoCardComponent } from '../video-card/video-card.component';

@Component({
  selector: 'app-video-feed',
  standalone: true,
  imports: [CommonModule, VideoCardComponent],
  templateUrl: './video-feed.component.html',
  styleUrls: ['./video-feed.component.scss']
})
export class VideoFeedComponent implements AfterViewInit {
  videos = [
    { src: 'https://assets.mixkit.co/videos/preview/mixkit-cooking-eggs-in-a-pan-close-up-video-42309-large.mp4', poster: '', title: 'Masala Dosa', vendor: "Ramesh Uncle's Stall", price: 45, distance: '0.8 km away' },
    // ... add more items (or fetch from API)
  ];
  currentIndex = 0;
  touchStartY = 0;

  @ViewChildren(VideoCardComponent) cards!: QueryList<VideoCardComponent>;

  ngAfterViewInit() { setTimeout(() => this.playCurrent(), 300); }

  onTouchStart(e: TouchEvent) { this.touchStartY = e.touches[0].clientY; }
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
  pauseCurrent() { this.cards.forEach(c => c.pause()); }

  next() { if (this.currentIndex < this.videos.length - 1) { this.currentIndex++; this.playCurrent(); } }
  prev() { if (this.currentIndex > 0) { this.currentIndex--; this.playCurrent(); } }

  onLike(i: number) { console.log('liked', i); }
  onBookmark(i: number) { console.log('bookmark', i); }
  onShare(i: number) { console.log('share', i); }
}
