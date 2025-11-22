import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-legacy-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class LegacyAppComponent {
  screen: 'splash' | 'phone' | 'otp' | 'location' | 'main' = 'splash';
  phone = '';

  onPhone(num: string) {
    this.phone = num;
    this.screen = 'otp';
  }

  onVerified() {
    this.screen = 'location';
  }

  onLocation(loc: any) {
    // store user location and go to main
    this.screen = 'main';
  }
}
