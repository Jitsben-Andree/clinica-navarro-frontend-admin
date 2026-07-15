import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/env';
import { isPlatformBrowser } from '@angular/common';

export interface LoginRequest {
  email?: string | null;
  password?: string | null;
}

export interface AuthResponse {
  token: string;
  email: string;
  rol: string;
  usuarioId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private API_URL = `${environment.apiUrl}`;
  private readonly apiUrl = `${this.API_URL}/auth`; 
  private readonly TOKEN_KEY = 'jwt_token';

  // Inyectamos PLATFORM_ID aquí
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (isPlatformBrowser(this.platformId)) {
          this.guardarToken(response.token);
          localStorage.setItem('user_role', response.rol);
        }
      })
    );
  }

  guardarToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  obtenerToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  estaLogueado(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return this.obtenerToken() !== null;
    }
    return false;
  }

  cerrarSesion(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem('user_role');
    }
  }
}