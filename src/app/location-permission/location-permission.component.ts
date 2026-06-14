import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { LocationService } from '../services/location.service';
import { LocationSearchSheetComponent } from '../shared/components/location-search-sheet/location-search-sheet.component';

declare const alert: any;

@Component({
  selector: 'app-location-permission',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationSearchSheetComponent],
  templateUrl: './location-permission.component.html',
  styleUrls: ['./location-permission.component.scss']
})
export class LocationPermissionComponent {
  isFetchingLocation = false;
  showLocationModal = false;

  constructor(
    private router: Router,
    private locationService: LocationService,
    private auth: Auth,
    private firestore: Firestore
  ) { }

  async allow() {
    this.isFetchingLocation = true;
    try {
      const position = await this.locationService.getUserLocation();
      const areaName = await this.locationService.getAreaName(position.latitude, position.longitude);

      // Save location in-memory for the current session
      this.locationService.updateLocation(areaName, position.latitude, position.longitude);

      // Persist location to Firestore users/{uid}
      await this.saveUserLocation(position.latitude, position.longitude, areaName);

      this.router.navigate(['/main-app']);
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Could not get your location. Please check your permissions or try entering it manually.');
    } finally {
      this.isFetchingLocation = false;
    }
  }

  /**
   * Save or update the user's location in Firestore users collection
   */
  private async saveUserLocation(latitude: number, longitude: number, locationName: string): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (!user?.uid) {
        console.warn('[LocationPermission] No authenticated user, skipping Firestore save');
        return;
      }

      const userDocRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        latitude,
        longitude,
        locationName,
        lastLogin: serverTimestamp()
      }, { merge: true });

      console.log('[LocationPermission] User location saved to Firestore:', { latitude, longitude, locationName });
    } catch (error) {
      console.error('[LocationPermission] Failed to save user location to Firestore:', error);
    }
  }

  manual() {
    this.showLocationModal = true;
  }

  closeLocationModal() {
    this.showLocationModal = false;
  }
  
  onLocationSelected() {
    this.router.navigate(['/main-app']);
  }
}
