import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-feed-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-feed">
      <!-- Show only one full-screen card since it takes up the viewport -->
      <div class="skeleton-card">
        <div class="skeleton-overlay">
          <!-- Info Group (Bottom Left) -->
          <div class="skeleton-info-group">
             <div class="skeleton-line title"></div>
             <div class="skeleton-line vendor"></div>
          </div>
          
          <!-- Action Group (Bottom Right) -->
          <div class="skeleton-action-group">
             <div class="skeleton-circle"></div>
             <div class="skeleton-circle"></div>
             <div class="skeleton-circle"></div>
             <div class="skeleton-circle"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-feed {
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
    }
    .skeleton-card {
      position: relative;
      width: 100%;
      height: 100%;
      background: #121212;
    }
    
    .skeleton-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #121212;
        z-index: 10;
        pointer-events: none;
    }

    /* Info Group (Bottom Left) */
    .skeleton-info-group {
        position: absolute;
        bottom: 20px;
        left: 20px;
        width: 80%;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .skeleton-line {
        height: 14px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }
    
    .skeleton-line::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
        transform: translateX(-100%);
        animation: shimmer 1.5s infinite;
    }

    .skeleton-line.title {
        width: 60%;
        height: 16px;
    }

    .skeleton-line.vendor {
        width: 40%;
        height: 12px;
    }

    /* Action Group (Bottom Right) */
    .skeleton-action-group {
        position: absolute;
        bottom: 100px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
    }

    .skeleton-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        position: relative;
        overflow: hidden;
    }
    
    .skeleton-circle::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
        transform: translateX(-100%);
        animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
        100% {
            transform: translateX(100%);
        }
    }
  `]
})
export class VideoFeedSkeletonComponent { }
