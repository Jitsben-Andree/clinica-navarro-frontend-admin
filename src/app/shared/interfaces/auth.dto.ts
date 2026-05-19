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