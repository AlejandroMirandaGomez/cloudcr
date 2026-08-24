/**
 * Cadencia de refresco del monitor.
 *
 * El collector empuja un snapshot cada INTERVALO_SEGUNDOS (collector/.env).
 * El dashboard consulta un poco mas seguido para que el retraso maximo entre
 * lo que pasa en Oracle y lo que se ve en pantalla sea de un ciclo.
 *
 * Para la demostracion en vivo conviene bajar ambos a 2-3 s:
 *   collector/.env   INTERVALO_SEGUNDOS=3
 *   frontend/.env    VITE_MONITOR_REFRESCO_MS=3000
 */
const POR_DEFECTO = 5000;
const MINIMO = 1000;
const MAXIMO = 300000;

function leerIntervalo() {
  const crudo = Number(import.meta.env.VITE_MONITOR_REFRESCO_MS);
  if (!Number.isFinite(crudo) || crudo <= 0) return POR_DEFECTO;
  return Math.min(Math.max(crudo, MINIMO), MAXIMO);
}

export const REFRESCO_MS = leerIntervalo();
