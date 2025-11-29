import { Component, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VideoFeedComponent } from '../video-feed/video-feed';
import { FavoritesComponent } from '../favorites/favorites.component';
import { UploadReelComponent } from '../upload-reel/upload-reel';

@Component({
  selector: 'app-main-app',
  standalone: true,
  imports: [CommonModule, VideoFeedComponent, FavoritesComponent, UploadReelComponent, FormsModule],
  templateUrl: './main-app.component.html',
  styleUrls: ['./main-app.component.scss']
})
export class MainAppComponent {
  location = 'Koramangala, Bangalore';
  @Output() navigate = new EventEmitter<string>();

  activeTab = 'feed';
  showLocationModal = false;
  searchQuery = '';

  // Popular Bangalore locations with coordinates
  locations = [
    { name: 'Koramangala', area: 'South Bangalore', lat: 12.9352, lng: 77.6245 },
    { name: 'Indiranagar', area: 'East Bangalore', lat: 12.9716, lng: 77.6412 },
    { name: 'Whitefield', area: 'East Bangalore', lat: 12.9698, lng: 77.7500 },
    { name: 'HSR Layout', area: 'South Bangalore', lat: 12.9116, lng: 77.6387 },
    { name: 'Jayanagar', area: 'South Bangalore', lat: 12.9250, lng: 77.5838 },
    { name: 'Malleshwaram', area: 'North Bangalore', lat: 13.0039, lng: 77.5727 },
    { name: 'JP Nagar', area: 'South Bangalore', lat: 12.9079, lng: 77.5857 },
    { name: 'Marathahalli', area: 'East Bangalore', lat: 12.9591, lng: 77.6974 },
    { name: 'Electronic City', area: 'South Bangalore', lat: 12.8399, lng: 77.6770 },
    { name: 'Banashankari', area: 'South Bangalore', lat: 12.9250, lng: 77.5485 },
    { name: 'Yelahanka', area: 'North Bangalore', lat: 13.1007, lng: 77.5963 },
    { name: 'BTM Layout', area: 'South Bangalore', lat: 12.9166, lng: 77.6101 }
  ];

  @ViewChild(FavoritesComponent) favoritesComponent!: FavoritesComponent;

  constructor(private router: Router) { }

  select(tab: string) {
    this.activeTab = tab;
    this.navigate.emit(tab);

    // Reload favorites data when favorites tab is clicked
    if (tab === 'favorites' && this.favoritesComponent) {
      this.favoritesComponent.loadBookmarkedReels();
    }
  }

  goToUpload() {
    this.select('upload');
  }

  openLocationModal() {
    this.showLocationModal = true;
    this.searchQuery = '';
  }

  closeLocationModal() {
    this.showLocationModal = false;
    this.searchQuery = '';
  }

  selectLocation(loc: { name: string; area: string; lat: number; lng: number }) {
    this.location = `${loc.name}, Bangalore`;
    this.closeLocationModal();
    // TODO: Update user location in LocationService and reload reels with new distances
  }

  get filteredLocations() {
    if (!this.searchQuery.trim()) {
      return this.locations;
    }
    const query = this.searchQuery.toLowerCase();
    return this.locations.filter(loc =>
      loc.name.toLowerCase().includes(query) ||
      loc.area.toLowerCase().includes(query)
    );
  }
}
