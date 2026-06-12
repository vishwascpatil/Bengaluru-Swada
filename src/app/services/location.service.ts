import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import FusedLocation from '../plugins/fused-location.plugin';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private userLocation: { latitude: number; longitude: number } | null = null;
    private locationPromise: Promise<{ latitude: number; longitude: number }> | null = null;
    private readonly LOCATION_TIMEOUT_MS = 5000; // 5s hard timeout
    private readonly DEFAULT_LOCATION = { latitude: 12.9352, longitude: 77.6245 }; // Koramangala

    public readonly AREAS = [];

    private locationSource = new BehaviorSubject<{ name: string; lat: number; lng: number } | null>(null);
    currentLocation$ = this.locationSource.asObservable();

    updateLocation(name: string, lat: number, lng: number) {
        this.setUserLocation(lat, lng);
        this.locationSource.next({ name, lat, lng });
    }

    private readonly DEFAULT_LOCATION_DATA = { name: 'Koramangala', lat: 12.9352, lng: 77.6245 };

    /**
     * Get user's current location with singleton promise, caching, and hard timeout.
     * Uses FusedLocationProviderClient on native Android, falls back to navigator.geolocation on web.
     */
    getUserLocation(): Promise<{ latitude: number; longitude: number }> {
        // Return cached location if available
        if (this.userLocation) {
            return Promise.resolve(this.userLocation);
        }

        // Return existing in-flight promise
        if (this.locationPromise) {
            return this.locationPromise;
        }

        // Use native FusedLocation plugin on Android
        if (Capacitor.isNativePlatform()) {
            this.locationPromise = this.getNativeLocation();
            return this.locationPromise;
        }

        // Fallback: Web browser geolocation
        this.locationPromise = this.getWebLocation();
        return this.locationPromise;
    }

    /**
     * Get location using native FusedLocationProviderClient via Capacitor plugin
     */
    private async getNativeLocation(): Promise<{ latitude: number; longitude: number }> {
        try {
            const result = await FusedLocation.getCurrentLocation({
                enableHighAccuracy: true,
                timeout: 10000
            });
            this.userLocation = {
                latitude: result.latitude,
                longitude: result.longitude
            };
            console.log('[LocationService] Native FusedLocation:', this.userLocation);
            return this.userLocation;
        } catch (error) {
            console.warn('[LocationService] Native location failed, using default:', error);
            this.userLocation = this.DEFAULT_LOCATION;
            this.locationPromise = null;
            return this.DEFAULT_LOCATION;
        }
    }

    /**
     * Get location using browser navigator.geolocation (web fallback)
     */
    private getWebLocation(): Promise<{ latitude: number; longitude: number }> {
        return new Promise<{ latitude: number; longitude: number }>((resolve) => {
            let resolved = false;

            // Hard fallback timeout
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.warn('[LocationService] Timeout expired. Using default location.');
                    this.userLocation = this.DEFAULT_LOCATION;
                    resolve(this.DEFAULT_LOCATION);
                    this.locationPromise = null; // Reset promise so we can retry later if needed
                }
            }, this.LOCATION_TIMEOUT_MS);

            if (!('geolocation' in (navigator as any))) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    this.userLocation = this.DEFAULT_LOCATION;
                    resolve(this.DEFAULT_LOCATION);
                }
                return;
            }

            (navigator as any).geolocation.getCurrentPosition(
                (position: any) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        this.userLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };
                        resolve(this.userLocation);
                    }
                },
                (error: any) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        console.warn('[LocationService] Geolocation error, using default. Code:', error.code);
                        this.userLocation = this.DEFAULT_LOCATION;
                        resolve(this.DEFAULT_LOCATION);
                    }
                },
                { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 } // Low accuracy for speed, 4s internal timeout
            );
        });
    }

    /**
     * Set user location manually
     */
    setUserLocation(latitude: number, longitude: number) {
        this.userLocation = { latitude, longitude };
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * @returns Distance in kilometers
     */
    calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    }

    /**
     * Format distance for display
     */
    formatDistance(distanceInKm: number): string {
        if (distanceInKm < 1) {
            const meters = Math.round(distanceInKm * 1000);
            return `${meters} m`;
        } else {
            return `${distanceInKm.toFixed(1)} km`;
        }
    }

    /**
     * Calculate and format distance from user's location to a point
     */
    async getDistanceFromUser(latitude: number, longitude: number): Promise<string> {
        const userLoc = await this.getUserLocation();
        const distance = this.calculateDistance(
            userLoc.latitude,
            userLoc.longitude,
            latitude,
            longitude
        );
        return this.formatDistance(distance);
    }

    /**
     * Convert degrees to radians
     */
    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Clear cached location (useful for testing or location refresh)
     */
    clearLocation() {
        this.userLocation = null;
    }

    /**
     * Get the area name for a coordinate using reverse geocoding
     */
    async getAreaName(latitude: number, longitude: number): Promise<string> {
        return this.getExactAddress(latitude, longitude);
    }

    /**
     * Legacy method for finding nearest area, now just calls reverse geocoder
     * @deprecated Use getExactAddress instead
     */
    findNearestArea(latitude: number, longitude: number): string {
        // Fallback synchronous value, since they were using this synchronously
        // before. It's better to use getExactAddress asynchronously where possible.
        return 'Bangalore';
    }

    /**
     * Convert coordinates into exact location name using OpenStreetMap Nominatim API
     */
    async getExactAddress(latitude: number, longitude: number): Promise<string> {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`;
            const response = await fetch(url);
            if (!response.ok) {
                return 'Unknown Location';
            }
            const data = await response.json();

            if (data && data.address) {
                // Try to get the most relevant local area name
                const addr = data.address;
                const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.city || addr.county || 'Bangalore';
                return area;
            }

            if (data && data.display_name) {
                // Return the first part of the display name (usually the specific area)
                return data.display_name.split(',')[0].trim();
            }

            return 'Bangalore';
        } catch (error) {
            console.error('[LocationService] Reverse geocoding error:', error);
            return 'Bangalore';
        }
    }
}
