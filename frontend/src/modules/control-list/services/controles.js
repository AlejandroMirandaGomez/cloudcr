import { api } from '../../../common/lib/api.js';

const nombres = (lista) => (lista ?? []).map((x) => x.nombre);
const ids = (lista) => (lista ?? []).map((x) => x.id);

function mapearControl(c) {
  return {
    id:                     c.id,
    codigo:                 c.codigo,
    nombre:                 c.nombre,
    norma:                  c.norma,
    normaId:                c.norma_id,
    clausula:               c.clausula,
    dominioNorma:           c.dominio_norma,
    dominioNormaId:         c.dominio_norma_id,
    peso:                   c.peso,
    proposito:              c.proposito,
    descripcion:            c.descripcion,
    guia:                   c.guia ?? '',
    otraInformacion:        c.otra_informacion ?? '',
    confidencialidad:       c.confidencialidad,
    integridad:             c.integridad,
    disponibilidad:         c.disponibilidad,
    tipo:                   nombres(c.tipos),
    conceptoCiberseguridad: nombres(c.conceptos),
    dominioSeguridad:       nombres(c.dominios_seguridad),
    capacidadesOperativas:  nombres(c.capacidades),
    tiposIds:               ids(c.tipos),
    conceptosIds:           ids(c.conceptos),
    dominiosSeguridadIds:   ids(c.dominios_seguridad),
    capacidadesIds:         ids(c.capacidades),
    preguntas:              (c.preguntas ?? []).map((p) => p.texto),
    preguntasIds:           (c.preguntas ?? []).map((p) => p.id),
  };
}

function cuerpo(control) {
  return {
    norma_id:           control.normaId,
    dominio_norma_id:   control.dominioNormaId,
    codigo:             control.codigo,
    nombre:             control.nombre,
    proposito:          control.proposito,
    descripcion:        control.descripcion,
    peso:               Number(control.peso),
    confidencialidad:   control.confidencialidad || null,
    integridad:         control.integridad || null,
    disponibilidad:     control.disponibilidad || null,
    guia:               control.guia || null,
    otra_informacion:   control.otraInformacion || null,
    tipos:              control.tiposIds,
    conceptos:          control.conceptosIds,
    dominios_seguridad: control.dominiosSeguridadIds,
    capacidades:        control.capacidadesIds,
    preguntas:          control.preguntas.filter((texto) => texto.trim() !== ''),
  };
}

export function getControles(params = {}) {
  const qs = new URLSearchParams({ limit: 200, ...params }).toString();
  return api
    .get(`/controles?${qs}`)
    .then((d) => (Array.isArray(d) ? d : d.items ?? []).map(mapearControl));
}

export function getControl(id) {
  return api.get(`/controles/${id}`).then(mapearControl);
}

export function updateControl(id, control) {
  return api.put(`/controles/${id}`, cuerpo(control)).then(mapearControl);
}

export function getCatalogos() {
  return api.get('/catalogos');
}
