import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Router, RouterModule } from '@angular/router';
import { FavoritesComponent } from '../favorites/favorites.component';
import { LegalViewComponent } from '../legal/legal-view.component';
import { ReelsService } from '../services/reels.service';
import { Reel } from '../models/reel.model';
import { AdmobService } from '../services/admob.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FavoritesComponent, RouterModule, LegalViewComponent],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
    @ViewChild(FavoritesComponent) favoritesComponent!: FavoritesComponent;
    userEmail: string | null = null;
    userPhoneNumber: string | null = null;
    userName: string = '';
    fullName: string = '';

    activeTab: 'bookmarks' | 'settings' = 'bookmarks';
    activeLegalTab: 'terms' | 'privacy' | 'help' | null = null;
    userReels: Reel[] = [];
    isLoadingReels: boolean = false;

    stats = {
        posts: 0,
        followers: '1.2k',
        following: 248
    };

    private touchstartX = 0;
    private touchendX = 0;

    constructor(
        private auth: Auth,
        private router: Router,
        private reelsService: ReelsService,
        private admobService: AdmobService
    ) {
        const user = this.auth.currentUser;
        if (user) {
            this.userEmail = user.email;

            // Fetch and format phone number from Firebase
            if (user.phoneNumber) {
                const raw = user.phoneNumber.replace(/\D/g, '');
                // Handle 12-digit (91XXXXXXXXXX) or 10-digit (XXXXXXXXXX)
                const digits = raw.length === 12 && raw.startsWith('91') ? raw.substring(2) : raw;
                if (digits.length === 10) {
                    this.userPhoneNumber = `+91 ${digits.substring(0, 5)}-${digits.substring(5)}`;
                } else {
                    this.userPhoneNumber = user.phoneNumber; // Fallback to raw if length is unexpected
                }
            } else {
                this.userPhoneNumber = null; // Hide or show placeholder if no phone exists
            }

            if (user.displayName) {
                this.fullName = user.displayName;
                this.userName = user.displayName.toLowerCase().replace(/\s+/g, '_');
            }
        }
    }

    ngOnInit() {
        this.refresh();
        this.admobService.showBanner();
    }

    async refresh() {
        const user = this.auth.currentUser;
        if (user) {
            this.userEmail = user.email;
            if (user.displayName) {
                this.fullName = user.displayName;
                this.userName = user.displayName.toLowerCase().replace(/\s+/g, '_');
            }
            // Update phone number if needed
            if (user.phoneNumber) {
                const raw = user.phoneNumber.replace(/\D/g, '');
                const digits = raw.length === 12 && raw.startsWith('91') ? raw.substring(2) : raw;
                if (digits.length === 10) {
                    this.userPhoneNumber = `+91 ${digits.substring(0, 5)}-${digits.substring(5)}`;
                } else {
                    this.userPhoneNumber = user.phoneNumber;
                }
            }
        }

        await this.loadUserReels();
        if (this.activeTab === 'bookmarks') {
            this.reloadFavorites();
        }
    }

    async loadUserReels() {
        const user = this.auth.currentUser;
        if (!user) {
            console.warn('[Profile] No user found for loading reels');
            return;
        }

        this.isLoadingReels = true;
        try {
            console.log('[Profile] Loading reels for user:', user.uid);
            this.userReels = await this.reelsService.getReelsByUser(user.uid);
            console.log('[Profile] Loaded user reels:', this.userReels.length);
        } catch (error) {
            console.error('[Profile] Error loading user reels:', error);
        } finally {
            this.isLoadingReels = false;
        }
    }

    switchTab(tab: 'bookmarks' | 'settings') {
        this.activeTab = tab;
        if (tab === 'bookmarks') {
            setTimeout(() => this.reloadFavorites(), 100);
        }
    }

    goToUpload() {
        this.router.navigate(['/upload-reel']);
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.router.navigate(['/']);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    reloadFavorites() {
        if (this.favoritesComponent) {
            this.favoritesComponent.loadBookmarkedReels();
        }
    }

    goBack() {
        this.router.navigate(['/main-app']);
    }

    handleTouchStart(event: any) {
        this.touchstartX = event.changedTouches[0].screenX;
    }

    handleTouchEnd(event: any) {
        this.touchendX = event.changedTouches[0].screenX;
        this.handleSwipeGesture();
    }

    private handleSwipeGesture() {
        const swipeThreshold = 50; // Minimum distance for a swipe
        const swipeDistance = this.touchendX - this.touchstartX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance < 0) {
                // Swiped left - go to Settings
                if (this.activeTab === 'bookmarks') {
                    this.switchTab('settings');
                }
            } else {
                // Swiped right - go to Bookmarks
                if (this.activeTab === 'settings') {
                    this.switchTab('bookmarks');
                }
            }
        }
    }

    ngOnDestroy() {
        this.admobService.hideBanner();
    }
}

