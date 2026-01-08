import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { Auth } from '@angular/fire/auth';
import { Reel } from '../models/reel.model';
import { NavigationService } from '../services/navigation.service';
import { LocationService } from '../services/location.service';

@Component({
    selector: 'app-favorites',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './favorites.component.html',
    styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
    @Input() showHeader = true;
    bookmarkedReels: Reel[] = [];
    isLoading = true;
    loadedThumbs: Set<string> = new Set();

    constructor(
        private reelsService: ReelsService,
        private auth: Auth,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private navigationService: NavigationService,
        private locationService: LocationService
    ) { }

    async ngOnInit() {
        await this.loadBookmarkedReels();
    }

    async loadBookmarkedReels() {
        console.log('[Favorites] Starting to load bookmarked reels...');
        this.isLoading = true;
        this.cdr.detectChanges();

        try {
            const currentUser = this.auth.currentUser;
            console.log('[Favorites] Current user:', currentUser?.uid || 'Not logged in');

            if (!currentUser) {
                this.bookmarkedReels = [];
                console.log('[Favorites] No user logged in, clearing bookmarks');
                return;
            }

            // Get all reels
            console.log('[Favorites] Fetching all reels...');
            const allReels = await this.reelsService.getReels(100);
            console.log('[Favorites] Fetched reels count:', allReels.length);

            // Filter bookmarked reels
            const bookmarked = allReels.filter(reel =>
                this.reelsService.isBookmarkedByUser(reel, currentUser.uid)
            );

            // Calculate distances
            this.bookmarkedReels = await Promise.all(bookmarked.map(async (reel) => {
                let distanceStr = '-- km';
                if (reel.latitude && reel.longitude) {
                    try {
                        const userLoc = await this.locationService.getUserLocation();
                        const distanceVal = this.locationService.calculateDistance(
                            userLoc.latitude, userLoc.longitude,
                            reel.latitude, reel.longitude
                        );
                        distanceStr = distanceVal.toFixed(1) + ' km';
                    } catch (e) {
                        console.warn('[Favorites] Error calculating distance for reel:', reel.id, e);
                    }
                }
                return {
                    ...reel,
                    distanceStr
                };
            }));

            console.log('[Favorites] Bookmarked reels count:', this.bookmarkedReels.length);
        } catch (error) {
            console.error('[Favorites] Error loading bookmarked reels:', error);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
            console.log('[Favorites] Loading complete. isLoading:', this.isLoading);
        }
    }

    playReel(reel: Reel) {
        console.log('[Favorites] Playing reel:', reel.id, reel.title);
        // Set the selected reel in the navigation service
        this.navigationService.selectReel(reel.id!);
        // Navigate to main-app (it will switch to feed tab automatically)
        this.router.navigate(['/main-app']);
    }

    onThumbLoad(reelId: string) {
        this.loadedThumbs.add(reelId);
        this.cdr.detectChanges();
    }
}
