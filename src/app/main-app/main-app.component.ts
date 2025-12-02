import { Component, Output, EventEmitter, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VideoFeedComponent } from '../video-feed/video-feed';
import { FavoritesComponent } from '../favorites/favorites.component';
import { UploadReelComponent } from '../upload-reel/upload-reel';
import { LocationService } from '../services/location.service';
import { NavigationService } from '../services/navigation.service';

@Component({
  selector: 'app-main-app',
  standalone: true,
  imports: [CommonModule, VideoFeedComponent, FavoritesComponent, UploadReelComponent, FormsModule],
  templateUrl: './main-app.component.html',
  styleUrls: ['./main-app.component.scss']
})
export class MainAppComponent implements OnInit {
  location = 'Koramangala, Bangalore';
  @Output() navigate = new EventEmitter<string>();

  activeTab = 'feed';
  showLocationModal = false;
  searchQuery = '';

  // Comprehensive Bangalore locations with coordinates and pincodes
  locations = [
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

  @ViewChild(FavoritesComponent) favoritesComponent!: FavoritesComponent;
  @ViewChild(VideoFeedComponent) videoFeedComponent!: VideoFeedComponent;

  constructor(
    private router: Router,
    private locationService: LocationService,
    private navigationService: NavigationService
  ) {
    // Check if location was passed via navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      if (state['location']) {
        this.location = `${state['location']}, Bangalore`;
      }
      if (state['latitude'] && state['longitude']) {
        this.locationService.setUserLocation(state['latitude'], state['longitude']);
      }
      // Check if opening a specific reel from favorites
      if (state['openFeed'] && state['reelId']) {
        this.activeTab = 'feed';
        const reelId = state['reelId'];
        // Wait for video feed to load reels, then navigate
        const attemptNavigation = (attempts = 0) => {
          setTimeout(() => {
            if (this.videoFeedComponent && this.videoFeedComponent.reels && this.videoFeedComponent.reels.length > 0) {
              console.log('[MainApp] Video feed loaded, navigating to reel:', reelId);
              this.videoFeedComponent.navigateToReel(reelId);
            } else if (attempts < 10) {
              console.log('[MainApp] Waiting for video feed to load... attempt', attempts + 1);
              attemptNavigation(attempts + 1);
            } else {
              console.error('[MainApp] Failed to navigate to reel - video feed did not load');
            }
          }, 500);
        };
        attemptNavigation();
      }
    }
  }

  async ngOnInit() {
    // If location wasn't set via navigation, try to get it from LocationService
    if (this.location === 'Koramangala, Bangalore') {
      try {
        const userLoc = await this.locationService.getUserLocation();
        const areaName = this.locationService.findNearestArea(userLoc.latitude, userLoc.longitude);
        this.location = `${areaName}, Bangalore`;
      } catch (error) {
        console.error('Error getting location:', error);
        // Keep default location
      }
    }

    // Subscribe to reel selection from favorites
    this.navigationService.selectedReelId$.subscribe(reelId => {
      if (reelId) {
        console.log('[MainApp] Received reel selection:', reelId);
        // Switch to feed tab
        this.activeTab = 'feed';
        // Wait for video feed to load and navigate
        const attemptNavigation = (attempts = 0) => {
          setTimeout(() => {
            if (this.videoFeedComponent && this.videoFeedComponent.reels && this.videoFeedComponent.reels.length > 0) {
              console.log('[MainApp] Navigating to reel:', reelId);
              this.videoFeedComponent.navigateToReel(reelId);
              this.navigationService.clearSelection();
            } else if (attempts < 15) {
              console.log('[MainApp] Waiting for reels... attempt', attempts + 1);
              attemptNavigation(attempts + 1);
            } else {
              console.error('[MainApp] Failed to navigate - reels not loaded');
            }
          }, 400);
        };
        attemptNavigation();
      }
    });
  }

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

  selectLocation(loc: { name: string; pincode: string; lat: number; lng: number }) {
    this.location = `${loc.name}, Bangalore`;
    this.locationService.setUserLocation(loc.lat, loc.lng);
    this.closeLocationModal();
    // Location updated in LocationService - reels will use new location for distance calculation
  }

  get filteredLocations() {
    if (!this.searchQuery.trim()) {
      return this.locations;
    }
    const query = this.searchQuery.toLowerCase();
    return this.locations.filter(loc =>
      loc.name.toLowerCase().includes(query) ||
      loc.pincode.includes(query)
    );
  }
}
