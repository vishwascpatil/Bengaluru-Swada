import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
    private locationService: LocationService
  ) { }

  async allow() {
    this.isFetchingLocation = true;
    try {
      const position = await this.locationService.getUserLocation();
      const areaName = await this.locationService.getAreaName(position.latitude, position.longitude);

      this.locationService.updateLocation(areaName, position.latitude, position.longitude);
      this.router.navigate(['/main-app']);
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Could not get your location. Please check your permissions or try entering it manually.');
    } finally {
      this.isFetchingLocation = false;
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
