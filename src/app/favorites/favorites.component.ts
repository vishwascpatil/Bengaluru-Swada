import { Component, OnInit, ChangeDetectorRef, Input, OnDestroy, QueryList, ViewChildren, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { Auth } from '@angular/fire/auth';
import { Reel } from '../models/reel.model';
import { NavigationService } from '../services/navigation.service';
import { LocationService } from '../services/location.service';

declare const window: any;

@Component({
    selector: 'app-favorites',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './favorites.component.html',
    styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() showHeader = true;
    bookmarkedReels: Reel[] = [];
    isLoading = true;
    loadedThumbs: Set<string> = new Set();

    // Only play the video that the user is actively hovering/viewing
    activeVideoIndex: number | null = null;
    private intersectionObserver?: any;

    @ViewChildren('videoThumb') videoEls!: QueryList<ElementRef<any>>;

    constructor(
        private reelsService: ReelsService,
        private auth: Auth,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private navigationService: NavigationService,
        private locationService: LocationService
    ) { }

    async ngOnInit() {
        await this.loadBookmarkedReels();
    }

    ngAfterViewInit() {
        this.setupIntersectionObserver();
        // Re-observe when the list changes
        this.videoEls.changes.subscribe(() => {
            this.setupIntersectionObserver();
        });
    }

    ngOnDestroy() {
        this.disconnectObserver();
        // Pause & mute all videos on destroy to prevent background audio
        this.videoEls?.forEach(el => {
            const v = el.nativeElement;
            v.pause();
            v.muted = true;
            v.src = '';
        });
    }

    /**
     * Intersection Observer: only play the video card that is most visible
     * on screen. Everything else is paused. This prevents all N videos from
     * playing simultaneously on Android.
     */
    private setupIntersectionObserver() {
        this.disconnectObserver();

        const videos = this.videoEls?.toArray();
        if (!videos?.length) return;

        this.intersectionObserver = new (window as any).IntersectionObserver(
            (entries: any[], _observer: any) => {
                entries.forEach((entry: any) => {
                    const videoEl = entry.target as any;
                    // Force muted always — never allow audio on thumbnail grid
                    videoEl.muted = true;

                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        // More than 50% visible → play
                        if (videoEl.paused) {
                            videoEl.play().catch(() => {});
                        }
                    } else {
                        // Out of view → pause immediately
                        if (!videoEl.paused) {
                            videoEl.pause();
                        }
                    }
                });
            },
            {
                threshold: [0, 0.5, 1.0],
                rootMargin: '0px'
            }
        );

        videos.forEach(ref => {
            const v = ref.nativeElement;
            // Enforce muted at the DOM property level (not just attribute)
            v.muted = true;
            this.intersectionObserver!.observe(v);
        });
    }

    private disconnectObserver() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = undefined;
        }
    }

    async loadBookmarkedReels() {
        this.isLoading = true;
        this.cdr.detectChanges();

        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                this.bookmarkedReels = [];
                return;
            }

            const allReels = await this.reelsService.getReels(100);
            const bookmarked = allReels.filter(reel =>
                this.reelsService.isBookmarkedByUser(reel, currentUser.uid)
            );

            this.bookmarkedReels = await Promise.all(bookmarked.map(async (reel) => {
                let distanceStr = '';
                if (reel.latitude && reel.longitude) {
                    try {
                        const userLoc = await this.locationService.getUserLocation();
                        const d = this.locationService.calculateDistance(
                            userLoc.latitude, userLoc.longitude,
                            reel.latitude, reel.longitude
                        );
                        distanceStr = d.toFixed(1) + ' km';
                    } catch { }
                }
                return {
                    ...reel,
                    distanceStr,
                    rating: (4 + Math.random() * 0.9).toFixed(1)
                };
            }));

        } catch (error) {
            console.error('[Favorites] Error loading bookmarked reels:', error);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
            // Re-setup observer after data loads
            setTimeout(() => this.setupIntersectionObserver(), 100);
        }
    }

    playReel(reel: Reel) {
        this.navigationService.selectReel(reel.id!);
        this.router.navigate(['/main-app']);
    }

    onThumbLoad(reelId: string, videoEl: any) {
        // Enforce muted programmatically when video loads — critical for Android WebView
        videoEl.muted = true;
        this.loadedThumbs.add(reelId);
        this.cdr.detectChanges();
    }

    trackByReelId(_index: number, reel: Reel): string {
        return reel.id || '';
    }
}
