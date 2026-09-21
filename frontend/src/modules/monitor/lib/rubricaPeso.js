/**
 * Rubrica para determinar el peso de una variable dentro de su componente.
 * Espejo de backend/app/Monitor/RubricaPeso.php: el backend valida y calcula
 * el peso sugerido; aqui solo viven los textos de las preguntas y el puntaje
 * en vivo para mostrarlo mientras se responde.
 *
 *   puntaje = impacto x probabilidad + tiempo de reaccion + cobertura   (3..24)
 */
export const PREGUNTAS_RUBRICA = [
  {
    id: 'impacto',
    titulo: 'Impacto',
    texto: 'Si esta variable llega a nivel crítico, ¿qué pasa con la operación de la empresa?',
    opciones: ['Nada perceptible', 'Lentitud tolerable', 'Interrupción parcial', 'Caída total del servicio'],
  },
  {
    id: 'probabilidad',
    titulo: 'Probabilidad',
    texto: '¿Con qué frecuencia esta variable se acerca a sus umbrales en esta base?',
    opciones: ['Nunca', 'Rara vez (mensual)', 'Frecuente (semanal)', 'Constante (diario)'],
  },
  {
    id: 'tiempo_reaccion',
    titulo: 'Tiempo de reacción',
    texto: 'Cuando se degrada, ¿cuánto margen hay para reaccionar antes de que afecte a los usuarios?',
    opciones: ['Horas o más', 'Alrededor de una hora', 'Minutos', 'Inmediato'],
  },
  {
    id: 'cobertura',
    titulo: 'Cobertura',
    texto: '¿Existe otro control o alerta que ya cubra este riesgo?',
    opciones: ['Sí, automatizado', 'Sí, manual', 'Parcial', 'Ninguno'],
  },
];

export const PUNTAJE_NEUTRO = 8;
export const PUNTAJE_MINIMO = 3;
export const PUNTAJE_MAXIMO = 24;

export const rubricaCompleta = (respuestas) =>
  !!respuestas && PREGUNTAS_RUBRICA.every((p) => Number.isInteger(respuestas[p.id]));

export function puntajeRubrica(respuestas) {
  if (!rubricaCompleta(respuestas)) return null;
  return respuestas.impacto * respuestas.probabilidad
    + respuestas.tiempo_reaccion
    + respuestas.cobertura;
}
