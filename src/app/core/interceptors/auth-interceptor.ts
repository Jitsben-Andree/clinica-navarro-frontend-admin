import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
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
      // ESCUDO ANTI-ZOMBIES: Si el token expiró o es inválido (401 o 403)
      if (error.status === 401 || error.status === 403) {
        console.warn('Sesión expirada. Limpiando credenciales...');
        
        // Ejecutamos tu método de cerrar sesión (que debe limpiar el localStorage)
        authService.cerrarSesion(); 
        
        // Expulsamos al usuario a la pantalla de login
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};