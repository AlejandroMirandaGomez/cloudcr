import controles from '../../../common/data/controles-iso27002.json';

const RESPUESTA_INICIAL = {
  cumple: 'No',
  documentado: 'No',
  repetible: 'No',
  evidencia: 'No',
};

const respuestasPorControl = new Map(
  controles.map((c) => [c.codigo, c.preguntas.map(() => ({ ...RESPUESTA_INICIAL }))]),
);

export function getRespuestas(codigo) {
  return respuestasPorControl.get(codigo) ?? [];
}

export function setRespuesta(codigo, indicePregunta, campo, valor) {
  const actuales = respuestasPorControl.get(codigo);
  if (!actuales) return [];

  const siguientes = actuales.map((respuesta, i) => (
    i === indicePregunta ? { ...respuesta, [campo]: valor } : respuesta
  ));
  respuestasPorControl.set(codigo, siguientes);

  return siguientes;
}
