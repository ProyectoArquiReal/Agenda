import { api, saveSession, clearSession, getSession } from './api';
import type { AuthSession, LoginRequest, UserRole } from '../types/auth';

export async function login(credentials: LoginRequest): Promise<AuthSession> {
  const response = await api.post<AuthSession>('/auth/login', credentials);
  const session = response.data;
  saveSession(session);
  return session;
}

export function loginDemo(email: string, role: UserRole): AuthSession {
  const session: AuthSession = {
    token: `demo-token-${role.toLowerCase()}-${Date.now()}`,
    role,
    email,
    nombre: role === 'RECEPCION' ? 'Recepción Clínica' : 'Administrador de Bodega',
  };
  saveSession(session);
  return session;
}

export function logout(): void {
  clearSession();
}

export { getSession };