import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { isPlatformBrowser } from '@angular/common';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Si YA está logueado, lo mandamos directo adentro
  if (authService.estaLogueado()) {
    router.navigate(['/dashboard']); // NOTA: Usa '/portal' en el proyecto Cliente
    return false;
  }

  // Si no está logueado, le permitimos ver el Login
  return true;
};