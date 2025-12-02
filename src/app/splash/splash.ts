import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AppInitService } from '../guards/splash.guard';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class SplashComponent implements OnInit, OnDestroy {
  private minSplashDuration = 3000; // Minimum 2 seconds
  private splashStartTime: number = 0;
  private authUnsubscribe?: () => void;

  constructor(
    private router: Router,
    private auth: Auth,
    private appInit: AppInitService
  ) { }

  ngOnInit() {
    this.splashStartTime = Date.now();
    console.log('[Splash] Splash screen started at:', new Date().toISOString());

    // Check authentication status
    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      const elapsedTime = Date.now() - this.splashStartTime;
      const remainingTime = Math.max(0, this.minSplashDuration - elapsedTime);

      console.log(`[Splash] Auth checked. Elapsed: ${elapsedTime}ms, Waiting additional: ${remainingTime}ms`);

      setTimeout(() => {
        // Mark splash as shown before navigating
        this.appInit.markSplashShown();

        if (user) {
          // User is logged in, go to main app
          console.log('[Splash] User is logged in:', user.uid);
          this.router.navigate(['/main-app'], { replaceUrl: true });
        } else {
          // User is not logged in, go to phone input
          console.log('[Splash] User is not logged in, navigating to phone-input');
          this.router.navigate(['/phone-input'], { replaceUrl: true });
        }
      }, remainingTime);
    });
  }

  ngOnDestroy() {
    // Clean up auth listener
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }
}
