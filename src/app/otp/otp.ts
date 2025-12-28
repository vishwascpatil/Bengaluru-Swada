import { Component, EventEmitter, Output, ChangeDetectorRef, OnInit } from '@angular/core';

declare const document: any;
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfirmationResult, Auth, RecaptchaVerifier } from '@angular/fire/auth';
import { PhoneAuthService } from '../services/phone-auth.service';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.html',
  imports: [FormsModule, CommonModule],
  standalone: true,
  styleUrls: ['./otp.scss']
})
export class OtpComponent implements OnInit {
  phone = '';
  @Output() back = new EventEmitter<void>();
  @Output() verified = new EventEmitter<void>();

  otp: string[] = ['', '', '', '', '', ''];
  countdown = 30;
  timerHandle: any;
  complete = false;
  loading = false;
  error = '';
  currentFocusIndex = -1;
  confirmationResult: ConfirmationResult | null = null;

  hasError = false;
  isVerified = false;
  recaptchaVerifier!: RecaptchaVerifier;

  constructor(private router: Router, private cdr: ChangeDetectorRef, private phoneAuthService: PhoneAuthService, private auth: Auth) {
    this.phone = this.phoneAuthService.getPhoneNumber();
    this.confirmationResult = this.phoneAuthService.getConfirmationResult();

    // If no confirmation result, redirect back to phone input
    if (!this.confirmationResult) {
      this.router.navigate(['/phone-input']);
    }
  }

  ngOnInit() {
    this.startTimer();

    // Init invisible recaptcha for resend
    setTimeout(() => {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(
          this.auth,
          'recaptcha-container-otp',
          {
            size: 'invisible',
            callback: () => { /* reCAPTCHA solved */ }
          }
        );
      }
    });
  }

  startTimer() {
    clearInterval(this.timerHandle);
    this.countdown = 30;
    this.timerHandle = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        clearInterval(this.timerHandle);
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  onOtpInput(i: number) {
    this.complete = this.otp.join('').length === 6 && /^\d{6}$/.test(this.otp.join(''));
    this.error = '';
    this.hasError = false;

    // Auto-focus next input
    if (this.otp[i] && i < 5) {
      const nextInput = document.querySelectorAll('.native-input')[i + 1] as any;
      if (nextInput) nextInput.focus();
    }
  }

  async verify() {
    if (!this.complete || this.loading || !this.confirmationResult) return;

    this.loading = true;
    this.error = '';
    this.hasError = false;

    try {
      const otpCode = this.otp.join('');

      // Verify OTP with Firebase
      const result = await this.confirmationResult.confirm(otpCode);

      console.log('User signed in successfully:', result.user);

      // Show success state
      this.isVerified = true;
      this.loading = false;

      // Navigate to location permission after delay
      setTimeout(() => {
        this.router.navigate(['/location-permission'], { replaceUrl: true });
      }, 2000);

    } catch (error: any) {
      console.error('Error verifying OTP:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-verification-code') {
        this.error = 'Invalid OTP. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        this.error = 'OTP has expired. Please request a new one.';
      } else {
        this.error = 'Verification failed. Please try again.';
      }

      this.loading = false;
      this.hasError = true;
      // Clear OTP inputs on error
      this.otp = ['', '', '', '', '', ''];
      this.complete = false;
    }
  }

  async resend() {
    if (this.loading) return;

    this.loading = true;
    this.error = '';

    try {
      console.log('Current stored phone:', this.phone);
      let fullPhone = this.phone;
      if (!fullPhone.startsWith('+')) {
        fullPhone = '+91' + fullPhone;
      }
      console.log('Sending OTP to:', fullPhone);
      const result = await this.phoneAuthService.sendOtp(fullPhone, this.recaptchaVerifier);

      // Update confirmation result
      this.confirmationResult = result;
      this.phoneAuthService.setConfirmationResult(result);

      // Reset state
      this.startTimer();
      this.otp = ['', '', '', '', '', ''];
      this.complete = false;
      this.loading = false;

    } catch (error: any) {
      console.error('Resend error:', error);
      this.error = 'Failed to resend OTP. Try again later.';
      this.loading = false;
    }
  }

  change() {
    this.router.navigate(['/phone-input']);
  }
}
