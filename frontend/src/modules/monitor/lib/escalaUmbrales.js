export const COLOR_BANDA = { verde: '#2e7d32', amarillo: '#ed9b00', rojo: '#c62828' };

const ANCHO_POR_SEPARACION = 3;
const ANCHO_MINIMO_RELATIVO = 0.5;
const DECIMALES_MAXIMOS = 4;
const PASOS_MAXIMOS = 10000;

export const aNumeroFinito = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
};

export function formatearNumero(valor) {
  if (!Number.isFinite(valor)) return '';
  return Number(valor.toFixed(4)).toString();
}

/**
 * Ventana que dibuja el riel. Los porcentajes siempre van de 0 a 100: es la
 * escala natural de la unidad y evita que la ventana se cierre sobre si misma.
 *
 * Para el resto de las unidades no hay maximo natural, asi que la ventana se
 * arma alrededor de los dos umbrales pero nunca mas angosta que la mitad del
 * umbral mayor. Sin ese piso, dos umbrales casi pegados (61.05 y 61.06) daban
 * un riel de 0.04 de ancho.
 */
export function calcularDominio(umbralVerde, umbralRojo, unidad) {
  const verde = aNumeroFinito(umbralVerde);
  const rojo = aNumeroFinito(umbralRojo);
  if (verde === null || rojo === null) return null;

  if (unidad === '%') return { min: 0, max: 100 };

  const bajo = Math.min(verde, rojo);
  const alto = Math.max(verde, rojo);

  const ancho = Math.max(
    (alto - bajo) * ANCHO_POR_SEPARACION,
    Math.abs(alto) * ANCHO_MINIMO_RELATIVO,
    1,
  );
  const min = Math.max(0, (bajo + alto) / 2 - ancho / 2);

  return { min, max: min + ancho };
}

export function dominioParaEdicion(guardados, borrador, unidad) {
  const base = calcularDominio(guardados.verde, guardados.rojo, unidad);
  const delBorrador = calcularDominio(borrador.verde, borrador.rojo, unidad);

  if (!base) return delBorrador;

  const dentro = (valor) => {
    const numero = aNumeroFinito(valor);
    return numero === null || (numero >= base.min && numero <= base.max);
  };

  if (dentro(borrador.verde) && dentro(borrador.rojo)) return base;

  return delBorrador ?? base;
}

/**
 * Estira el dominio para que un valor medido fuera de rango quede dentro y su
 * marca no se pegue enganosamente a un extremo del riel.
 */
export function expandirDominio(dominio, valor, unidad) {
  const numero = aNumeroFinito(valor);
  if (!dominio || numero === null) return dominio;
  if (numero >= dominio.min && numero <= dominio.max) return dominio;

  const margen = (dominio.max - dominio.min) * 0.1;
  const max = Math.max(dominio.max, numero + margen);

  return {
    min: Math.max(0, Math.min(dominio.min, numero - margen)),
    max: unidad === '%' ? Math.min(100, max) : max,
  };
}

function pasoDeValor(valor) {
  const numero = aNumeroFinito(valor);
  if (numero === null || Number.isInteger(numero)) return 1;

  const decimales = String(Number(numero.toFixed(DECIMALES_MAXIMOS))).split('.')[1];
  return 10 ** -Math.min(decimales?.length ?? 0, DECIMALES_MAXIMOS);
}

/**
 * Salto del riel: la misma precision que ya traen los umbrales. Con umbrales
 * enteros se arrastra de a enteros, y con decimales se respeta el decimal, de
 * modo que arrastrar una marca nunca redondea un 99.95 a 100. El ancho de la
 * ventana solo entra como tope, para no generar cientos de miles de pasos.
 */
export function pasoDeDominio(dominio, umbralVerde, umbralRojo) {
  const porValores = Math.min(pasoDeValor(umbralVerde), pasoDeValor(umbralRojo));
  const porAncho = (dominio.max - dominio.min) / PASOS_MAXIMOS;

  return Math.max(porValores, porAncho, 10 ** -DECIMALES_MAXIMOS);
}

export function posicionEnDominio(valor, { min, max }) {
  if (max === min) return 0;
  return Math.max(0, Math.min(100, ((valor - min) / (max - min)) * 100));
}

/**
 * Reparte los dos umbrales en el orden en que se dibujan de izquierda a
 * derecha. El sentido sale del orden de los umbrales, no de una columna aparte:
 * si el rojo es mayor que el verde, los valores altos son peores.
 *
 * Con ambos umbrales iguales no hay orden que leer, asi que se conserva el
 * sentido que traiga altoMaloPorDefecto en vez de quedarse sin escala.
 */
export function bandasDeUmbrales(umbralVerde, umbralRojo, altoMaloPorDefecto = true) {
  const verde = aNumeroFinito(umbralVerde);
  const rojo = aNumeroFinito(umbralRojo);
  if (verde === null || rojo === null) return null;

  const altoMalo = verde === rojo ? altoMaloPorDefecto : rojo > verde;

  return {
    altoMalo,
    bajo: altoMalo ? verde : rojo,
    alto: altoMalo ? rojo : verde,
    colorBajo: altoMalo ? 'verde' : 'rojo',
    colorAlto: altoMalo ? 'rojo' : 'verde',
  };
}

export function gradienteDeBandas(bandas, dominio) {
  const pBajo = posicionEnDominio(bandas.bajo, dominio);
  const pAlto = posicionEnDominio(bandas.alto, dominio);
  const inicio = COLOR_BANDA[bandas.colorBajo];
  const fin = COLOR_BANDA[bandas.colorAlto];

  return [
    'linear-gradient(to right',
    `${inicio} 0%`,
    `${inicio} ${pBajo}%`,
    `${COLOR_BANDA.amarillo} ${pBajo}%`,
    `${COLOR_BANDA.amarillo} ${pAlto}%`,
    `${fin} ${pAlto}%`,
    `${fin} 100%)`,
  ].join(', ');
}
