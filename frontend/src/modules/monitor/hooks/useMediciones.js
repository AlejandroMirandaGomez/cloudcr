import { useMemo } from 'react';
import { getVariablesMedidas } from '../services/monitor.js';
import useSondeo from './useSondeo.js';

/**
 * Valores medidos por el collector para las variables de un componente,
 * indexados por codigo (p1, m3, a4...). Se refrescan solos, igual que el
 * resto del dashboard.
 *
 * Antes estos valores venian de `valoresPorBase` en data/variablesMonitor.js,
 * que eran numeros inventados por base de datos. Ahora salen de la lectura
 * real de Oracle guardada en Monitor_Mediciones.
 */
export default function useMediciones(baseDatosId, componenteId) {
  const { datos, error, cargando } = useSondeo(
    () => getVariablesMedidas(baseDatosId, componenteId),
    [baseDatosId, componenteId],
  );

  const mediciones = useMemo(
    () => new Map((datos ?? []).map((v) => [v.codigo, v])),
    [datos],
  );

  return { mediciones, error, cargando };
}
