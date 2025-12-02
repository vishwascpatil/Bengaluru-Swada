import { inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Service to track if the app has been initialized (splash screen shown)
 */
export class AppInitService {
    private hasShownSplash = false;

    markSplashShown() {
        this.hasShownSplash = true;
    }

    shouldShowSplash(): boolean {
        return !this.hasShownSplash;
    }

    reset() {
        this.hasShownSplash = false;
    }
}

/**
 * Guard to ensure splash screen is shown on first app load
 */
export const splashGuard = () => {
    const router = inject(Router);
    const appInit = inject(AppInitService);

    // If splash hasn't been shown yet, redirect to splash
    if (appInit.shouldShowSplash()) {
        console.log('[SplashGuard] Redirecting to splash screen');
        return router.createUrlTree(['/']);
    }

    return true;
};
