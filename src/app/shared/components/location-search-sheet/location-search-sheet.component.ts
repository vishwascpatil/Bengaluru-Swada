import { Component, OnInit, NgZone, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../../services/location.service';
import { environment } from '../../../../environments/environment';

declare const google: any;
declare const document: any;

interface AutocompletePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

@Component({
  selector: 'app-location-search-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-search-sheet.component.html',
  styleUrls: ['./location-search-sheet.component.scss']
})
export class LocationSearchSheetComponent implements OnInit, OnDestroy {
  @Output() closeSheet = new EventEmitter<void>();
  @Output() locationSelected = new EventEmitter<void>();

  searchQuery = '';
  searchResults: AutocompletePrediction[] = [];
  isSearching = false;
  searchDebounceTimer: any;

  // Google Maps
  googleMapsLoaded = false;
  autocompleteService: any;
  placesService: any;

  // Bangalore Bounds constraints
  private readonly BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };
  private readonly BANGALORE_RADIUS = 30000; // 30km radius

  recentSearches: any[] = [];
  popularLocations = [
    { name: 'Commercial Street', image: 'assets/popular/commercial-street.png', description: 'Shopping & Street Food Hub', lat: 12.9822, lng: 77.6083 },
    { name: 'VV Puram Food Street', image: 'assets/popular/vv-puram.png', description: 'Thindi Beedi - Veg Paradise', lat: 12.9523, lng: 77.5756 },
    { name: 'MG Road', image: 'assets/popular/mg-road.png', description: 'Premium Dining & Cafes', lat: 12.9738, lng: 77.6070 }
  ];

  constructor(
    private locationService: LocationService,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.loadRecentSearches();
    this.initGooglePlaces();
  }

  ngOnDestroy() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  close() {
    this.closeSheet.emit();
  }

  // --- Google Maps Initialization ---
  private initGooglePlaces(): void {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      this.setupServices();
      return;
    }

    const apiKey = environment.googleMapsApiKey;
    if (!apiKey) {
      console.warn('[LocationSearchSheet] Google Maps API Key not found in environment. Make sure you set it in .env');
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => this.setupServices());
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.setupServices();
    };
    script.onerror = () => {
      console.error('[LocationSearchSheet] Failed to load Google Maps script');
    };
    document.head.appendChild(script);
  }

  private setupServices(): void {
    this.ngZone.run(() => {
      this.googleMapsLoaded = true;
      this.autocompleteService = new google.maps.places.AutocompleteService();
      
      const dummyDiv = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(dummyDiv);
    });
  }

  // --- Search Logic ---
  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const query = this.searchQuery.trim();
    if (!query) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    if (!this.googleMapsLoaded) {
      console.warn('[LocationSearchSheet] Google Maps not loaded yet');
      return;
    }

    this.isSearching = true;

    this.searchDebounceTimer = setTimeout(() => {
      this.fetchAutocomplete(query);
    }, 300);
  }

  private fetchAutocomplete(query: string): void {
    if (!this.autocompleteService) {
      this.isSearching = false;
      return;
    }

    try {
      const request = {
        input: query,
        componentRestrictions: { country: 'in' }
      };

      this.autocompleteService.getPlacePredictions(request, (predictions: any[], status: string) => {
        this.ngZone.run(() => {
          this.isSearching = false;

          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            console.warn('[LocationSearchSheet] Google Places API returned status:', status);
            this.searchResults = [];
            return;
          }

          // Filter predictions to only show Bangalore/Bengaluru results
          this.searchResults = predictions
            .filter((p: any) => {
              const desc = p.description.toLowerCase();
              return desc.includes('bengaluru') || desc.includes('bangalore') || desc.includes('karnataka');
            })
            .map((prediction: any) => ({
              placeId: prediction.place_id,
              mainText: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
              secondaryText: prediction.structured_formatting?.secondary_text || prediction.description,
              description: prediction.description
            }));
        });
      });
    } catch (e) {
      console.error('[LocationSearchSheet] Error calling getPlacePredictions:', e);
      this.isSearching = false;
      this.searchResults = [];
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearching = false;
  }

  // --- Selection Logic ---
  selectPrediction(prediction: AutocompletePrediction): void {
    if (!this.placesService) return;

    this.placesService.getDetails({
      placeId: prediction.placeId,
      fields: ['name', 'geometry']
    }, (place: any, status: string) => {
      this.ngZone.run(() => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const locationName = prediction.mainText;

          this.saveRecentSearch(locationName, lat, lng);
          this.locationService.updateLocation(locationName, lat, lng);
          this.locationSelected.emit();
          this.close();
        }
      });
    });
  }

  useCurrentLocation(): void {
    this.locationService.getUserLocation().then(coords => {
      this.locationService.getAreaName(coords.latitude, coords.longitude).then(name => {
        this.locationService.updateLocation(name, coords.latitude, coords.longitude);
        this.locationSelected.emit();
        this.close();
      });
    });
  }

  selectRecentSearch(recent: any): void {
    this.locationService.updateLocation(recent.name, recent.lat, recent.lng);
    this.locationSelected.emit();
    this.close();
  }

  selectPopularLocation(popular: any): void {
    this.locationService.updateLocation(popular.name, popular.lat, popular.lng);
    this.locationSelected.emit();
    this.close();
  }

  // --- Local Storage ---
  private loadRecentSearches(): void {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        this.recentSearches = JSON.parse(stored);
      }
    } catch (e) { }
  }

  private saveRecentSearch(name: string, lat: number, lng: number): void {
    const newEntry = { name, lat, lng };
    this.recentSearches = this.recentSearches.filter(r => r.name !== name);
    this.recentSearches.unshift(newEntry);
    if (this.recentSearches.length > 5) {
      this.recentSearches.pop();
    }
    localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
  }

  clearRecentSearches(): void {
    this.recentSearches = [];
    localStorage.removeItem('recentSearches');
  }
}
