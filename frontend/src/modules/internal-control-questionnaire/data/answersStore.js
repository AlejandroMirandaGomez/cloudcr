import controles from '../../../common/data/controles-iso27002.json';

const RESPUESTAS_INICIALES = {
  documentado: false,
  repetible: false,
  evidencia: false,
  cumple: 'No',
};

let filas = controles.map((c) => ({ ...c, ...RESPUESTAS_INICIALES }));

export function getFilas() {
  return filas;
}

export function setRespuesta(id, campo, valor) {
  filas = filas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f));
  return filas;
}
