import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
class AdminGuardService {
  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  canActivateAdmin(): ReturnType<CanActivateFn> {
    return this.adminService.isCurrentUserAdmin().pipe(
      map(isAdmin => {
        if (!isAdmin) {
          // Redirect non-admins back to main feed
          this.router.navigate(['/main-app']);
          return false;
        }
        return true;
      })
    );
  }
}

/**
 * Guard to protect admin routes (like upload)
 * Only admins can access routes with this guard
 */
export const adminGuard: CanActivateFn = () => {
  const adminGuardService = inject(AdminGuardService);
  return adminGuardService.canActivateAdmin();
};
