import { MODO_PORCENTAJE_EXACTO, distribuirEquitativo } from '../lib/pesos.js';

const COMPONENTES = {
  procesos: {
    titulo: 'Procesos',
    indicador: 'IP',
    campoSecundario: 'descripcion',
    etiquetaSecundaria: 'Descripción',
    variables: [
      { id: 'p1', variable: 'Procesos actuales', descripcion: 'Número de procesos Oracle activos', dato: 'p1', fuente: 'V$PROCESS / V$RESOURCE_LIMIT', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'p2', variable: 'Procesos máximos', descripcion: 'Máximo de procesos registrados', dato: 'p2', fuente: 'V$RESOURCE_LIMIT', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'p3', variable: 'Sesiones actuales', descripcion: 'Número de sesiones', dato: 'p3', fuente: 'V$SESSION', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'p4', variable: 'Sesiones activas', descripcion: 'Sesiones que están ejecutando actividad', dato: 'p4', fuente: "V$SESSION (status='ACTIVE')", como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'p5', variable: 'Sesiones inactivas', descripcion: 'Sesiones conectadas pero sin actividad', dato: 'p5', fuente: "V$SESSION (status='INACTIVE')", como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'p6', variable: 'Sesiones bloqueadas', descripcion: 'Sesiones que esperan por otra sesión', dato: 'p6', fuente: 'V$SESSION (blocking_session) / V$WAIT_CHAINS', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'p7', variable: 'Operaciones prolongadas', descripcion: 'Operaciones que requieren un tiempo considerable', dato: 'p7', fuente: 'V$SESSION_LONGOPS', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'p8', variable: 'Uso de recursos', descripcion: 'Utilización de límites establecidos', dato: 'p8', fuente: 'V$RESOURCE_LIMIT', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
    ],
  },
  memoria: {
    titulo: 'Memoria',
    indicador: 'IM',
    campoSecundario: 'area',
    etiquetaSecundaria: 'Área',
    variables: [
      { id: 'm1', variable: 'Tamaño de SGA', area: 'SGA', dato: 'm1', fuente: 'V$SGA / V$SGAINFO', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm2', variable: 'Memoria libre de SGA', area: 'SGA', dato: 'm2', fuente: 'V$SGAINFO ("Free SGA Memory Available")', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm3', variable: 'Uso de Shared Pool', area: 'SGA', dato: 'm3', fuente: "V$SGASTAT (pool='shared pool')", como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm4', variable: 'Uso de Buffer Cache', area: 'SGA', dato: 'm4', fuente: 'V$SGAINFO ("Buffer Cache Size")', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm5', variable: 'PGA asignada', area: 'PGA', dato: 'm5', fuente: 'V$PGASTAT ("total PGA allocated")', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm6', variable: 'PGA utilizada', area: 'PGA', dato: 'm6', fuente: 'V$PGASTAT ("total PGA inuse")', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm7', variable: 'PGA máxima', area: 'PGA', dato: 'm7', fuente: 'V$PGASTAT ("maximum PGA allocated")', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm8', variable: 'Over-allocation', area: 'PGA', dato: 'm8', fuente: 'V$PGASTAT ("total PGA allocated" vs "aggregate PGA target parameter")', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'm9', variable: 'Cache hit de PGA', area: 'PGA', dato: 'm9', fuente: 'V$PGASTAT ("cache hit percentage")', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
    ],
  },
  archivos: {
    titulo: 'Archivos',
    indicador: 'IA',
    campoSecundario: 'descripcion',
    etiquetaSecundaria: 'Descripción',
    variables: [
      { id: 'a1', variable: 'Datafiles online', descripcion: 'Archivos disponibles', dato: 'a1', fuente: "V$DATAFILE (status='ONLINE') / V$DATAFILE_HEADER", como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'a2', variable: 'Datafiles offline', descripcion: 'Archivos no disponibles', dato: 'a2', fuente: "V$DATAFILE (status='OFFLINE')", como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'a3', variable: 'Tamaño de datafiles', descripcion: 'Capacidad utilizada', dato: 'a3', fuente: 'V$DATAFILE (bytes) / DBA_DATA_FILES', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'a4', variable: 'Espacio de tablespaces', descripcion: 'Espacio disponible', dato: 'a4', fuente: 'DBA_TABLESPACE_USAGE_METRICS / DBA_FREE_SPACE', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'a5', variable: 'Tempfiles', descripcion: 'Estado y capacidad', dato: 'a5', fuente: 'V$TEMPFILE / DBA_TEMP_FILES', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'a6', variable: 'Redo logs', descripcion: 'Estado de grupos y miembros', dato: 'a6', fuente: 'V$LOG / V$LOGFILE', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'a7', variable: 'Archivos inválidos', descripcion: 'Archivos con problemas', dato: 'a7', fuente: "V$DATAFILE (status='INVALID' o RECOVER)", como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
      { id: 'a8', variable: 'Archivos inaccesibles', descripcion: 'Archivos que no pueden utilizarse', dato: 'a8', fuente: 'V$DATAFILE / V$DATAFILE_HEADER (error_status)', como: 'SQL', limiteInferior: 0.4, limiteSuperior: 1.25 },
    ],
  },
};

for (const componente of Object.values(COMPONENTES)) {
  const equitativos = distribuirEquitativo(componente.variables.map((v) => v.id));
  const pesoPorId = new Map(equitativos.map((p) => [p.id, p.valor]));

  for (const variable of componente.variables) {
    variable.peso = pesoPorId.get(variable.id);
  }

  componente.preferenciaPesos = { modo: MODO_PORCENTAJE_EXACTO, bloqueados: [] };
}

export function getComponente(componenteId) {
  return COMPONENTES[componenteId] ?? null;
}

export function getPesos(componenteId) {
  const componente = getComponente(componenteId);
  if (!componente) return [];
  return componente.variables.map((v) => ({ id: v.id, valor: v.peso }));
}

export function getPreferenciaPesos(componenteId) {
  const preferencia = getComponente(componenteId)?.preferenciaPesos;
  if (!preferencia) return { modo: MODO_PORCENTAJE_EXACTO, bloqueados: [] };
  return { modo: preferencia.modo, bloqueados: [...preferencia.bloqueados] };
}

export function actualizarPesos(componenteId, pesos, preferencia) {
  const componente = getComponente(componenteId);
  if (!componente) return null;

  const pesoPorId = new Map(pesos.map((p) => [p.id, p.valor]));

  for (const variable of componente.variables) {
    if (pesoPorId.has(variable.id)) variable.peso = pesoPorId.get(variable.id);
  }

  if (preferencia) {
    componente.preferenciaPesos = {
      modo: preferencia.modo,
      bloqueados: [...preferencia.bloqueados],
    };
  }

  return componente;
}

export function getVariable(componenteId, variableId) {
  return getComponente(componenteId)?.variables.find((v) => v.id === variableId) ?? null;
}

export function actualizarLimites(componenteId, variableId, limiteInferior, limiteSuperior) {
  const variable = getVariable(componenteId, variableId);
  if (!variable) return null;
  variable.limiteInferior = limiteInferior;
  variable.limiteSuperior = limiteSuperior;
  return variable;
}

export function formatearMetrica(variable) {
  return `[${variable.limiteInferior} - ${variable.limiteSuperior}]`;
}
