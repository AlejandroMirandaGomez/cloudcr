const ETIQUETA = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo' };

/**
 * Resuelve el valor simulado de una variable para una base de datos y, si
 * aplica, el color segun sus umbrales (mismo criterio Verde/Amarillo/Rojo
 * que usa el backend para IP/IM/IA). Las variables `fijo` son datos de
 * configuracion (tamano de SGA, maximo de procesos...): no cambian con la
 * salud del momento, por eso no tienen estado ni color.
 */
export function estadoDeVariable(variable, baseDatosId) {
  const id = [1, 2, 3, 4].includes(Number(baseDatosId)) ? Number(baseDatosId) : 1;
  const valor = variable.valoresPorBase[id];

  if (variable.sentido === 'fijo') {
    return { valor, unidad: variable.unidad, estado: null, color: null };
  }

  const { sentido, limiteAdvertencia, limiteCritico } = variable;
  const color = sentido === 'alto_malo'
    ? (valor >= limiteCritico ? 'rojo' : valor >= limiteAdvertencia ? 'amarillo' : 'verde')
    : (valor <= limiteCritico ? 'rojo' : valor <= limiteAdvertencia ? 'amarillo' : 'verde');

  return { valor, unidad: variable.unidad, estado: ETIQUETA[color], color };
}
