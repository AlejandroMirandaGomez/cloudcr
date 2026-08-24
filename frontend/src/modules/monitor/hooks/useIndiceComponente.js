import { getIndiceSalud } from '../services/monitor.js';
import useSondeo from './useSondeo.js';

/** Indice (IP/IM/IA) en vivo de la base seleccionada, para el banner de la tabla de detalle. */
export default function useIndiceComponente(baseDatosId, componenteId) {
  const { datos } = useSondeo(() => getIndiceSalud(baseDatosId), [baseDatosId, componenteId]);

  return datos?.componentes?.[componenteId] ?? null;
}
