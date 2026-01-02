import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Router, RouterModule } from '@angular/router';
import { FavoritesComponent } from '../favorites/favorites.component';
import { ReelsService } from '../services/reels.service';
import { Reel } from '../models/reel.model';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FavoritesComponent, RouterModule],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    @ViewChild(FavoritesComponent) favoritesComponent!: FavoritesComponent;
    userEmail: string | null = null;
    userPhoneNumber: string | null = null;
    userName: string = '';
    fullName: string = '';

    activeTab: 'bookmarks' | 'settings' = 'bookmarks';
    userReels: Reel[] = [];
    isLoadingReels: boolean = false;

    stats = {
        posts: 0,
        followers: '1.2k',
        following: 248
    };

    constructor(
        private auth: Auth,
        private router: Router,
        private reelsService: ReelsService
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
}

