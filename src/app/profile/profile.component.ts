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
    userPhoneNumber: string | null = '+1 555-123-4567'; // Placeholder like in mockup
    userName: string = 'foodie_explorer';
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
