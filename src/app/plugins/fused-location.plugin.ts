import { registerPlugin } from '@capacitor/core';

export interface FusedLocationPlugin {
  getCurrentLocation(options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
  }): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    areaName: string;
  }>;
}

const FusedLocation = registerPlugin<FusedLocationPlugin>('FusedLocation');

export default FusedLocation;
