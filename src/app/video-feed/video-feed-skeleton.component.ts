import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-video-feed-skeleton',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="skeleton-feed">
      <div class="skeleton-card" *ngFor="let i of [1,2]">
        <div class="skeleton-video"></div>
        <div class="skeleton-actions">
           <div class="skeleton-icon circle"></div>
           <div class="skeleton-icon circle"></div>
           <div class="skeleton-icon circle"></div>
        </div>
        <div class="skeleton-info">
           <div class="skeleton-line title"></div>
           <div class="skeleton-line vendor"></div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .skeleton-feed {
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow: hidden;
    }
    .skeleton-card {
      position: relative;
      width: 100%;
      height: 100dvh; /* Full viewport height */
      background: #121212;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 20px;
    }
    .skeleton-video {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(110deg, #121212 8%, #1f1f1f 18%, #121212 33%);
        background-size: 200% 100%;
        animation: shine 1.5s linear infinite;
        opacity: 0.5;
    }
    .skeleton-actions {
        position: absolute;
        right: 16px;
        bottom: 120px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        z-index: 2;
    }
    .skeleton-icon.circle {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        background: rgba(255,255,255,0.1);
    }
    .skeleton-info {
        z-index: 2;
        margin-bottom: 70px;
        width: 70%;
    }
    .skeleton-line {
        height: 16px;
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        margin-bottom: 10px;
    }
    .title { width: 80%; height: 24px; margin-bottom: 12px; }
    .vendor { width: 50%; }

    @keyframes shine {
        to { background-position-x: -200%; }
    }
  `]
})
export class VideoFeedSkeletonComponent { }
