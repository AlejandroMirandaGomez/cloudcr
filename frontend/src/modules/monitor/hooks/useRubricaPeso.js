import { useCallback, useEffect, useState } from 'react';
import { aplicarRubricaPeso, getRubricaPeso, guardarRubricaPeso } from '../services/monitor.js';

/**
 * Rubrica de peso de un componente para una base: respuestas por variable,
 * puntaje, peso actual y peso sugerido. `guardar` persiste las respuestas de
 * una variable; `aplicar` escribe los pesos sugeridos como pesos vigentes.
 */
export default function useRubricaPeso(baseDatosId, componenteId) {
  const [rubrica, setRubrica] = useState(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [clave, setClave] = useState(null);

  // Mismo patron que useAjustesVariables: al cambiar base o componente se
  // vuelve a "cargando" durante el render, sin setState dentro del efecto.
  const claveActual = `${baseDatosId}:${componenteId}`;
  if (clave !== claveActual) {
    setClave(claveActual);
    setListo(false);
  }

  useEffect(() => {
    let vigente = true;

    getRubricaPeso(baseDatosId, componenteId)
      .then((respuesta) => {
        if (vigente) setRubrica(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setListo(true);
      });

    return () => { vigente = false; };
  }, [baseDatosId, componenteId]);

  const guardar = useCallback(async (variableCodigo, respuestas) => {
    setError('');
    try {
      const respuesta = await guardarRubricaPeso(baseDatosId, variableCodigo, respuestas);
      setRubrica(respuesta);
      return { ok: true, error: '' };
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    }
  }, [baseDatosId]);

  const aplicar = useCallback(async () => {
    setError('');
    try {
      await aplicarRubricaPeso(baseDatosId, componenteId);
      // Tras aplicar, el peso actual pasa a ser el sugerido: se relee para no
      // duplicar el calculo en el cliente.
      setRubrica(await getRubricaPeso(baseDatosId, componenteId));
      return { ok: true, error: '' };
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    }
  }, [baseDatosId, componenteId]);

  return { rubrica, listo, error, guardar, aplicar };
}
