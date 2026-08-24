import { colorDeVariable } from './estadoVariable.js';

export const INDICADORES = { procesos: 'IP', memoria: 'IM', archivos: 'IA' };
export const CLAVES_INDICE = { procesos: 'ip', memoria: 'im', archivos: 'ia' };

export const INDICES_CONFIGURABLES = ['isbd', 'ip', 'im', 'ia'];

export const ETIQUETAS_INDICE = {
  isbd: 'Índice de Salud de Base de Datos (ISBD)',
  ip: 'Índice de Procesos (IP)',
  im: 'Índice de Memoria (IM)',
  ia: 'Índice de Archivos (IA)',
};

export const UMBRALES_INDICE_POR_DEFECTO = {
  isbd: { verde: 75, rojo: 60 },
  ip: { verde: 75, rojo: 60 },
  im: { verde: 75, rojo: 60 },
  ia: { verde: 75, rojo: 60 },
};

const PUNTAJE_VERDE_MINIMO = 75;
const PUNTAJE_AMARILLO_MINIMO = 60;
const PUNTAJE_MINIMO_GEOMETRICO = 1;

const redondear = (valor) => Math.round(Math.max(0, Math.min(100, valor)) * 100) / 100;

function fraccion(valor, desde, hasta) {
  const tramo = hasta - desde;
  if (Math.abs(tramo) < 1e-9) return 1;
  return Math.max(0, Math.min(1, (valor - desde) / tramo));
}

const referenciaSana = (umbralVerde) => (umbralVerde <= 0 ? 100 : Math.min(100, umbralVerde * 2));

export function puntajeDeVariable(variable, valor) {
  const color = colorDeVariable(variable, valor);
  if (color === null) return null;

  const { umbralVerde, umbralRojo } = variable;
  const altoMalo = umbralRojo > umbralVerde;

  if (color === 'verde') {
    const avance = altoMalo
      ? fraccion(valor, 0, umbralVerde)
      : fraccion(valor, referenciaSana(umbralVerde), umbralVerde);
    return redondear(100 - (100 - PUNTAJE_VERDE_MINIMO) * avance);
  }

  if (color === 'amarillo') {
    const avance = fraccion(valor, umbralVerde, umbralRojo);
    return redondear(
      PUNTAJE_VERDE_MINIMO - (PUNTAJE_VERDE_MINIMO - PUNTAJE_AMARILLO_MINIMO) * avance,
    );
  }

  const avance = altoMalo
    ? fraccion(valor, umbralRojo, umbralRojo + Math.max(Math.abs(umbralRojo) * 0.5, 1))
    : fraccion(valor, umbralRojo, 0);
  return redondear(PUNTAJE_AMARILLO_MINIMO * (1 - avance));
}

export function estadoDeIndice(valor, umbrales) {
  const verde = umbrales?.verde ?? PUNTAJE_VERDE_MINIMO;
  const rojo = umbrales?.rojo ?? PUNTAJE_AMARILLO_MINIMO;

  if (valor >= verde) return { estado: 'Verde', color: 'verde' };
  if (valor <= rojo) return { estado: 'Rojo', color: 'rojo' };
  return { estado: 'Amarillo', color: 'amarillo' };
}

export function describirUmbralesIndice({ verde, rojo }) {
  return `Rojo: 0 – ${rojo} · Amarillo: ${rojo} – ${verde} · Verde: ${verde} – 100`;
}

export function calcularIndiceComponente(filas, mediciones, umbrales) {
  let sumaPesos = 0;
  let sumaLogaritmos = 0;

  for (const fila of filas) {
    const medicion = mediciones?.get(fila.id);
    if (!medicion || medicion.valor === null || medicion.valor === undefined) continue;

    const puntaje = puntajeDeVariable(fila, Number(medicion.valor));
    if (puntaje === null) continue;

    const peso = Number(fila.porcentaje ?? fila.peso);
    if (!(peso > 0)) continue;

    sumaPesos += peso;
    sumaLogaritmos += peso * Math.log(Math.max(puntaje, PUNTAJE_MINIMO_GEOMETRICO));
  }

  if (sumaPesos <= 0) return null;

  const valor = redondear(Math.exp(sumaLogaritmos / sumaPesos));

  return { valor, ...estadoDeIndice(valor, umbrales) };
}
