import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { map } from 'rxjs/operators';
import { authState } from '@angular/fire/auth';

/**
 * Guard to prevent authenticated users from accessing login pages
 * Redirects authenticated users to main-app
 */
export const noAuthGuard = () => {
    const auth = inject(Auth);
    const router = inject(Router);

    return authState(auth).pipe(
        map(user => {
            if (user) {
                // User is authenticated, redirect to main-app
                console.log('[NoAuthGuard] User is authenticated, redirecting to main-app');
                return router.createUrlTree(['/main-app']);
            } else {
                // User is not authenticated, allow access to login pages
                return true;
            }
        })
    );
};
