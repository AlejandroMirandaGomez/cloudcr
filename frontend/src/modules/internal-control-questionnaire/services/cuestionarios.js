import { api } from '../../../common/lib/api.js';

// ── Cuestionarios ────────────────────────────────────────────────────────────
export const getCuestionarios = (params = {}) => {
  const qs = new URLSearchParams({ limit: 200, ...params }).toString();
  return api.get(`/cuestionarios?${qs}`).then((d) => Array.isArray(d) ? d : d.items ?? []);
};

export const getCuestionario = (id) => api.get(`/cuestionarios/${id}`);

export const crearCuestionario = (body) => api.post('/cuestionarios', body);

export const eliminarCuestionario = (id) => api.delete(`/cuestionarios/${id}`);

// ── Respuestas ───────────────────────────────────────────────────────────────

// Normaliza los valores del frontend ('Sí'→'Si', 'N/A'→'N-A', 'No'→'No')
function normalizarRespuesta(valor) {
  if (valor === 'Sí') return 'Si';
  if (valor === 'N/A') return 'N-A';
  return valor;
}

function normalizarBooleano(valor) {
  if (valor === 'Sí') return 'si';
  return 'no';
}

export const guardarRespuesta = (cuestionarioId, controlId, respuesta) =>
  api.put(`/cuestionarios/${cuestionarioId}/respuestas/${controlId}`, {
    respuesta:   normalizarRespuesta(respuesta.cumple),
    documentado: normalizarBooleano(respuesta.documentado),
    repetible:   normalizarBooleano(respuesta.repetible),
    evidencia:   normalizarBooleano(respuesta.evidencia),
  });

export const guardarLote = (cuestionarioId, respuestas) =>
  api.post(`/cuestionarios/${cuestionarioId}/respuestas`, {
    respuestas: respuestas.map(({ control_id, ...r }) => ({
      control_id,
      respuesta:   normalizarRespuesta(r.cumple),
      documentado: normalizarBooleano(r.documentado),
      repetible:   normalizarBooleano(r.repetible),
      evidencia:   normalizarBooleano(r.evidencia),
    })),
  });

export const getRespuestasPendientes = (cuestionarioId) =>
  api.get(`/cuestionarios/${cuestionarioId}/respuestas/pendientes`);

// ── Reportes ─────────────────────────────────────────────────────────────────
export const getResumen    = (id) => api.get(`/cuestionarios/${id}/resumen`);
export const getMapaCalor  = (id) => api.get(`/cuestionarios/${id}/mapa-calor`);
export const getHallazgos  = (id) => api.get(`/cuestionarios/${id}/hallazgos`);
