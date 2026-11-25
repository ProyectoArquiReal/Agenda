export type UserRole = 'RECEPCION' | 'ADMIN_BODEGA';

export interface AuthSession {
  token: string;
  role: UserRole;
  email: string;
  nombre?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}