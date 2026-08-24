const ETIQUETA = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo' };

export const SIN_DATO = '—';

const conUnidad = (valor, unidad) => (unidad ? `${valor} ${unidad}` : String(valor));

export function tieneUmbrales(variable) {
  return variable?.umbralVerde !== null && variable?.umbralVerde !== undefined
    && variable?.umbralRojo !== null && variable?.umbralRojo !== undefined;
}

export function colorDeVariable(variable, valor) {
  if (!tieneUmbrales(variable)) return null;

  const { umbralVerde, umbralRojo } = variable;

  if (umbralRojo > umbralVerde) {
    if (valor <= umbralVerde) return 'verde';
    if (valor >= umbralRojo) return 'rojo';
    return 'amarillo';
  }

  if (valor >= umbralVerde) return 'verde';
  if (valor <= umbralRojo) return 'rojo';
  return 'amarillo';
}

export function estadoDeVariable(variable, mediciones) {
  const medicion = mediciones?.get(variable.id);

  if (!medicion || medicion.valor === null || medicion.valor === undefined) {
    return { valor: null, unidad: variable.unidad, estado: null, color: null, medido: false };
  }

  const color = colorDeVariable(variable, Number(medicion.valor));

  return {
    valor: medicion.valor,
    unidad: medicion.unidad ?? variable.unidad,
    estado: color ? ETIQUETA[color] : null,
    color,
    medido: true,
  };
}

export function formatearValor({ valor, unidad }) {
  if (valor === null || valor === undefined) return SIN_DATO;
  return conUnidad(valor, unidad);
}

export function formatearUmbrales(variable) {
  if (!tieneUmbrales(variable)) return SIN_DATO;

  const { umbralVerde, umbralRojo, unidad } = variable;
  return `Verde: ${conUnidad(umbralVerde, unidad)} · Rojo: ${conUnidad(umbralRojo, unidad)}`;
}

export function describirUmbrales(variable) {
  if (!tieneUmbrales(variable)) return null;

  const { umbralVerde, umbralRojo, unidad } = variable;
  if (umbralVerde === umbralRojo) return null;

  const verde = conUnidad(umbralVerde, unidad);
  const rojo = conUnidad(umbralRojo, unidad);

  if (umbralRojo > umbralVerde) {
    return `Un valor de ${verde} o menos es Verde; entre ${verde} y ${rojo} es Amarillo; y de ${rojo} o más es Rojo.`;
  }

  return `Un valor de ${verde} o más es Verde; entre ${rojo} y ${verde} es Amarillo; y de ${rojo} o menos es Rojo.`;
}
