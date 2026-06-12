import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}

  /**
   * Check if the current logged-in user is an admin
   */
  isCurrentUserAdmin(): Observable<boolean> {
    return from(this.auth.authStateReady()).pipe(
      switchMap(() => {
        const currentUser = this.auth.currentUser;
        if (!currentUser?.uid) {
          return of(false);
        }
        return this.isUserAdmin(currentUser.uid);
      })
    );
  }

  /**
   * Check if a specific user (by uid) is an admin
   */
  isUserAdmin(uid: string): Observable<boolean> {
    return from(
      getDoc(doc(this.firestore, 'users', uid))
    ).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          return false;
        }
        const userData = docSnap.data() as User;
        return userData.isAdmin || false;
      })
    );
  }

  /**
   * Get the current user's full data including admin status
   */
  getCurrentUserData(): Observable<User | null> {
    return from(this.auth.authStateReady()).pipe(
      switchMap(() => {
        const currentUser = this.auth.currentUser;
        if (!currentUser?.uid) {
          return of(null);
        }
        return from(
          getDoc(doc(this.firestore, 'users', currentUser.uid))
        ).pipe(
          map(docSnap => {
            if (!docSnap.exists()) {
              return null;
            }
            return docSnap.data() as User;
          })
        );
      })
    );
  }
}
