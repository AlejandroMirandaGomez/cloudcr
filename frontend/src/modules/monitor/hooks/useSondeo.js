import { useCallback, useEffect, useRef, useState } from 'react';
import { REFRESCO_MS } from '../lib/refresco.js';

/**
 * Sondeo periodico de un endpoint del monitor.
 *
 * El dashboard antes hacia un unico fetch al montar, asi que los datos se
 * quedaban congelados. Este hook repite la consulta cada REFRESCO_MS para que
 * el tablero siga al collector en vivo.
 *
 * Detalles que evitan parpadeos y peticiones de mas:
 * - Solo la primera carga de cada clave enciende `cargando`; las siguientes
 *   actualizan los datos en silencio.
 * - Un error puntual (el backend despertando, la red) no borra lo ya mostrado:
 *   se expone en `error` pero los datos previos siguen en pantalla.
 * - Se pausa mientras la pestana esta oculta, y al volver refresca de una.
 *
 * @param {() => Promise<any>} consultar   llamada al servicio, ya con sus argumentos
 * @param {Array} dependencias             cuando cambian, se reinicia el sondeo
 */
export default function useSondeo(consultar, dependencias, { activo = true } = {}) {
  const clave = JSON.stringify(dependencias);

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [claveCargada, setClaveCargada] = useState(clave);

  // Cambio de base de datos o de componente: se descarta lo anterior y se
  // vuelve a mostrar el esqueleto. Ajustar el estado durante el render (en vez
  // de dentro de un efecto) evita el render intermedio con datos de la clave
  // vieja; es el mismo patron que ya usaban las paginas del monitor.
  if (claveCargada !== clave) {
    setClaveCargada(clave);
    setDatos(null);
    setError(null);
    setCargando(true);
  }

  // En refs para que cambiar la funcion en cada render no reinicie el ciclo.
  // La sincronizacion va en un efecto (no en el cuerpo del render) porque
  // escribir una ref durante el render rompe el modo concurrente de React.
  const consultarRef = useRef(consultar);
  useEffect(() => {
    consultarRef.current = consultar;
  });

  const montadoRef = useRef(true);
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const respuesta = await consultarRef.current();
      if (!montadoRef.current) return;
      setDatos(respuesta);
      setError(null);
    } catch (e) {
      if (!montadoRef.current) return;
      setError(e.message);
    } finally {
      if (montadoRef.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!activo) return undefined;

    refrescar();
    let temporizador = window.setInterval(refrescar, REFRESCO_MS);

    // Sin esto, una pestana en segundo plano seguiria pidiendo cada pocos
    // segundos durante horas.
    const alCambiarVisibilidad = () => {
      window.clearInterval(temporizador);
      if (document.visibilityState === 'visible') {
        refrescar();
        temporizador = window.setInterval(refrescar, REFRESCO_MS);
      }
    };

    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, [refrescar, activo, clave]);

  return { datos, error, cargando, refrescar };
}
