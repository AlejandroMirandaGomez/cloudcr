import { api } from '../../../common/lib/api.js';

export const getCuestionarios = (params = {}) => {
  const qs = new URLSearchParams({ limit: 200, ...params }).toString();
  return api.get(`/cuestionarios?${qs}`).then((d) => (Array.isArray(d) ? d : d.items ?? []));
};

export const getCuestionario = (id) => api.get(`/cuestionarios/${id}`);

export const crearCuestionario = (body) => api.post('/cuestionarios', body);

export const eliminarCuestionario = (id) => api.delete(`/cuestionarios/${id}`);

export const guardarRespuesta = (cuestionarioId, preguntaId, respuesta) =>
  api.put(`/cuestionarios/${cuestionarioId}/respuestas/${preguntaId}`, {
    cumple:                  respuesta.cumple,
    documentado:             respuesta.documentado,
    repetible:               respuesta.repetible,
    evidencia:               respuesta.evidencia,
    justificacion_no_aplica: respuesta.justificacion_no_aplica ?? null,
  });

export const guardarLote = (cuestionarioId, respuestas) =>
  api.post(`/cuestionarios/${cuestionarioId}/respuestas`, {
    respuestas: respuestas.map((r) => ({
      pregunta_id:             r.pregunta_id,
      cumple:                  r.cumple,
      documentado:             r.documentado,
      repetible:               r.repetible,
      evidencia:               r.evidencia,
      justificacion_no_aplica: r.justificacion_no_aplica ?? null,
    })),
  });

export const getRespuestasPendientes = (cuestionarioId) =>
  api.get(`/cuestionarios/${cuestionarioId}/respuestas/pendientes`);

export const getResumen   = (id) => api.get(`/cuestionarios/${id}/resumen`);
export const getMapaCalor = (id) => api.get(`/cuestionarios/${id}/mapa-calor`);
export const getHallazgos = (id) => api.get(`/cuestionarios/${id}/hallazgos`);

export const getOrganizaciones = () =>
  api.get('/organizaciones?limit=200').then((d) => (Array.isArray(d) ? d : d.items ?? []));
