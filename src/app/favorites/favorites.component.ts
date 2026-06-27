import { Component, OnInit, ChangeDetectorRef, Input, OnDestroy, QueryList, ViewChildren, ElementRef, AfterViewInit, HostListener } from '@angular/core';
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

    // Scroll-based parallax for hero
    scrollY = 0;
    heroOpacity = 1;
    heroScale = 1;
    prevScrollY = 0;
    private scrollRAF: any;

    // Stagger entrance tracking
    hasAnimated = false;
    heroCollapsed = false;

    // Only play the video that the user is actively hovering/viewing
    activeVideoIndex: number | null = null;
    private intersectionObserver?: any;

    @ViewChildren('videoThumb') videoEls!: QueryList<ElementRef<any>>;
    @ViewChildren('foodCard', { read: ElementRef }) foodCards!: QueryList<ElementRef>;

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
        this.videoEls.changes.subscribe(() => {
            this.setupIntersectionObserver();
        });
    }

    ngOnDestroy() {
        this.disconnectObserver();
        this.videoEls?.forEach(el => {
            const v = el.nativeElement;
            v.pause();
            v.muted = true;
            v.src = '';
        });
    }

    /**
     * Staggered entrance animation for cards
     */
    private animateCardsIn() {
        if (this.hasAnimated || !this.foodCards?.length) return;
        this.hasAnimated = true;

        this.foodCards.forEach((cardRef, index) => {
            const el = cardRef.nativeElement;
            // Set CSS custom property for stagger delay
            el.style.setProperty('--card-delay', `${index * 0.06}s`);
            el.classList.add('card-enter');
        });
    }

    /**
     * Track scroll position for hero parallax (throttled via rAF)
     */
    onScroll(event: any) {
        if (this.scrollRAF) cancelAnimationFrame(this.scrollRAF);
        this.scrollRAF = requestAnimationFrame(() => {
            const scrollTop = event.target.scrollTop;
            this.scrollY = scrollTop;
            this.prevScrollY = scrollTop;

            // Parallax fade and scale on hero
            if (scrollTop < 150) {
                this.heroOpacity = Math.max(0, 1 - scrollTop / 150);
                this.heroScale = 1 - scrollTop * 0.0015;
                this.heroCollapsed = false;
            } else {
                this.heroCollapsed = true;
            }
            this.cdr.detectChanges();
        });
    }

    /**
     * Intersection Observer: only play the video card that is most visible
     */
    private setupIntersectionObserver() {
        this.disconnectObserver();

        const videos = this.videoEls?.toArray();
        if (!videos?.length) return;

        this.intersectionObserver = new (window as any).IntersectionObserver(
            (entries: any[], _observer: any) => {
                entries.forEach((entry: any) => {
                    const videoEl = entry.target as any;
                    videoEl.muted = true;

                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        if (videoEl.paused) {
                            videoEl.play().catch(() => { });
                        }
                    } else {
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
        this.hasAnimated = false;
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
            setTimeout(() => this.setupIntersectionObserver(), 100);
            // Animate cards in after data renders
            setTimeout(() => this.animateCardsIn(), 300);
        }
    }

    playReel(reel: Reel) {
        this.navigationService.selectReel(reel.id!);
        this.router.navigate(['/main-app']);
    }

    onThumbLoad(reelId: string, videoEl: any) {
        videoEl.muted = true;
        this.loadedThumbs.add(reelId);
        this.cdr.detectChanges();
    }

    exploreTrending() {
        this.router.navigate(['/main-app']);
    }

    trackByReelId(_index: number, reel: Reel): string {
        return reel.id || '';
    }
}
