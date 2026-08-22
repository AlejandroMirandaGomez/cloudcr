import { useEffect, useState } from 'react';
import { getIndiceSalud } from '../services/monitor.js';

/** Trae el indice (IP/IM/IA) real de la base seleccionada, para mostrar su color en la tabla de detalle. */
export default function useIndiceComponente(baseDatosId, componenteId) {
  const clave = `${baseDatosId}:${componenteId}`;
  const [claveCargada, setClaveCargada] = useState(clave);
  const [componente, setComponente] = useState(null);

  if (claveCargada !== clave) {
    setClaveCargada(clave);
    setComponente(null);
  }

  useEffect(() => {
    let activo = true;

    getIndiceSalud(baseDatosId)
      .then((indice) => activo && setComponente(indice.componentes[componenteId] ?? null))
      .catch(() => activo && setComponente(null));

    return () => {
      activo = false;
    };
  }, [baseDatosId, componenteId]);

  return componente;
}
