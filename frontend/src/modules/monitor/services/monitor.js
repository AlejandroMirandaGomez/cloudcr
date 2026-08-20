import { api } from '../../../common/lib/api.js';

export const getBasesDatosMonitoreadas = () => api.get('/monitor/bases-datos');

export const getIndiceSalud = (baseDatosId) =>
  api.get(
    baseDatosId ? `/monitor/indice?baseDatosId=${encodeURIComponent(baseDatosId)}` : '/monitor/indice',
  );
export const getAlertasSalud = () => api.get('/monitor/alertas');
export const getHistoricoSalud = () => api.get('/monitor/historico');
