import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReelsService } from '../services/reels.service';
import { Auth } from '@angular/fire/auth';
import { Reel } from '../models/reel.model';

@Component({
    selector: 'app-favorites',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './favorites.component.html',
    styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
    bookmarkedReels: Reel[] = [];
    isLoading = true;

    constructor(
        private reelsService: ReelsService,
        private auth: Auth,
        private router: Router,
        private cdr: ChangeDetectorRef
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
            this.bookmarkedReels = allReels.filter(reel =>
                this.reelsService.isBookmarkedByUser(reel, currentUser.uid)
            );

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
        // Navigate to video feed with this reel
        // For now, just navigate to main feed
        this.router.navigate(['/main-app']);
    }
}
