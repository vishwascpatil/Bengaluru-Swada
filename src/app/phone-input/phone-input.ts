import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PhoneAuthService } from '../services/phone-auth.service';

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  ConfirmationResult,
  Auth
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { User } from '../models/user.model';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.scss',
})
export class PhoneInputComponent implements OnInit, AfterViewInit {
  @ViewChild('mobileInput') mobileInput!: ElementRef;

  // Phone auth
  mobile = '';
  valid = false;
  loading = false;
  error = '';
  isFocused = false;

  recaptchaVerifier!: RecaptchaVerifier;
  confirmationResult!: ConfirmationResult;

  // Auth mode: 'phone' (default) or 'email'
  authMode: 'phone' | 'email' = 'phone';

  // Email auth
  email = '';
  password = '';
  emailLoading = false;
  emailError = '';
  emailValid = false;

  constructor(private router: Router, private auth: Auth, private phoneAuthService: PhoneAuthService, private firestore: Firestore) { }

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

  ngAfterViewInit(): void {
    // Focus the input field after a short delay to ensure the keyboard opens on mobile
    setTimeout(() => {
      if (this.mobileInput) {
        this.mobileInput.nativeElement.focus();
      }
    }, 500);
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

  /* ─── Google Sign-In ─── */

  async signInWithGoogle(): Promise<void> {
    this.error = '';
    this.emailError = '';

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);

      // Create or update user record in Firestore
      await this.initializeUserRecord(result.user.uid, result.user.email, result.user.displayName);

      // Navigate to location permission
      this.router.navigate(['/location-permission'], { replaceUrl: true });

    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/unauthorized-continue-uri') {
          this.error = 'Google Sign-In is not enabled in Firebase Console. Enable it under Authentication > Sign-in method.';
        } else if (err.message) {
          this.error = `Google sign-in failed: ${err.message}`;
        } else {
          this.error = 'Failed to sign in with Google. Please try again.';
        }
      }
    }
  }

  /* ─── Apple Sign-In ─── */

  async signInWithApple(): Promise<void> {
    this.error = '';
    this.emailError = '';

    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(this.auth, provider);

      // Create or update user record in Firestore
      await this.initializeUserRecord(result.user.uid, result.user.email, result.user.displayName);

      // Navigate to location permission
      this.router.navigate(['/location-permission'], { replaceUrl: true });

    } catch (err: any) {
      console.error('Apple sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/unauthorized-continue-uri') {
          this.error = 'Apple Sign-In is not enabled in Firebase Console. Enable it under Authentication > Sign-in method.';
        } else if (err.message) {
          this.error = `Apple sign-in failed: ${err.message}`;
        } else {
          this.error = 'Failed to sign in with Apple. Please try again.';
        }
      }
    }
  }

  /* ─── Email/Password Sign-In ─── */

  switchToEmail(): void {
    this.authMode = 'email';
    this.error = '';
    this.email = '';
    this.password = '';
    this.emailError = '';
  }

  switchToPhone(): void {
    this.authMode = 'phone';
    this.error = '';
    this.email = '';
    this.password = '';
    this.emailError = '';
  }

  onEmailInput(): void {
    this.emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email) && this.password.length >= 6;
    this.emailError = '';
  }

  async signInWithEmail(): Promise<void> {
    if (!this.emailValid || this.emailLoading) return;

    this.emailLoading = true;
    this.emailError = '';

    try {
      const result = await signInWithEmailAndPassword(this.auth, this.email, this.password);

      // Create or update user record
      await this.initializeUserRecord(result.user.uid, result.user.email, result.user.displayName);

      this.router.navigate(['/location-permission'], { replaceUrl: true });

    } catch (err: any) {
      console.error('Email sign-in error:', err);

      // Firebase unified auth/user-not-found & auth/wrong-password into auth/invalid-credential.
      // Try creating the account — if the email already exists, createUserWithEmailAndPassword
      // will throw email-already-in-use which we display as "Try signing in instead."
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const result = await createUserWithEmailAndPassword(this.auth, this.email, this.password);

          await this.initializeUserRecord(result.user.uid, result.user.email, result.user.displayName);

          this.router.navigate(['/location-permission'], { replaceUrl: true });
        } catch (signUpErr: any) {
          this.handleEmailError(signUpErr);
        }
      } else {
        this.handleEmailError(err);
      }
    } finally {
      this.emailLoading = false;
    }
  }

  private handleEmailError(err: any): void {
    switch (err.code) {
      case 'auth/email-already-in-use':
        this.emailError = 'An account with this email already exists. Try signing in.';
        break;
      case 'auth/weak-password':
        this.emailError = 'Password should be at least 6 characters.';
        break;
      case 'auth/invalid-email':
        this.emailError = 'Please enter a valid email address.';
        break;
      case 'auth/invalid-credential':
        this.emailError = 'Invalid email or password.';
        break;
      case 'auth/too-many-requests':
        this.emailError = 'Too many attempts. Try again later.';
        break;
      default:
        this.emailError = `Failed to sign in: ${err.message}`;
    }
  }

  /* ─── Shared user record initialization ─── */

  /**
   * Creates or updates user record in Firestore after any auth method.
   * If the user already exists, just updates lastLogin.
   */
  private async initializeUserRecord(uid: string, email?: string | null, displayName?: string | null): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // User already exists, just update lastLogin
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
      } else {
        // New user — create record
        const newUser: User = {
          uid,
          phoneNumber: '',
          email: email || undefined,
          displayName: displayName || undefined,
          isAdmin: false,
          createdAt: serverTimestamp() as any,
          lastLogin: serverTimestamp() as any
        };
        await setDoc(userDocRef, newUser);
        console.log('New user record created:', uid);
      }
    } catch (error) {
      console.error('Error initializing user record:', error);
      // Don't block login even if Firestore write fails
    }
  }
}
