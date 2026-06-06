import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { Reel } from '../models/reel.model';
import { LocationService } from '../services/location.service';
import { NavigationService } from '../services/navigation.service';
import { AdmobService } from '../services/admob.service';
import { OnDestroy } from '@angular/core';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
    searchQuery = '';
    reels: any[] = [];
    filteredReels: any[] = [];
    isLoading = false;
    loadedThumbs: Set<string> = new Set();

    // Location selection
    locationName = 'Koramangala, Bangalore';
    showLocationModal = false;
    locationSearchQuery = '';

    // Comprehensive Bangalore locations with coordinates and pincodes
    locations = [
        { name: 'Adugodi', pincode: '560030', lat: 12.971600, lng: 77.594600 },
        { name: 'Agaram', pincode: '560007', lat: 12.843100, lng: 77.486300 },
        { name: 'Air Force Stn. Yelahanka', pincode: '560063', lat: 13.104800, lng: 77.576300 },
        { name: 'Banashankari', pincode: '560050', lat: 12.925453, lng: 77.546761 },
        { name: 'Banashankari 2nd Stage', pincode: '560070', lat: 12.924900, lng: 77.566200 },
        { name: 'Banashankari 3rd Stage', pincode: '560085', lat: 12.921600, lng: 77.554300 },
        { name: 'Banashankari 6th Stage', pincode: '560062', lat: 12.896300, lng: 77.535300 },
        { name: 'Banaswadi', pincode: '560043', lat: 13.015900, lng: 77.651600 },
        { name: 'Basavanapura', pincode: '560036', lat: 12.983500, lng: 77.677300 },
        { name: 'Basaveshwaranagar', pincode: '560079', lat: 12.997500, lng: 77.533400 },
        { name: 'Bellandur', pincode: '560103', lat: 12.930400, lng: 77.678400 },
        { name: 'Bidadi', pincode: '562109', lat: 12.827400, lng: 77.397100 },
        { name: 'Bilekahalli', pincode: '560076', lat: 12.898900, lng: 77.610300 },
        { name: 'Binnamangala', pincode: '560038', lat: 12.983700, lng: 77.638800 },
        { name: 'Bommanahalli', pincode: '560068', lat: 12.908200, lng: 77.624500 },
        { name: 'Bommasandra', pincode: '560099', lat: 12.800900, lng: 77.699000 },
        { name: 'Brookefield', pincode: '560037', lat: 12.969800, lng: 77.718400 },
        { name: 'BTM 2nd Stage', pincode: '560076', lat: 12.916700, lng: 77.610800 },
        { name: 'Budigere', pincode: '562129', lat: 13.035000, lng: 77.747800 },
        { name: 'Byatarayanapura', pincode: '560026', lat: 13.056000, lng: 77.592600 },
        { name: 'C V Raman Nagar', pincode: '560093', lat: 12.976700, lng: 77.659700 },
        { name: 'Chamarajpet', pincode: '560018', lat: 12.958200, lng: 77.570900 },
        { name: 'Channasandra', pincode: '560067', lat: 12.962900, lng: 77.758000 },
        { name: 'Chikbasavanapura', pincode: '560067', lat: 12.994800, lng: 77.732700 },
        { name: 'Chickpet', pincode: '560053', lat: 12.966200, lng: 77.576700 },
        { name: 'Chikkalasandra', pincode: '560061', lat: 12.913200, lng: 77.545400 },
        { name: 'Choodasandra', pincode: '560099', lat: 12.884800, lng: 77.678500 },
        { name: 'Cox Town', pincode: '560005', lat: 12.999600, lng: 77.622900 },
        { name: 'D J Halli', pincode: '560005', lat: 13.008300, lng: 77.622800 },
        { name: 'Doddabidarakallu', pincode: '560073', lat: 13.042600, lng: 77.501900 },
        { name: 'Doorvaninagar', pincode: '560016', lat: 13.025200, lng: 77.668800 },
        { name: 'Ejipura', pincode: '560047', lat: 12.943700, lng: 77.627400 },
        { name: 'Electronic City', pincode: '560100', lat: 12.839400, lng: 77.677000 },
        { name: 'Frazer Town', pincode: '560005', lat: 12.999000, lng: 77.622600 },
        { name: 'Gandhi Nagar', pincode: '560009', lat: 12.977200, lng: 77.573000 },
        { name: 'Gavipuram Extn', pincode: '560019', lat: 12.955200, lng: 77.566800 },
        { name: 'Geddalahalli', pincode: '560077', lat: 13.030900, lng: 77.638900 },
        { name: 'Gottigere', pincode: '560083', lat: 12.872500, lng: 77.594400 },
        { name: 'Halasur', pincode: '560042', lat: 12.983300, lng: 77.619400 },
        { name: 'Hebbal', pincode: '560024', lat: 13.035500, lng: 77.606000 },
        { name: 'Heggere', pincode: '560073', lat: 13.017200, lng: 77.500400 },
        { name: 'HMT Layout', pincode: '560031', lat: 13.039000, lng: 77.547000 },
        { name: 'Horamavu', pincode: '560043', lat: 13.026700, lng: 77.657100 },
        { name: 'Hosakerehalli', pincode: '560085', lat: 12.925100, lng: 77.536000 },
        { name: 'HSR Layout', pincode: '560102', lat: 12.912100, lng: 77.644600 },
        { name: 'Hulimavu', pincode: '560076', lat: 12.882900, lng: 77.608300 },
        { name: 'Indiranagar', pincode: '560038', lat: 12.971900, lng: 77.641200 },
        { name: 'ISRO Layout', pincode: '560078', lat: 12.905600, lng: 77.566500 },
        { name: 'J P Nagar', pincode: '560078', lat: 12.904100, lng: 77.585200 },
        { name: 'Jakkur', pincode: '560064', lat: 13.081100, lng: 77.592400 },
        { name: 'Jalahalli', pincode: '560013', lat: 13.049100, lng: 77.542200 },
        { name: 'Jayanagar 4th T Block', pincode: '560041', lat: 12.935200, lng: 77.583700 },
        { name: 'Jigani', pincode: '560105', lat: 12.784900, lng: 77.642000 },
        { name: 'Kadubeesanahalli', pincode: '560103', lat: 12.956000, lng: 77.702600 },
        { name: 'Kadugodi', pincode: '560067', lat: 12.996800, lng: 77.758300 },
        { name: 'Kaggadasapura', pincode: '560093', lat: 12.978200, lng: 77.680100 },
        { name: 'Kalasipalyam', pincode: '560002', lat: 12.963600, lng: 77.577700 },
        { name: 'Kalyananagar', pincode: '560043', lat: 13.028800, lng: 77.640200 },
        { name: 'Kamakshipalya', pincode: '560079', lat: 12.982900, lng: 77.520800 },
        { name: 'Kengeri', pincode: '560060', lat: 12.917700, lng: 77.482200 },
        { name: 'Kodichikkanahalli', pincode: '560068', lat: 12.890300, lng: 77.623900 },
        { name: 'Koramangala', pincode: '560095', lat: 12.934400, lng: 77.617300 },
        { name: 'KR Puram', pincode: '560036', lat: 13.002200, lng: 77.695100 },
        { name: 'Kyalasanahalli', pincode: '560077', lat: 13.026900, lng: 77.658900 },
        { name: 'Laggere', pincode: '560058', lat: 13.010200, lng: 77.515700 },
        { name: 'Mahadevapura', pincode: '560048', lat: 12.992300, lng: 77.695700 },
        { name: 'Majestic', pincode: '560009', lat: 12.977900, lng: 77.572000 },
        { name: 'Malleshpalya', pincode: '560075', lat: 12.983900, lng: 77.670200 },
        { name: 'Malleshwaram', pincode: '560003', lat: 12.999900, lng: 77.571500 },
        { name: 'Manorayanapalya', pincode: '560032', lat: 13.036500, lng: 77.572600 },
        { name: 'Marathahalli', pincode: '560037', lat: 12.956300, lng: 77.701900 },
        { name: 'Mathikere', pincode: '560054', lat: 13.030700, lng: 77.563900 },
        { name: 'Munnekollal', pincode: '560037', lat: 12.956800, lng: 77.704500 },
        { name: 'Nagarbhavi', pincode: '560072', lat: 12.967400, lng: 77.504900 },
        { name: 'Nayandahalli', pincode: '560039', lat: 12.941300, lng: 77.515900 },
        { name: 'Neelasandra', pincode: '560047', lat: 12.947900, lng: 77.623600 },
        { name: 'Peenya', pincode: '560058', lat: 13.019400, lng: 77.515300 },
        { name: 'Raghuvanahalli', pincode: '560062', lat: 12.882100, lng: 77.546600 },
        { name: 'Rajajinagar', pincode: '560010', lat: 12.998900, lng: 77.553600 },
        { name: 'Ramamurthy Nagar', pincode: '560016', lat: 13.004500, lng: 77.679700 },
        { name: 'RT Nagar', pincode: '560032', lat: 13.026600, lng: 77.597900 },
        { name: 'Sadashivanagar', pincode: '560080', lat: 13.009300, lng: 77.577200 },
        { name: 'Shanti Nagar', pincode: '560027', lat: 12.953700, lng: 77.592600 },
        { name: 'Tavarekere', pincode: '560029', lat: 12.931000, lng: 77.610600 },
        { name: 'Varthur', pincode: '560087', lat: 12.935200, lng: 77.750100 },
        { name: 'Vidyaranyapura', pincode: '560097', lat: 13.067000, lng: 77.560000 }
    ];

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
        private admobService: AdmobService,
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

        // Initialize location name if not already set globally
        let currentLocValue: any = null;
        this.locationService.currentLocation$.subscribe(val => currentLocValue = val).unsubscribe();

        if (!currentLocValue) {
            try {
                const userLoc = await this.locationService.getUserLocation();
                this.locationName = (await this.locationService.getAreaName(userLoc.latitude, userLoc.longitude)) + ', Bangalore';
            } catch (e) {
                console.warn('Could not get initial location name', e);
            }
        } else {
            this.locationName = `${currentLocValue.name}, Bangalore`;
        }

        this.admobService.showBanner();
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

    hasSearchMatches = false;

    async applyFilters() {
        // Strict requirement: Don't show results if search query is empty
        if (!this.searchQuery.trim()) {
            this.filteredReels = [];
            this.hasSearchMatches = false;
            return;
        }

        // Lazy load reels if needed
        if (this.reels.length === 0 && !this.isLoading) {
            await this.loadReels();
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

        // Logic check: Do we have matches relevant to the text query?
        this.hasSearchMatches = result.length > 0;

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
        console.log('[Search] Opening reel:', reel.id);
        this.navigationService.selectReel(reel.id);
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
        if (!this.locationSearchQuery.trim()) {
            return this.locations;
        }
        const query = this.locationSearchQuery.toLowerCase();
        return this.locations.filter(loc =>
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

    goBack() {
        this.router.navigate(['/main-app']);
    }

    onThumbLoad(reelId: string) {
        this.loadedThumbs.add(reelId);
    }

    ngOnDestroy() {
        this.admobService.hideBanner();
    }
}
