import { api } from '../../../common/lib/api.js';

const conBaseDatosId = (path, baseDatosId) =>
  api.get(baseDatosId ? `${path}?baseDatosId=${encodeURIComponent(baseDatosId)}` : path);

export const getBasesDatosMonitoreadas = () => api.get('/monitor/bases-datos');

export const getIndiceSalud = (baseDatosId) => conBaseDatosId('/monitor/indice', baseDatosId);
export const getAlertasSalud = (baseDatosId) => conBaseDatosId('/monitor/alertas', baseDatosId);
export const getHistoricoSalud = (baseDatosId) => conBaseDatosId('/monitor/historico', baseDatosId);
