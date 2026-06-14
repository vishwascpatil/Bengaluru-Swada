import { Timestamp } from '@angular/fire/firestore';

export interface User {
  uid: string;                  // Firebase user ID
  phoneNumber: string;          // "+91XXXXXXXXXX"
  displayName?: string;         // User's name
  email?: string;               // Optional email
  isAdmin: boolean;             // ⭐ FLAG FOR ADMINS - controls upload access
  createdAt: Timestamp;
  lastLogin: Timestamp;

  // Location fields — saved/updated when user grants location permission or changes location
  latitude?: number;
  longitude?: number;
  locationName?: string;
}
