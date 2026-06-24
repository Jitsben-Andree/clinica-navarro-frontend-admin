import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/env';

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

  private API_URL = `${environment.apiUrl}`

  private readonly apiUrl = `${this.API_URL}/auth`; 
  private readonly TOKEN_KEY = 'jwt_token';

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (typeof window !== 'undefined') {
          this.guardarToken(response.token);
          localStorage.setItem('user_role', response.rol);
        }
      })
    );
  }

  guardarToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  obtenerToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  estaLogueado(): boolean {
    if (typeof window !== 'undefined') {
      return this.obtenerToken() !== null;
    }
    return false;
  }

  cerrarSesion(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem('user_role');
    }
  }
}