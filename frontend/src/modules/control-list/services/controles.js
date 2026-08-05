import { api } from '../../../common/lib/api.js';

// Normaliza la respuesta del backend al shape que espera el frontend
function mapearControl(c) {
  return {
    id:               c.id,
    codigo:           String(c.id),
    norma:            c.normas?.map((n) => n.nombre).join(', ') ?? '',
    nombre:           c.nombre_control,
    descripcion:      c.detalle ?? '',
    tipo:             c.tipo_control ? [c.tipo_control] : [],
    integridad:       mapearNivel(c.integridad),
    disponibilidad:   mapearNivel(c.disponibilidad),
    confidencialidad: mapearNivel(c.confidencialidad),
    normas:           c.normas ?? [],
    _raw:             c,
  };
}

function mapearNivel(valor) {
  if (valor === 'P') return 'Primario';
  if (valor === 'S') return 'Secundario';
  return null;
}

export function getControles(params = {}) {
  const qs = new URLSearchParams({ limit: 200, ...params }).toString();
  return api.get(`/controles?${qs}`).then((d) => (Array.isArray(d) ? d : d.items ?? []).map(mapearControl));
}

export function getControl(id) {
  return api.get(`/controles/${id}`).then(mapearControl);
}

export function updateControl(id, { nombre, tipo, descripcion, integridad, disponibilidad, confidencialidad }) {
  return api.put(`/controles/${id}`, {
    nombre_control: nombre,
    tipo_control: tipo,
    detalle: descripcion,
    integridad: nivelInverso(integridad),
    disponibilidad: nivelInverso(disponibilidad),
    confidencialidad: nivelInverso(confidencialidad),
  }).then(mapearControl);
}

function nivelInverso(valor) {
  if (valor === 'Primario') return 'P';
  if (valor === 'Secundario') return 'S';
  return 'N-A';
}
