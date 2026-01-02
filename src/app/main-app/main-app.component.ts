import { Component, Output, EventEmitter, ViewChild, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VideoFeedComponent } from '../video-feed/video-feed';
import { FavoritesComponent } from '../favorites/favorites.component';
import { UploadReelComponent } from '../upload-reel/upload-reel';
import { SearchComponent } from '../search/search.component';
import { TrendingComponent } from '../trending/trending.component';
import { ProfileComponent } from '../profile/profile.component';
import { LocationService } from '../services/location.service';
import { NavigationService } from '../services/navigation.service';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-main-app',
  standalone: true,
  imports: [
    CommonModule,
    VideoFeedComponent,
    FavoritesComponent,
    UploadReelComponent,
    SearchComponent,
    TrendingComponent,
    ProfileComponent,
    ConfirmationModalComponent,
    FormsModule
  ],
  templateUrl: './main-app.component.html',
  styleUrls: ['./main-app.component.scss']
})
export class MainAppComponent implements OnInit {
  location = 'Koramangala, Bangalore';
  @Output() navigate = new EventEmitter<string>();

  activeTab = 'feed';
  showProfileMenu = false;

  // Modal State
  showConfirmModal = false;
  pendingTab: string | null = null;


  @ViewChild(FavoritesComponent) favoritesComponent!: FavoritesComponent;
  @ViewChild(ProfileComponent) profileComponent!: ProfileComponent;
  @ViewChild(VideoFeedComponent) videoFeedComponent!: VideoFeedComponent;
  @ViewChild(UploadReelComponent) uploadReelComponent!: UploadReelComponent;
  @ViewChild(SearchComponent) searchComponent!: SearchComponent;

  constructor(
    private router: Router,
    private locationService: LocationService,
    private navigationService: NavigationService,
    private auth: Auth
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

    // Subscribe to global location changes
    this.locationService.currentLocation$.subscribe(loc => {
      if (loc) {
        this.location = `${loc.name}, Bangalore`;
        // Refresh video feed with new location data if on feed
        if (this.videoFeedComponent && this.activeTab === 'feed') {
          this.videoFeedComponent.reloadReelsForNewLocation();
        }
      }
    });

    // Subscribe to tab changes
    this.navigationService.activeTab$.subscribe(tab => {
      if (tab) {
        this.select(tab);
      }
    });

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
    // If clicking the current tab while it's already active
    if (this.activeTab === tab) {
      if (tab === 'feed' && this.videoFeedComponent) {
        this.videoFeedComponent.scrollToTopAndRefresh();
      }
      return;
    }

    // If leaving upload tab with unsaved changes, prompt user
    if (this.activeTab === 'upload' && tab !== 'upload' && this.uploadReelComponent?.hasChanges()) {
      this.pendingTab = tab;
      this.showConfirmModal = true;
      return; // Stop here, wait for modal
    }

    this.executeTabChange(tab);
  }

  private executeTabChange(tab: string) {
    // Reset search if leaving search tab
    if (this.activeTab === 'search' && tab !== 'search' && this.searchComponent) {
      this.searchComponent.reset();
    }

    this.activeTab = tab;
    this.navigate.emit(tab);

    // Reload profile data when profile tab is clicked
    if (tab === 'profile' && this.profileComponent) {
      this.profileComponent.refresh();
    }

    // Reload favorites data when favorites tab is clicked
    if (tab === 'favorites' && this.favoritesComponent) {
      this.favoritesComponent.loadBookmarkedReels();
    }
  }

  onConfirmLeave() {
    this.showConfirmModal = false;
    if (this.pendingTab) {
      this.uploadReelComponent.resetForm();
      this.executeTabChange(this.pendingTab);
      this.pendingTab = null;
    }
  }

  onCancelLeave() {
    this.showConfirmModal = false;
    this.pendingTab = null;
  }


  goToUpload() {
    this.select('upload');
  }

  async logout() {
    try {
      await this.auth.signOut();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
  }
}
