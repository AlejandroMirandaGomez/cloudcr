import { api } from '../../../common/lib/api.js';

const conBaseDatosId = (path, baseDatosId, extra = {}) => {
  const params = new URLSearchParams();
  if (baseDatosId) params.set('baseDatosId', baseDatosId);
  for (const [clave, valor] of Object.entries(extra)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor);
  }
  const query = params.toString();
  return api.get(query ? `${path}?${query}` : path);
};

export const getBasesDatosMonitoreadas = () => api.get('/monitor/bases-datos');

export const getIndiceSalud = (baseDatosId) => conBaseDatosId('/monitor/indice', baseDatosId);
export const getAlertasSalud = (baseDatosId) => conBaseDatosId('/monitor/alertas', baseDatosId);

export const getHistoricoSalud = (baseDatosId, limite) =>
  conBaseDatosId('/monitor/historico', baseDatosId, { limite });

/**
 * Valores medidos por el collector en el ultimo snapshot, uno por variable
 * (p1..p8, m1..m9, a1..a8). Reemplaza los valores simulados que antes vivian
 * en data/variablesMonitor.js.
 */
export const getVariablesMedidas = (baseDatosId, componente) =>
  conBaseDatosId('/monitor/variables', baseDatosId, { componente });

export const guardarAjustesVariables = (baseDatosId, componente, variables) =>
  api.put('/monitor/ajustes', { baseDatosId, componente, variables });

export const getUmbralesIndice = (baseDatosId) =>
  conBaseDatosId('/monitor/umbrales-indice', baseDatosId);

export const guardarUmbralesIndice = (baseDatosId, umbrales) =>
  api.put('/monitor/umbrales-indice', { baseDatosId, umbrales });
