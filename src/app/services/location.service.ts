import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private userLocation: { latitude: number; longitude: number } | null = null;

    constructor() { }

    /**
     * Get user's current location
     */
    async getUserLocation(): Promise<{ latitude: number; longitude: number }> {
        if (this.userLocation) {
            return this.userLocation;
        }

        return new Promise((resolve, reject) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.userLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };
                        resolve(this.userLocation);
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        // Default to Koramangala, Bangalore if location unavailable
                        const defaultLocation = { latitude: 12.9352, longitude: 77.6245 };
                        this.userLocation = defaultLocation;
                        resolve(defaultLocation);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
                );
            } else {
                // Default to Koramangala, Bangalore if geolocation not supported
                const defaultLocation = { latitude: 12.9352, longitude: 77.6245 };
                this.userLocation = defaultLocation;
                resolve(defaultLocation);
            }
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
}
