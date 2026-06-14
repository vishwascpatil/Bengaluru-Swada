import { Component, EventEmitter, Input, Output, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../services/location.service';
import { environment } from '../../environments/environment';

declare const google: any;
declare const document: any;

@Component({
    selector: 'app-location-picker',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe],
    templateUrl: './location-picker.component.html',
    styleUrls: ['./location-picker.component.scss']
})
export class LocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
    @Output() locationSelected = new EventEmitter<{ lat: number, lng: number, address?: string }>();
    @Output() cancel = new EventEmitter<void>();

    @Input() initialLat: number | null = null;
    @Input() initialLng: number | null = null;

    private map: any;
    private marker: any;
    private autocompleteService: any;
    private placesService: any;
    private geocoder: any;
    private searchDebounceTimer: any;

    searchQuery = '';
    searchResults: any[] = [];
    isSearching = false;
    isConfirming = false;
    googleMapsLoaded = false;
    selectedAddress = '';

    // Will be overridden by @Input() initialLat/initialLng or getCurrentLocation
    selectedLat = 12.9716;
    selectedLng = 77.5946;

    constructor(
        private locationService: LocationService,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        // Use initial coordinates if provided (e.g. from parent form)
        if (this.initialLat !== null && this.initialLng !== null) {
            this.selectedLat = this.initialLat;
            this.selectedLng = this.initialLng;
        }
    }

    ngAfterViewInit(): void {
        this.loadGoogleMaps();
    }

    ngOnDestroy(): void {
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
    }

    /**
     * Load Google Maps JS SDK (reuse if already loaded)
     */
    private loadGoogleMaps(): void {
        if (typeof google !== 'undefined' && google.maps) {
            this.onGoogleMapsReady();
            return;
        }

        const apiKey = environment.googleMapsApiKey;
        if (!apiKey) {
            console.error('[LocationPicker] Google Maps API Key not found');
            return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            // Script tag exists — wait for it to load
            if (typeof google !== 'undefined' && google.maps) {
                this.onGoogleMapsReady();
            } else {
                existingScript.addEventListener('load', () => this.onGoogleMapsReady());
            }
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => this.onGoogleMapsReady();
        script.onerror = () => console.error('[LocationPicker] Failed to load Google Maps');
        document.head.appendChild(script);
    }

    /**
     * Called when Google Maps SDK is ready
     */
    private onGoogleMapsReady(): void {
        this.ngZone.run(() => {
            this.googleMapsLoaded = true;
            this.autocompleteService = new google.maps.places.AutocompleteService();
            const dummyDiv = document.createElement('div');
            this.placesService = new google.maps.places.PlacesService(dummyDiv);
            this.geocoder = new google.maps.Geocoder();
            this.initMap();
        });
    }

    /**
     * Initialize Google Map
     */
    private initMap(): void {
        const mapElement = document.getElementById('google-map');
        if (!mapElement) return;

        this.map = new google.maps.Map(mapElement, {
            center: { lat: this.selectedLat, lng: this.selectedLng },
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        // Add draggable marker
        this.marker = new google.maps.Marker({
            position: { lat: this.selectedLat, lng: this.selectedLng },
            map: this.map,
            draggable: true,
            animation: google.maps.Animation.DROP
        });

        // Handle marker drag
        this.marker.addListener('dragend', () => {
            const pos = this.marker.getPosition();
            this.ngZone.run(() => {
                this.selectedLat = pos.lat();
                this.selectedLng = pos.lng();
                this.reverseGeocode(this.selectedLat, this.selectedLng);
            });
        });

        // Handle map click
        this.map.addListener('click', (e: any) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            this.ngZone.run(() => {
                this.updateMarker(lat, lng);
                this.reverseGeocode(lat, lng);
            });
        });

        // Try to get user's current location only if no initial coordinates were provided
        if (this.initialLat === null || this.initialLng === null) {
            this.tryGetCurrentLocation();
        }
    }

    /**
     * Try to center map on user's current location
     */
    private async tryGetCurrentLocation(): Promise<void> {
        try {
            const loc = await this.locationService.getUserLocation();
            this.updateMarker(loc.latitude, loc.longitude);
            this.map.setCenter({ lat: loc.latitude, lng: loc.longitude });
            this.reverseGeocode(loc.latitude, loc.longitude);
        } catch (e) {
            console.warn('[LocationPicker] Could not get current location, using default');
        }
    }

    /**
     * Update marker position
     */
    private updateMarker(lat: number, lng: number): void {
        this.selectedLat = lat;
        this.selectedLng = lng;
        if (this.marker) {
            this.marker.setPosition({ lat, lng });
        }
    }

    /**
     * Reverse geocode to get address from coords
     */
    private reverseGeocode(lat: number, lng: number): void {
        if (!this.geocoder) return;

        this.geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
            this.ngZone.run(() => {
                if (status === 'OK' && results && results.length > 0) {
                    this.selectedAddress = results[0].formatted_address;
                } else {
                    this.selectedAddress = '';
                }
            });
        });
    }

    /**
     * Search for locations using Google Places Autocomplete
     */
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

        if (!this.googleMapsLoaded || !this.autocompleteService) return;

        this.isSearching = true;

        this.searchDebounceTimer = setTimeout(() => {
            this.fetchAutocomplete(query);
        }, 300);
    }

    private fetchAutocomplete(query: string): void {
        const request = {
            input: query,
            componentRestrictions: { country: 'in' },
            location: new google.maps.LatLng(12.9716, 77.5946),
            radius: 50000 // 50km around Bangalore
        };

        this.autocompleteService.getPlacePredictions(request, (predictions: any[], status: string) => {
            this.ngZone.run(() => {
                this.isSearching = false;
                if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                    this.searchResults = [];
                    return;
                }

                this.searchResults = predictions.map((p: any) => ({
                    placeId: p.place_id,
                    mainText: p.structured_formatting?.main_text || p.description.split(',')[0],
                    secondaryText: p.structured_formatting?.secondary_text || '',
                    description: p.description
                }));
            });
        });
    }

    /**
     * Select a search result and move the map
     */
    selectSearchResult(result: any): void {
        if (!this.placesService) return;

        this.placesService.getDetails({
            placeId: result.placeId,
            fields: ['name', 'geometry', 'formatted_address']
        }, (place: any, status: string) => {
            this.ngZone.run(() => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry?.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();

                    this.updateMarker(lat, lng);
                    this.map.setCenter({ lat, lng });
                    this.map.setZoom(16);

                    this.selectedAddress = place.formatted_address || result.description;
                    this.searchQuery = result.mainText;
                    this.searchResults = [];
                }
            });
        });
    }

    /**
     * Center on current location
     */
    async centerOnCurrentLocation(): Promise<void> {
        try {
            const loc = await this.locationService.getUserLocation();
            this.updateMarker(loc.latitude, loc.longitude);
            this.map.setCenter({ lat: loc.latitude, lng: loc.longitude });
            this.map.setZoom(16);
            this.reverseGeocode(loc.latitude, loc.longitude);
        } catch (e) {
            console.error('[LocationPicker] Error getting current location:', e);
        }
    }

    /**
     * Confirm the selected location
     */
    async confirmSelection(): Promise<void> {
        this.isConfirming = true;
        try {
            const address = this.selectedAddress ||
                await this.locationService.getExactAddress(this.selectedLat, this.selectedLng);
            this.locationSelected.emit({
                lat: this.selectedLat,
                lng: this.selectedLng,
                address: address
            });
        } catch (e) {
            console.error('[LocationPicker] Error confirming selection:', e);
            this.locationSelected.emit({
                lat: this.selectedLat,
                lng: this.selectedLng
            });
        } finally {
            this.isConfirming = false;
        }
    }

    onCancel(): void {
        this.cancel.emit();
    }
}
