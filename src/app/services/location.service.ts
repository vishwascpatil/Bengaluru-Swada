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

    /**
     * Find the nearest Bangalore area based on coordinates
     * @returns Area name like "Koramangala" or "Indiranagar"
     */
    findNearestArea(latitude: number, longitude: number): string {
        const areas = [
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

        let nearestArea = 'Bangalore';
        let minDistance = Infinity;

        for (const area of areas) {
            const distance = this.calculateDistance(latitude, longitude, area.lat, area.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearestArea = area.name;
            }
        }

        return nearestArea;
    }
}
