const RESPUESTA_INICIAL = {
  cumple: 'No',
  documentado: 'No',
  repetible: 'No',
  evidencia: 'No',
};

const respuestasPorControl = new Map();

export function inicializar(codigo, cantidadDePreguntas) {
  const actuales = respuestasPorControl.get(codigo) ?? [];
  if (actuales.length === cantidadDePreguntas) return actuales;

  const siguientes = Array.from(
    { length: cantidadDePreguntas },
    (_, i) => actuales[i] ?? { ...RESPUESTA_INICIAL },
  );
  respuestasPorControl.set(codigo, siguientes);

  return siguientes;
}

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
