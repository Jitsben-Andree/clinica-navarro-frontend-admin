import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID); // Inyectamos el ID de plataforma
  const token = authService.obtenerToken();

  // 1. Adjuntamos el token si existe
  let peticion = req;
  if (token) {
    peticion = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  // 2. Enviamos la petición y capturamos posibles errores del Backend
  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      // ESCUDO ANTI-ZOMBIES: Solo actuamos sobre el Router si estamos en el navegador
      if ((error.status === 401 || error.status === 403) && isPlatformBrowser(platformId)) {
        console.warn('Sesión expirada. Limpiando credenciales...');
        
        authService.cerrarSesion(); 
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};