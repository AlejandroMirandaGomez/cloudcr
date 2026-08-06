import { api } from '../../../common/lib/api.js';

export const getMadurez = (cuestionarioId) => api.get(`/cuestionarios/${cuestionarioId}/madurez`);
export const getRiesgo = (cuestionarioId) => api.get(`/cuestionarios/${cuestionarioId}/riesgo`);
