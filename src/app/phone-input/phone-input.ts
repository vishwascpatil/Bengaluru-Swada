import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PhoneAuthService } from '../services/phone-auth.service';

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth
} from '@angular/fire/auth';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.scss',
})
export class PhoneInputComponent implements OnInit {

  //auth = getAuth();

  mobile = '';
  valid = false;
  loading = false;
  error = '';
  isFocused = false;

  recaptchaVerifier!: RecaptchaVerifier;
  confirmationResult!: ConfirmationResult;

  constructor(private router: Router, private auth: Auth, private phoneAuthService: PhoneAuthService) { }

  ngOnInit(): void {
    // Delay ensures DOM is fully ready
    setTimeout(() => {
      this.recaptchaVerifier = new RecaptchaVerifier(
        this.auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => console.log('reCAPTCHA success'),
          'expired-callback': () => this.error = 'ReCAPTCHA expired. Try again.'
        }
      );

      this.recaptchaVerifier.render();
    });
  }

  onInput(): void {
    this.valid = /^\d{10}$/.test(this.mobile);
    this.error = '';
  }

  async continue(): Promise<void> {
    if (!this.valid || this.loading) return;

    this.loading = true;
    this.error = '';

    try {
      const phoneNumber = '+91' + this.mobile;

      this.confirmationResult = await this.phoneAuthService.sendOtp(phoneNumber, this.recaptchaVerifier);

      this.router.navigate(['/otp']);

    } catch (err: any) {
      console.error(err);

      if (err.code === 'auth/invalid-phone-number')
        this.error = 'Invalid phone number.';
      else if (err.code === 'auth/too-many-requests')
        this.error = 'Too many attempts. Try again later.';
      else if (err.code === 'auth/quota-exceeded')
        this.error = 'SMS quota exceeded.';
      else if (err.code === 'auth/billing-not-enabled')
        this.error = 'Firebase billing is not enabled. Please enable it in the Firebase Console.';
      else
        this.error = `Failed to send OTP: ${err.message} (${err.code})`;

      this.loading = false;
    }
  }
}
