import { api } from '../../../common/lib/api.js';

export const getIndiceSalud = () => api.get('/monitor/indice');
export const getAlertasSalud = () => api.get('/monitor/alertas');
export const getHistoricoSalud = () => api.get('/monitor/historico');
