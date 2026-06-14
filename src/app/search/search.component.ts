import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, ElementRef, AfterViewInit, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { ReelsService } from '../services/reels.service';
import { Reel } from '../models/reel.model';
import { LocationService } from '../services/location.service';
import { NavigationService } from '../services/navigation.service';
import { LocationSearchSheetComponent } from '../shared/components/location-search-sheet/location-search-sheet.component';

declare const window: any;

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [CommonModule, FormsModule, LocationSearchSheetComponent],
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('searchInput') searchInput!: ElementRef;
    @ViewChildren('videoThumb') videoEls!: QueryList<ElementRef<any>>;
    isExiting = false;
    searchQuery = '';
    reels: any[] = [];
    filteredReels: any[] = [];
    isLoading = false;
    loadedThumbs: Set<string> = new Set();

    // IntersectionObserver for thumbnail videos
    private intersectionObserver?: any;

    // Location selection
    locationName = 'Koramangala, Bangalore';
    showLocationModal = false;
    locationSearchQuery = '';



    // Filters
    categories = ['All', 'South Indian', 'North Indian', 'Street Food', 'Desserts', 'Beverages'];
    selectedCategory = 'All';

    priceRanges = [
        { label: 'All', min: 0, max: Infinity },
        { label: '₹0-30', min: 0, max: 30 },
        { label: '₹31-60', min: 31, max: 60 },
        { label: '₹61-100', min: 61, max: 100 },
        { label: '₹100+', min: 101, max: Infinity }
    ];
    selectedPriceRange = this.priceRanges[0];

    distances = [
        { label: 'All', max: Infinity },
        { label: '< 1 km', max: 1 },
        { label: '1-3 km', max: 3 },
        { label: '3-5 km', max: 5 },
        { label: '5+ km', max: Infinity } // This logic might need refinement, usually means > 5
    ];
    selectedDistance = this.distances[0];

    sortOptions = ['Nearest First', 'Price: Low to High', 'Price: High to Low'];
    selectedSort = 'Nearest First';

    constructor(
        private reelsService: ReelsService,
        private locationService: LocationService,
        private navigationService: NavigationService,
        private router: Router,
        private auth: Auth,
        private firestore: Firestore
    ) { }

    hasSearchMatches = false;
    isSearchingMode = false;
    trendingSearches = ['Dosa', 'Biryani', 'Vada Pav', 'Idli', 'Filter Coffee', 'Samosa'];

    selectTrendingSearch(term: string) {
        this.searchQuery = term;
        this.applyFilters();
    }

    getCategoryEmoji(category: string): string {
        const emojis: { [key: string]: string } = {
            'All': '🌟',
            'South Indian': '🍛',
            'North Indian': '🍲',
            'Street Food': '🍢',
            'Desserts': '🍨',
            'Beverages': '🍹'
        };
        return emojis[category] || '🍔';
    }

    async ngOnInit() {
        // Subscribe to global location changes
        this.locationService.currentLocation$.subscribe(loc => {
            if (loc) {
                this.locationName = `${loc.name}, Bangalore`;
                if (this.reels.length > 0) {
                    this.loadReels().then(() => this.applyFilters());
                }
            }
        });

        // Initialize location name if not already set globally
        let currentLocValue: any = null;
        this.locationService.currentLocation$.subscribe(val => currentLocValue = val).unsubscribe();

        if (!currentLocValue) {
            // Try loading saved location from Firestore first
            const saved = await this.loadSavedLocation();
            if (saved) {
                this.locationName = `${saved.name}, Bangalore`;
            } else {
                try {
                    const userLoc = await this.locationService.getUserLocation();
                    this.locationName = (await this.locationService.getAreaName(userLoc.latitude, userLoc.longitude)) + ', Bangalore';
                } catch (e) {
                    console.warn('Could not get initial location name', e);
                }
            }
        } else {
            this.locationName = `${currentLocValue.name}, Bangalore`;
        }

        // Preload reels immediately on page entry
        await this.loadReels();
        await this.applyFilters();
    }

    async loadReels() {
        this.isLoading = true;
        try {
            // Fetch a larger set for search
            const allReels = await this.reelsService.getReels(50);

            // Calculate distances
            this.reels = await Promise.all(allReels.map(async (reel) => {
                let distanceVal = Infinity;
                let distanceStr = '-- km';

                if (reel.latitude && reel.longitude) {
                    try {
                        const userLoc = await this.locationService.getUserLocation();
                        distanceVal = this.locationService.calculateDistance(
                            userLoc.latitude, userLoc.longitude,
                            reel.latitude, reel.longitude
                        );
                        distanceStr = distanceVal.toFixed(1) + ' km';
                    } catch (e) {
                        console.error('Error calculating distance', e);
                    }
                }

                return {
                    ...reel,
                    distanceVal,
                    distanceStr,
                    rating: (4 + Math.random() * 0.9).toFixed(1)
                };
            }));

        } catch (error) {
            console.error('Error loading reels for search:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async applyFilters() {
        // Lazy load reels if needed
        if (this.reels.length === 0 && !this.isLoading) {
            await this.loadReels();
        }

        this.isSearchingMode = this.searchQuery.trim().length > 0;
        let result = this.reels;

        // 1. Text Search
        if (this.isSearchingMode) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter(r =>
                r.title?.toLowerCase().includes(q) ||
                r.vendor?.toLowerCase().includes(q)
            );
        }

        // Logic check: Do we have matches relevant to the text query?
        this.hasSearchMatches = this.isSearchingMode && result.length > 0;

        // If in search mode but no matches, we keep the original result set as trending/popular fallback
        if (this.isSearchingMode && result.length === 0) {
            result = this.reels; // Fallback to all reels (popular)
        }

        // 2. Category 
        if (this.selectedCategory !== 'All') {
            result = result.filter(r => r.categories && Array.isArray(r.categories) && r.categories.includes(this.selectedCategory));
        }

        // 3. Price
        result = result.filter(r => {
            const price = Number(r.price);
            return price >= this.selectedPriceRange.min && price <= this.selectedPriceRange.max;
        });

        // 4. Distance
        if (this.selectedDistance.label !== 'All') {
            if (this.selectedDistance.label === '5+ km') {
                result = result.filter(r => r.distanceVal > 5 && r.distanceVal !== Infinity);
            } else if (this.selectedDistance.label === '< 1 km') {
                result = result.filter(r => r.distanceVal < 1);
            } else {
                const max = this.selectedDistance.max;
                if (this.selectedDistance.label === '1-3 km') {
                    result = result.filter(r => r.distanceVal >= 1 && r.distanceVal <= 3);
                } else if (this.selectedDistance.label === '3-5 km') {
                    result = result.filter(r => r.distanceVal >= 3 && r.distanceVal <= 5);
                }
            }
        }

        // 5. Sort
        if (this.selectedSort === 'Nearest First') {
            result.sort((a, b) => a.distanceVal - b.distanceVal);
        } else if (this.selectedSort === 'Price: Low to High') {
            result.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (this.selectedSort === 'Price: High to Low') {
            result.sort((a, b) => Number(b.price) - Number(a.price));
        }

        this.filteredReels = result;

        // Re-observe videos after filter change
        setTimeout(() => this.setupIntersectionObserver(), 100);
    }

    selectCategory(cat: string) {
        this.selectedCategory = cat;
        this.applyFilters();
    }

    selectPrice(range: any) {
        this.selectedPriceRange = range;
        this.applyFilters();
    }

    selectDistance(dist: any) {
        this.selectedDistance = dist;
        this.applyFilters();
    }

    selectSort(option: string) {
        this.selectedSort = option;
        this.applyFilters();
    }

    openReel(reel: any) {
        console.log('[Search] Opening reel:', reel.id);
        // Pass the full reel object so the video feed can use it directly
        // This avoids issues where the feed's reels array and search's reels array
        // may have diverged due to separate async getReels(50) calls
        this.navigationService.selectReel(reel.id, reel);
        this.isExiting = true;
        setTimeout(() => {
            // Only navigate if not already on main-app (e.g., standalone /search route)
            // When embedded as a tab within main-app, the NavigationService subscription handles switching
            if (this.router.url !== '/main-app') {
                this.router.navigate(['/main-app']);
            }
        }, 350);
    }

    /**
     * Load the user's saved location from Firestore users/{uid}
     */
    private async loadSavedLocation(): Promise<{ name: string; lat: number; lng: number } | null> {
        try {
            const user = this.auth.currentUser;
            if (!user?.uid) return null;

            const userDocRef = doc(this.firestore, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) return null;

            const data = userDocSnap.data();
            if (data['latitude'] && data['longitude'] && data['locationName']) {
                // Set in-memory state so other components benefit (avoids redundant Firestore write)
                this.locationService.setUserLocation(data['latitude'], data['longitude']);
                return {
                    name: data['locationName'],
                    lat: data['latitude'],
                    lng: data['longitude']
                };
            }
            return null;
        } catch (error) {
            console.warn('[Search] Failed to load saved location from Firestore:', error);
            return null;
        }
    }

    // Location Modal methods
    openLocationModal() {
        this.showLocationModal = true;
    }

    closeLocationModal() {
        this.showLocationModal = false;
    }

    onLocationSelected() {
        // Wait briefly for the new location to be emitted by the service
        setTimeout(() => {
            if (this.reels.length > 0) {
                this.loadReels();
            }
        }, 100);
    }

    reset() {
        this.searchQuery = '';
        this.isSearchingMode = false;
        this.hasSearchMatches = false;

        // Reset Filters
        this.selectedCategory = 'All';
        this.selectedPriceRange = this.priceRanges[0];
        this.selectedDistance = this.distances[0];
        this.selectedSort = 'Nearest First';

        this.applyFilters();
    }

    ngAfterViewInit() {
        // Setup IntersectionObserver for video thumbnails
        this.setupIntersectionObserver();
        this.videoEls?.changes?.subscribe(() => {
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
     * IntersectionObserver: only play thumb videos that are visible on screen.
     * Videos are always muted. This prevents all N videos from playing
     * simultaneously on Android WebView.
     */
    private setupIntersectionObserver() {
        this.disconnectObserver();

        const videos = this.videoEls?.toArray();
        if (!videos?.length) return;

        this.intersectionObserver = new (window as any).IntersectionObserver(
            (entries: any[]) => {
                entries.forEach((entry: any) => {
                    const videoEl = entry.target as any;
                    // Force muted always — never allow audio on thumbnail grid
                    videoEl.muted = true;

                    if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                        if (videoEl.paused) {
                            videoEl.play().catch(() => {});
                        }
                    } else {
                        if (!videoEl.paused) {
                            videoEl.pause();
                        }
                    }
                });
            },
            {
                threshold: [0, 0.3, 1.0],
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

    goBack() {
        this.isExiting = true;
        // Wait for slide-down animation to complete before route change
        setTimeout(() => {
            this.router.navigate(['/main-app']);
        }, 350);
    }

    onThumbLoad(reelId: string) {
        this.loadedThumbs.add(reelId);
    }


}
