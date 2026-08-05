export function formatearPorcentaje(valor) {
  return valor === null || valor === undefined ? 'Sin datos' : `${Math.round(valor * 100)}%`;
}

/** Replica la escala de color que usa el backend (ReporteRepository::color). */
export function colorDeCumplimiento(valor) {
  if (valor === null || valor === undefined) return 'sin_datos';
  if (valor < 0.6) return 'rojo';
  if (valor < 0.85) return 'amarillo';
  return 'verde';
}
