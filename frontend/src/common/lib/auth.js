import { api } from './api.js';

export const AUTH_KEY = 'cloudcr.auth';

export async function login(correo, contrasena, tipo) {
  const datos = await api.post('/auth/login', { correo, contrasena, tipo });
  localStorage.setItem(AUTH_KEY, JSON.stringify(datos));
  return datos;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function setSession(datos) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(datos));
  return datos;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
