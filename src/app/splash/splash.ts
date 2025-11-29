import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class SplashComponent implements OnInit {
  constructor(
    private router: Router,
    private auth: Auth
  ) { }

  ngOnInit() {
    // Check authentication status
    onAuthStateChanged(this.auth, (user) => {
      setTimeout(() => {
        if (user) {
          // User is logged in, go to main app
          console.log('User is logged in:', user.uid);
          this.router.navigate(['/main-app']);
        } else {
          // User is not logged in, go to phone input
          console.log('User is not logged in');
          this.router.navigate(['/phone-input']);
        }
      }, 2000); // Keep splash screen visible for 1.5 seconds
    });
  }
}
