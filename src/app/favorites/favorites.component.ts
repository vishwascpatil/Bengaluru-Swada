import { Component, OnInit } from '@angular/core';
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
        private router: Router
    ) { }

    async ngOnInit() {
        await this.loadBookmarkedReels();
    }

    async loadBookmarkedReels() {
        this.isLoading = true;
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                this.bookmarkedReels = [];
                return;
            }

            // Get all reels
            const allReels = await this.reelsService.getReels(100);

            // Filter bookmarked reels
            this.bookmarkedReels = allReels.filter(reel =>
                this.reelsService.isBookmarkedByUser(reel, currentUser.uid)
            );
        } catch (error) {
            console.error('Error loading bookmarked reels:', error);
        } finally {
            this.isLoading = false;
        }
    }

    playReel(reel: Reel) {
        // Navigate to video feed with this reel
        // For now, just navigate to main feed
        this.router.navigate(['/main-app']);
    }
}
