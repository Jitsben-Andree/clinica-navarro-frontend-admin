import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMPTY } from 'rxjs';

export const ssrBlockInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el servidor (Docker), bloqueamos la petición para no generar errores
  if (!isPlatformBrowser(platformId)) {
    return EMPTY; // EMPTY cancela la petición silenciosamente
  }

  // Si estamos en el navegador del usuario real, la dejamos pasar
  return next(req);
};