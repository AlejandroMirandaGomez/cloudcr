const ETIQUETA = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo' };

export const SIN_DATO = '—';

/**
 * Lectura de una variable en el ultimo snapshot del collector.
 *
 * El backend ya resolvio el color contra los umbrales de Monitor_Variables
 * (misma regla que aplicaba antes este archivo sobre datos simulados), asi que
 * aqui solo se le da formato para la tabla.
 *
 * Devuelve valor null cuando el collector todavia no reporto esa variable:
 * puede ser que la instancia recien se registro, o que al usuario de monitoreo
 * le falte privilegio sobre esa vista.
 *
 * @param {object} variable    definicion de la variable (trae id y unidad)
 * @param {Map<string,object>} mediciones  codigo -> medicion del API
 */
export function estadoDeVariable(variable, mediciones) {
  const medicion = mediciones?.get(variable.id);

  if (!medicion || medicion.valor === null || medicion.valor === undefined) {
    return { valor: null, unidad: variable.unidad, estado: null, color: null, medido: false };
  }

  return {
    valor: medicion.valor,
    unidad: medicion.unidad ?? variable.unidad,
    // Las variables 'fijo' son configuracion (tamano de SGA, maximo de
    // procesos): tienen valor pero no estado ni color.
    estado: medicion.color ? ETIQUETA[medicion.color] : null,
    color: medicion.color ?? null,
    medido: true,
  };
}

/** Texto de la celda "Valor" de las tablas de detalle. */
export function formatearValor({ valor, unidad }) {
  if (valor === null || valor === undefined) return SIN_DATO;
  return unidad ? `${valor} ${unidad}` : String(valor);
}
