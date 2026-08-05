import { api } from './api.js';

const AUTH_KEY = 'cloudcr.auth';

export async function login(nombre) {
  const data = await api.get(`/evaluadores?buscar=${encodeURIComponent(nombre)}&limit=1`);
  const evaluador = Array.isArray(data) ? data[0] : data?.items?.[0];
  if (!evaluador) throw new Error('Evaluador no encontrado');

  const datos = {
    id:     evaluador.id,
    nombre: evaluador.nombre,
    rol:    'evaluador',
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(datos));
  return datos;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
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
