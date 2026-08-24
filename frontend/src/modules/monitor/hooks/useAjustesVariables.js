import { useCallback, useEffect, useState } from 'react';
import { getVariablesMedidas, guardarAjustesVariables } from '../services/monitor.js';
import { ajustesParaGuardar, hidratarAjustes } from '../data/variablesMonitor.js';

export default function useAjustesVariables(baseDatosId, componenteId) {
  const [version, setVersion] = useState(0);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [clave, setClave] = useState(null);

  const claveActual = `${baseDatosId}:${componenteId}`;

  if (clave !== claveActual) {
    setClave(claveActual);
    setListo(false);
  }

  useEffect(() => {
    let vigente = true;

    getVariablesMedidas(baseDatosId, componenteId)
      .then((filas) => {
        if (!vigente) return;
        hidratarAjustes(componenteId, filas);
        setVersion((actual) => actual + 1);
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setListo(true);
      });

    return () => { vigente = false; };
  }, [baseDatosId, componenteId]);

  const persistir = useCallback(async () => {
    setError('');
    try {
      const filas = await guardarAjustesVariables(
        baseDatosId,
        componenteId,
        ajustesParaGuardar(componenteId),
      );
      hidratarAjustes(componenteId, filas);
      setVersion((actual) => actual + 1);
      return { ok: true, error: '' };
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    }
  }, [baseDatosId, componenteId]);

  return { listo, version, error, persistir };
}
