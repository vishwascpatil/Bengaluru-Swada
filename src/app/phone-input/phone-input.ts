import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  getAuth
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

  recaptchaVerifier!: RecaptchaVerifier;
  confirmationResult!: ConfirmationResult;

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Delay ensures DOM is fully ready
    setTimeout(() => {
      // this.recaptchaVerifier = new RecaptchaVerifier(
      //   this.auth,
      //   'recaptcha-container',
      //   {
      //     size: 'invisible',
      //     callback: () => console.log('reCAPTCHA success'),
      //     'expired-callback': () => this.error = 'ReCAPTCHA expired. Try again.'
      //   }
      // );

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

      // this.confirmationResult = await signInWithPhoneNumber(
      //   this.auth,
      //   phoneNumber,
      //   this.recaptchaVerifier
      // );

      this.router.navigate(['/otp'], {
        state: {
          phone: this.mobile,
          confirmationResult: this.confirmationResult,
        }
      });

    } catch (err: any) {
      console.error(err);

      if (err.code === 'auth/invalid-phone-number')
        this.error = 'Invalid phone number.';
      else if (err.code === 'auth/too-many-requests')
        this.error = 'Too many attempts. Try again later.';
      else if (err.code === 'auth/quota-exceeded')
        this.error = 'SMS quota exceeded.';
      else
        this.error = 'Failed to send OTP. Try again.';

      this.loading = false;
    }
  }
}
