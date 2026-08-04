const AUTH_KEY = 'cloudcr.auth';

// ── Simulación del backend ──────────────────────────────────────────────────
// Cuando tu compañero termine POST /auth/login, reemplazá esta función por:
//
//   const res = await fetch('http://localhost:8000/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ correo, contrasena }),
//   });
//   if (!res.ok) throw new Error('Credenciales incorrectas');
//   return res.json().then((r) => r.data);
//
const USUARIOS_MOCK = [
  { correo: 'consultor@cloudcr.com', contrasena: '1234', rol: 'consultor',    nombre: 'Juan Pablo Sánchez' },
  { correo: 'org@cloudcr.com',       contrasena: '1234', rol: 'organizacion', nombre: 'Intel' },
];

async function llamarBackend(correo, contrasena) {
  const usuario = USUARIOS_MOCK.find(
    (u) => u.correo === correo && u.contrasena === contrasena,
  );
  if (!usuario) throw new Error('Credenciales incorrectas');
  const { contrasena: _, ...datos } = usuario;
  return { ...datos, token: 'mock-token-' + datos.rol };
}
// ───────────────────────────────────────────────────────────────────────────

export async function login(correo, contrasena) {
  const datos = await llamarBackend(correo, contrasena);
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
