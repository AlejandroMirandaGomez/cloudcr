export const PESO_MINIMO = 0.01;
export const PESO_MAXIMO_RELATIVO = 100;
export const MODO_PORCENTAJE_EXACTO = 1;
export const MODO_PESOS_RELATIVOS = 2;

const TOTAL = 100;

const enCentesimas = (valor) => Math.round(valor * 1e10) / 1e8;
const redondear = (valor) => Math.round(enCentesimas(valor)) / 100;
const truncar = (valor) => Math.floor(enCentesimas(valor)) / 100;
const sumar = (valores) => valores.reduce((acumulado, valor) => acumulado + valor, 0);
const acotar = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), maximo);

const sumaDe = (pesos) => sumar(pesos.map((peso) => peso.valor));

function aplicarResiduo(pesos, idsPreferidos = [], limites = {}) {
  const residuo = redondear(TOTAL - sumaDe(pesos));
  if (residuo === 0) return pesos;

  const admite = (peso) => {
    const resultante = redondear(peso.valor + residuo);
    const limite = limites[peso.id];
    return resultante >= PESO_MINIMO && (limite === undefined || resultante <= limite);
  };

  const porId = new Map(pesos.map((peso) => [peso.id, peso]));
  const candidatos = [
    ...idsPreferidos.map((id) => porId.get(id)).filter(Boolean),
    ...[...pesos].sort((a, b) => b.valor - a.valor),
  ];
  const destino = candidatos.find(admite);

  if (!destino) return pesos;

  return pesos.map((peso) => (
    peso.id === destino.id ? { ...peso, valor: redondear(peso.valor + residuo) } : peso
  ));
}

function repartirPorSaturacion(pesos, idsARepartir, total) {
  const valorDe = new Map(pesos.map((peso) => [peso.id, peso.valor]));
  const asignados = new Map();
  let libres = [...idsARepartir];
  let restante = total;

  while (libres.length > 0) {
    const sumaLibres = sumar(libres.map((id) => valorDe.get(id)));
    const propuestos = libres.map((id) => ({
      id,
      valor: sumaLibres > 0 ? (valorDe.get(id) * restante) / sumaLibres : restante / libres.length,
    }));
    const saturados = propuestos.filter((propuesto) => propuesto.valor < PESO_MINIMO);

    if (saturados.length === 0) {
      for (const propuesto of propuestos) asignados.set(propuesto.id, propuesto.valor);
      break;
    }

    for (const saturado of saturados) {
      asignados.set(saturado.id, PESO_MINIMO);
      restante -= PESO_MINIMO;
    }

    const idsSaturados = new Set(saturados.map((saturado) => saturado.id));
    libres = libres.filter((id) => !idsSaturados.has(id));
  }

  return asignados;
}

export function distribuirEquitativo(ids) {
  if (ids.length === 0) return [];

  const base = truncar(TOTAL / ids.length);
  const pesos = ids.map((id) => ({ id, valor: base }));

  return aplicarResiduo(pesos, [ids[ids.length - 1]]);
}

export function maxEditable({ pesos, bloqueados = [], id }) {
  const bloqueadosSinId = pesos.filter((peso) => peso.id !== id && bloqueados.includes(peso.id));
  const cantidadLibresSinId = pesos.filter(
    (peso) => peso.id !== id && !bloqueados.includes(peso.id),
  ).length;

  return truncar(TOTAL - sumaDe(bloqueadosSinId) - PESO_MINIMO * cantidadLibresSinId);
}

export function editarPesoModo1({ pesos, bloqueados = [], id, nuevoValor }) {
  const maximo = maxEditable({ pesos, bloqueados, id });
  const valorEditado = redondear(acotar(Number(nuevoValor), PESO_MINIMO, maximo));

  const idsARepartir = pesos
    .filter((peso) => peso.id !== id && !bloqueados.includes(peso.id))
    .map((peso) => peso.id);

  if (idsARepartir.length === 0) return pesos;

  const sumaBloqueadosSinId = sumaDe(
    pesos.filter((peso) => peso.id !== id && bloqueados.includes(peso.id)),
  );
  const repartidos = repartirPorSaturacion(
    pesos,
    idsARepartir,
    TOTAL - sumaBloqueadosSinId - valorEditado,
  );

  const resultado = pesos.map((peso) => {
    if (peso.id === id) return { ...peso, valor: valorEditado };
    if (repartidos.has(peso.id)) return { ...peso, valor: redondear(repartidos.get(peso.id)) };
    return { ...peso, valor: redondear(peso.valor) };
  });

  const absorbentes = resultado
    .filter((peso) => repartidos.has(peso.id))
    .sort((a, b) => b.valor - a.valor)
    .map((peso) => peso.id);

  return aplicarResiduo(resultado, [...absorbentes, id], { [id]: maximo });
}

export function editarPesoModo2({ pesos, id, nuevoValor }) {
  const valor = redondear(acotar(Number(nuevoValor), PESO_MINIMO, PESO_MAXIMO_RELATIVO));
  return pesos.map((peso) => (peso.id === id ? { ...peso, valor } : peso));
}

export function puedeBloquear({ pesos, bloqueados = [], id }) {
  if (bloqueados.includes(id)) return { ok: true, motivo: '' };

  const propuestos = [...bloqueados, id];
  const cantidadLibres = pesos.length - propuestos.length;

  if (cantidadLibres < 2) {
    return {
      ok: false,
      motivo: 'Debe quedar un mínimo de 2 variables sin bloquear.',
    };
  }

  const sumaBloqueados = sumaDe(pesos.filter((peso) => propuestos.includes(peso.id)));

  if (sumaBloqueados > TOTAL - PESO_MINIMO * cantidadLibres) {
    return {
      ok: false,
      motivo: 'La suma de los pesos bloqueados no deja margen suficiente para las demás variables.',
    };
  }

  return { ok: true, motivo: '' };
}

export function porcentajesDesdeModo2(pesos) {
  const total = sumaDe(pesos);
  if (total <= 0) return distribuirEquitativo(pesos.map((peso) => peso.id));

  const normalizados = pesos.map((peso) => ({
    ...peso,
    valor: redondear((peso.valor / total) * TOTAL),
  }));

  return aplicarResiduo(normalizados);
}

export function convertirModo2AModo1(pesos) {
  if (pesos.length === 0) return [];

  const repartidos = repartirPorSaturacion(pesos, pesos.map((peso) => peso.id), TOTAL);
  const normalizados = pesos.map((peso) => ({
    ...peso,
    valor: redondear(repartidos.get(peso.id)),
  }));

  return aplicarResiduo(normalizados);
}

export function convertirModo1AModo2(pesos) {
  return pesos.map((peso) => ({ ...peso, valor: redondear(peso.valor) }));
}

export function formatearPeso(valor) {
  return `${Number(valor).toFixed(2)}%`;
}
