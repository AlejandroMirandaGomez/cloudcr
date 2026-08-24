import { useMemo } from 'react';
import { calcularIndiceComponente } from '../lib/indiceSalud.js';

export default function useIndiceComponente(filas, mediciones, umbrales) {
  return useMemo(
    () => calcularIndiceComponente(filas, mediciones, umbrales),
    [filas, mediciones, umbrales],
  );
}
