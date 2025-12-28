import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { Reel } from '../models/reel.model';
import { LocationService } from '../services/location.service';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
    searchQuery = '';
    reels: any[] = [];
    filteredReels: any[] = [];
    isLoading = false;

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
        private router: Router
    ) { }

    async ngOnInit() {
        // Subscribe to global location changes
        this.locationService.currentLocation$.subscribe(loc => {
            if (loc) {
                this.locationName = `${loc.name}, Bangalore`;
                // Don't auto-reload here, wait for user action
                if (this.reels.length > 0) {
                    this.loadReels();
                }
            }
        });

        // Initialize location name if not set
        try {
            const userLoc = await this.locationService.getUserLocation();
            this.locationName = this.locationService.getAreaName(userLoc.latitude, userLoc.longitude) + ', Bangalore';
        } catch (e) {
            console.warn('Could not get initial location name', e);
        }
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
                        // Get numeric distance for filtering
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
                    distanceVal, // Numeric for logic
                    distanceStr, // String for display
                    // Mock rating for now as it's in the design
                    rating: (4 + Math.random()).toFixed(1)
                };
            }));

        } catch (error) {
            console.error('Error loading reels for search:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async applyFilters() {
        // Only load if we haven't loaded yet and there's some active interaction
        if (this.reels.length === 0 && !this.isLoading) {
            // Check if any filter is non-default or search query is present
            const hasActiveSearch = this.searchQuery.trim().length > 0;
            const hasActiveFilters = this.selectedCategory !== 'All' ||
                this.selectedPriceRange.label !== 'All' ||
                this.selectedDistance.label !== 'All';

            if (hasActiveSearch || hasActiveFilters) {
                await this.loadReels();
            } else {
                this.filteredReels = [];
                return;
            }
        }

        let result = this.reels;

        // 1. Text Search
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter(r =>
                r.title?.toLowerCase().includes(q) ||
                r.vendor?.toLowerCase().includes(q)
            );
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
                // Range handling for 1-3, 3-5
                const max = this.selectedDistance.max;
                const min = this.distances[this.distances.indexOf(this.selectedDistance) - 1]?.max || 0;
                // Re-logic for range:
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
        // Navigate to feed with this reel
        // This logic relies on MainAppComponent handling state
        this.router.navigate(['/main-app'], {
            state: {
                openFeed: true,
                reelId: reel.id
            }
        });
    }

    // Location Modal methods
    openLocationModal() {
        this.showLocationModal = true;
        this.locationSearchQuery = '';
    }

    closeLocationModal() {
        this.showLocationModal = false;
        this.locationSearchQuery = '';
    }

    selectLocation(loc: any) {
        this.locationService.updateLocation(loc.name, loc.lat, loc.lng);
        this.closeLocationModal();
    }

    get filteredLocations() {
        const query = this.locationSearchQuery.toLowerCase().trim();
        if (!query) return this.locationService.AREAS;

        return this.locationService.AREAS.filter(loc =>
            loc.name.toLowerCase().includes(query) ||
            loc.pincode.includes(query)
        );
    }

    reset() {
        this.searchQuery = '';
        this.reels = [];
        this.filteredReels = [];
        this.isLoading = false;

        // Reset Filters
        this.selectedCategory = 'All';
        this.selectedPriceRange = this.priceRanges[0];
        this.selectedDistance = this.distances[0];
        this.selectedSort = 'Nearest First';
    }
}
