import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReelsService } from '../services/reels.service';

@Component({
    selector: 'app-trending',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './trending.component.html',
    styleUrls: ['./trending.component.scss']
})
export class TrendingComponent implements OnInit {
    trendingReels: any[] = [];
    newArrivalsReels: any[] = [];
    activeTab: 'trending' | 'new' = 'trending';
    isLoading = true;

    // Swipe detection
    private touchStartX = 0;
    private touchEndX = 0;

    constructor(private reelsService: ReelsService) { }

    async ngOnInit() {
        await this.loadTrending();
    }

    async loadTrending() {
        this.isLoading = true;
        try {
            // Fetch more to sort client side for now, ideally API handles this
            const allReels = await this.reelsService.getReels(50);

            // Sort by views/likes and take top 10
            // Sort by views/likes and take top 10 for Trending
            this.trendingReels = [...allReels]
                .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
                .slice(0, 10);

            // Sort by createdAt for New Arrivals (Top 10)
            this.newArrivalsReels = [...allReels]
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return dateB - dateA;
                })
                .slice(0, 10);

        } catch (error) {
            console.error('Error loading trending:', error);
        } finally {
            this.isLoading = false;
        }
    }
    switchTab(tab: 'trending' | 'new') {
        this.activeTab = tab;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onTouchStart(e: TouchEvent) {
        this.touchStartX = e.changedTouches[0].screenX;
    }

    onTouchEnd(e: TouchEvent) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
    }

    private handleSwipe() {
        const threshold = 50; // Min distance for swipe
        if (this.touchStartX - this.touchEndX > threshold) {
            // Swipe Left -> Next Tab (New Arrivals)
            if (this.activeTab === 'trending') this.switchTab('new');
        }

        if (this.touchEndX - this.touchStartX > threshold) {
            // Swipe Right -> Prev Tab (Trending)
            if (this.activeTab === 'new') this.switchTab('trending');
        }
    }
}
