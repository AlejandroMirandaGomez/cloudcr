import { api } from '../../../common/lib/api.js';

const ENDPOINTS = { evaluador: '/evaluadores', organizacion: '/organizaciones' };

export function registrarUsuario(tipo, { nombre, correo, contrasena }) {
  return api.post(ENDPOINTS[tipo], { nombre, correo, contrasena });
}

export function actualizarUsuario(tipo, id, { nombre, correo, contrasena }) {
  const body = { nombre, correo };
  if (contrasena) body.contrasena = contrasena;
  return api.put(`${ENDPOINTS[tipo]}/${id}`, body);
}
