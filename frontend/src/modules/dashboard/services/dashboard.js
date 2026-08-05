import { api } from '../../../common/lib/api.js';

export const getHistorialOrganizacion = (organizacionId) =>
  api.get(`/organizaciones/${organizacionId}/historial`);
