import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaLogueado()) {
    return true; // Tiene token, lo dejamos pasar
  }

  // No tiene token, lo pateamos de vuelta al login
  router.navigate(['/auth']);
  return false;
};