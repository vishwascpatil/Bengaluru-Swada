import { Component, EventEmitter, Output, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfirmationResult } from '@angular/fire/auth';
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
  confirmationResult: ConfirmationResult | null = null;

  hasError = false;
  isVerified = false;

  constructor(private router: Router, private cdr: ChangeDetectorRef, private phoneAuthService: PhoneAuthService) {
    this.phone = this.phoneAuthService.getPhoneNumber();
    this.confirmationResult = this.phoneAuthService.getConfirmationResult();

    // If no confirmation result, redirect back to phone input
    if (!this.confirmationResult) {
      this.router.navigate(['/phone-input']);
    }
  }

  ngOnInit() {
    this.startTimer();
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
      const nextInput = document.querySelectorAll('.otp-input')[i + 1] as HTMLElement;
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

  resend() {
    // Navigate back to phone input to resend
    this.router.navigate(['/phone-input']);
  }

  change() {
    this.router.navigate(['/phone-input']);
  }
}
