import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { FavoritesComponent } from '../favorites/favorites.component';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FavoritesComponent],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
    @ViewChild(FavoritesComponent) favoritesComponent!: FavoritesComponent;
    userEmail: string | null = null;
    userName: string = 'foodie_explorer'; // Insta style username
    fullName: string = 'Bengaluru Foodie';

    stats = {
        posts: 12,
        followers: '1.2k',
        following: 248
    };

    constructor(private auth: Auth, private router: Router) {
        const user = this.auth.currentUser;
        if (user) {
            this.userEmail = user.email;
            if (user.displayName) {
                this.fullName = user.displayName;
                this.userName = user.displayName.toLowerCase().replace(/\s+/g, '_');
            }
        }
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
}
