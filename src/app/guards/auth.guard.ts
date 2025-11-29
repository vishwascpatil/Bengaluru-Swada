import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { map } from 'rxjs/operators';
import { authState } from '@angular/fire/auth';

export const authGuard = () => {
    const auth = inject(Auth);
    const router = inject(Router);

    return authState(auth).pipe(
        map(user => {
            if (user) {
                return true; // User is authenticated, allow access
            } else {
                // User is not authenticated, redirect to phone input
                router.navigate(['/phone-input']);
                return false;
            }
        })
    );
};
