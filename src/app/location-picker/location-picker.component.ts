import { Component, EventEmitter, Output, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
    selector: 'app-location-picker',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './location-picker.component.html',
    styleUrls: ['./location-picker.component.scss']
})
export class LocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
    @Output() locationSelected = new EventEmitter<{ lat: number, lng: number }>();
    @Output() cancel = new EventEmitter<void>();

    private map: L.Map | undefined;
    private marker: L.Marker | undefined;

    searchQuery = '';
    searchResults: any[] = [];
    isSearching = false;

    // Default to Bangalore
    selectedLat = 12.9716;
    selectedLng = 77.5946;

    constructor() { }

    ngOnInit(): void { }

    ngAfterViewInit(): void {
        this.initMap();
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    private initMap(): void {
        this.map = L.map('map').setView([this.selectedLat, this.selectedLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add initial marker
        this.addMarker(this.selectedLat, this.selectedLng);

        // Handle map clicks
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            this.updateLocation(e.latlng.lat, e.latlng.lng);
        });

        // Fix map sizing issues
        setTimeout(() => {
            this.map?.invalidateSize();
        }, 100);
    }

    private addMarker(lat: number, lng: number): void {
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            // Create a custom icon to avoid 404s for default markers in some setups
            const icon = L.divIcon({
                className: 'custom-pin',
                html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ff4757" stroke="white" stroke-width="2"/>
               </svg>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });

            this.marker = L.marker([lat, lng], { icon: icon, draggable: true }).addTo(this.map!);

            this.marker.on('dragend', () => {
                const position = this.marker!.getLatLng();
                this.updateLocation(position.lat, position.lng, false);
            });
        }
    }

    private updateLocation(lat: number, lng: number, moveMap = false): void {
        this.selectedLat = lat;
        this.selectedLng = lng;

        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            this.addMarker(lat, lng);
        }

        if (moveMap && this.map) {
            this.map.panTo([lat, lng]);
        }
    }

    async searchLocation(): Promise<void> {
        if (!this.searchQuery.trim()) return;

        this.isSearching = true;
        this.searchResults = [];

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`);
            const data = await response.json();
            this.searchResults = data;
        } catch (error) {
            console.error('Error searching location:', error);
        } finally {
            this.isSearching = false;
        }
    }

    selectSearchResult(result: any): void {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        this.updateLocation(lat, lng, true);
        this.searchResults = []; // Clear results
        this.searchQuery = result.display_name.split(',')[0]; // Update search box with simple name
    }

    confirmSelection(): void {
        this.locationSelected.emit({
            lat: this.selectedLat,
            lng: this.selectedLng
        });
    }

    onCancel(): void {
        this.cancel.emit();
    }
}
