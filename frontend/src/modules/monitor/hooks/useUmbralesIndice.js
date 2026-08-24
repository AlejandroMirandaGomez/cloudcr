import { useCallback, useEffect, useState } from 'react';
import { getUmbralesIndice, guardarUmbralesIndice } from '../services/monitor.js';
import { UMBRALES_INDICE_POR_DEFECTO } from '../lib/indiceSalud.js';

export default function useUmbralesIndice(baseDatosId) {
  const [umbrales, setUmbrales] = useState(UMBRALES_INDICE_POR_DEFECTO);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;

    getUmbralesIndice(baseDatosId)
      .then((respuesta) => {
        if (vigente && respuesta?.umbrales) setUmbrales(respuesta.umbrales);
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setListo(true);
      });

    return () => { vigente = false; };
  }, [baseDatosId]);

  const guardar = useCallback(async (nuevos) => {
    setError('');
    try {
      const respuesta = await guardarUmbralesIndice(baseDatosId, nuevos);
      setUmbrales(respuesta.umbrales);
      return { ok: true, error: '' };
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    }
  }, [baseDatosId]);

  return { umbrales, listo, error, guardar };
}
