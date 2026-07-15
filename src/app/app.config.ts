import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
// 1. Importamos el nuevo interceptor anti-SSR
import { ssrBlockInterceptor } from './core/interceptors/ssr-block.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // 2. Colocamos ssrBlockInterceptor PRIMERO, y luego tu authInterceptor
    provideHttpClient(withInterceptors([ssrBlockInterceptor, authInterceptor]))
  ]
};