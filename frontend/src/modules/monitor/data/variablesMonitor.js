import { MODO_PORCENTAJE_EXACTO, distribuirEquitativo } from '../lib/pesos.js';

/**
 * Definicion de las variables de salud del monitor.
 *
 * Los VALORES ya no viven aqui: los mide el collector contra Oracle y llegan
 * por GET /monitor/variables (ver hooks/useMediciones.js). Este archivo se
 * queda solo con la definicion que necesita la interfaz de pesos y umbrales
 * editables, que es estado del cliente y todavia no se persiste.
 *
 * Ojo: estas definiciones duplican la tabla Monitor_Variables del backend
 * (migracion 0004). Unificarlas exige que la edicion de pesos/umbrales escriba
 * contra el API; queda anotado en backend/docs/Gaps.md.
 *
 * `sentido` indica como leer el valor contra sus umbrales:
 * - 'alto_malo': mientras mas alto, peor (ej. % de uso, procesos bloqueados).
 * - 'alto_bueno': mientras mas alto, mejor (ej. % libre, hit ratio).
 * - 'fijo': dato de configuracion que no refleja salud por si mismo (ej.
 *   tamano de SGA, maximo de procesos); no tiene umbrales ni color.
 */
const COMPONENTES = {
  procesos: {
    titulo: 'Procesos',
    indicador: 'IP',
    campoSecundario: 'descripcion',
    etiquetaSecundaria: 'Descripción',
    variables: [
      {
        id: 'p1', variable: 'Procesos actuales', descripcion: 'Número de procesos Oracle activos', dato: 'p1',
        fuente: 'V$PROCESS / V$RESOURCE_LIMIT', como: 'SQL',
        sentido: 'alto_malo', unidad: 'procesos', limiteAdvertencia: 380, limiteCritico: 460,
        justificacion: 'Se compara contra el máximo configurado para anticipar saturación: si se acerca al límite, Oracle empieza a rechazar nuevas conexiones.',
      },
      {
        id: 'p2', variable: 'Procesos máximos', descripcion: 'Máximo de procesos registrados', dato: 'p2',
        fuente: 'V$RESOURCE_LIMIT', como: 'SQL',
        sentido: 'fijo', unidad: 'procesos',
        justificacion: 'Es el techo configurado de la instancia (parámetro PROCESSES). Sirve de referencia fija para calcular qué tan cerca está el uso real del límite; no cambia con la salud del momento.',
      },
      {
        id: 'p3', variable: 'Sesiones actuales', descripcion: 'Número de sesiones', dato: 'p3',
        fuente: 'V$SESSION', como: 'SQL',
        sentido: 'alto_malo', unidad: 'sesiones', limiteAdvertencia: 240, limiteCritico: 285,
        justificacion: 'Refleja cuántas sesiones tiene abiertas la base en este momento; un crecimiento sostenido sin cierre de sesiones anticipa contención de memoria y de procesos.',
      },
      {
        id: 'p4', variable: 'Sesiones activas', descripcion: 'Sesiones que están ejecutando actividad', dato: 'p4',
        fuente: "V$SESSION (status='ACTIVE')", como: 'SQL',
        sentido: 'alto_malo', unidad: 'sesiones', limiteAdvertencia: 180, limiteCritico: 230,
        justificacion: 'Mide cuántas sesiones ejecutan trabajo en este instante. Muchas sesiones activas simultáneas son la señal más directa de carga real sobre CPU e I/O.',
      },
      {
        id: 'p5', variable: 'Sesiones inactivas', descripcion: 'Sesiones conectadas pero sin actividad', dato: 'p5',
        fuente: "V$SESSION (status='INACTIVE')", como: 'SQL',
        sentido: 'alto_malo', unidad: 'sesiones', limiteAdvertencia: 150, limiteCritico: 220,
        justificacion: 'Sesiones conectadas que no liberan sus recursos (locks, memoria de sesión) aunque no trabajen; acumularse indica conexiones huérfanas del lado de la aplicación.',
      },
      {
        id: 'p6', variable: 'Sesiones bloqueadas', descripcion: 'Sesiones que esperan por otra sesión', dato: 'p6',
        fuente: 'V$SESSION (blocking_session) / V$WAIT_CHAINS', como: 'SQL',
        sentido: 'alto_malo', unidad: 'sesiones', limiteAdvertencia: 2, limiteCritico: 5,
        justificacion: 'Una sesión bloqueada espera a otra. Es la señal más temprana de contención que, si no se resuelve, se propaga en cascada al resto de las sesiones.',
      },
      {
        id: 'p7', variable: 'Operaciones prolongadas', descripcion: 'Operaciones que requieren un tiempo considerable', dato: 'p7',
        fuente: 'V$SESSION_LONGOPS', como: 'SQL',
        sentido: 'alto_malo', unidad: 'operaciones', limiteAdvertencia: 3, limiteCritico: 8,
        justificacion: 'Identifica operaciones que tardan más de lo esperado (backups, reconstrucción de índices, consultas pesadas); su acumulación compite por CPU e I/O con el resto de la carga.',
      },
      {
        id: 'p8', variable: 'Uso de recursos', descripcion: 'Utilización de límites establecidos', dato: 'p8',
        fuente: 'V$RESOURCE_LIMIT', como: 'SQL',
        sentido: 'alto_malo', unidad: '%', limiteAdvertencia: 70, limiteCritico: 90,
        justificacion: 'Resume qué porcentaje del límite de procesos/sesiones ya se consumió: es el indicador más directo de qué tan cerca está la instancia de rechazar conexiones nuevas.',
      },
    ],
  },
  memoria: {
    titulo: 'Memoria',
    indicador: 'IM',
    campoSecundario: 'area',
    etiquetaSecundaria: 'Área',
    variables: [
      {
        id: 'm1', variable: 'Tamaño de SGA', area: 'SGA', dato: 'm1',
        fuente: 'V$SGA / V$SGAINFO', como: 'SQL',
        sentido: 'fijo', unidad: 'GB',
        justificacion: 'Tamaño configurado de la memoria compartida de la instancia. Es un dato de configuración, referencia para interpretar el resto de las métricas de memoria compartida.',
      },
      {
        id: 'm2', variable: 'Memoria libre de SGA', area: 'SGA', dato: 'm2',
        fuente: 'V$SGAINFO ("Free SGA Memory Available")', como: 'SQL',
        sentido: 'alto_bueno', unidad: '%', limiteAdvertencia: 15, limiteCritico: 5,
        justificacion: 'Cuánta memoria de la SGA sigue disponible. Si baja de forma sostenida, Oracle desaloja datos del cache antes de tiempo, aumentando las lecturas a disco.',
      },
      {
        id: 'm3', variable: 'Uso de Shared Pool', area: 'SGA', dato: 'm3',
        fuente: "V$SGASTAT (pool='shared pool')", como: 'SQL',
        sentido: 'alto_malo', unidad: '%', limiteAdvertencia: 70, limiteCritico: 90,
        justificacion: 'El Shared Pool guarda planes de ejecución y metadatos. Si se satura, Oracle reparsea sentencias SQL constantemente, degradando el tiempo de respuesta.',
      },
      {
        id: 'm4', variable: 'Uso de Buffer Cache', area: 'SGA', dato: 'm4',
        fuente: 'V$SGAINFO ("Buffer Cache Size")', como: 'SQL',
        sentido: 'alto_malo', unidad: '%', limiteAdvertencia: 75, limiteCritico: 92,
        justificacion: 'El Buffer Cache evita leer bloques de datos desde disco. Un uso muy alto y sostenido es la primera señal de que la memoria asignada ya no alcanza para la carga actual.',
      },
      {
        id: 'm5', variable: 'PGA asignada', area: 'PGA', dato: 'm5',
        fuente: 'V$PGASTAT ("total PGA allocated")', como: 'SQL',
        sentido: 'fijo', unidad: 'GB',
        justificacion: 'Memoria privada por proceso configurada como objetivo. Es la referencia contra la que se mide si el uso real de PGA se mantiene dentro de lo planeado.',
      },
      {
        id: 'm6', variable: 'PGA utilizada', area: 'PGA', dato: 'm6',
        fuente: 'V$PGASTAT ("total PGA inuse")', como: 'SQL',
        sentido: 'alto_malo', unidad: '%', limiteAdvertencia: 75, limiteCritico: 92,
        justificacion: 'Porcentaje de la PGA objetivo realmente en uso. Cerca del 100%, Oracle recurre a operaciones en disco para ordenamientos y hash joins en vez de memoria.',
      },
      {
        id: 'm7', variable: 'PGA máxima', area: 'PGA', dato: 'm7',
        fuente: 'V$PGASTAT ("maximum PGA allocated")', como: 'SQL',
        sentido: 'alto_malo', unidad: '%', limiteAdvertencia: 85, limiteCritico: 98,
        justificacion: 'Pico histórico de uso de PGA. Revela picos de carga que el promedio esconde, útil para detectar sesiones que consumen memoria de forma desproporcionada.',
      },
      {
        id: 'm8', variable: 'Over-allocation', area: 'PGA', dato: 'm8',
        fuente: 'V$PGASTAT ("total PGA allocated" vs "aggregate PGA target parameter")', como: 'SQL',
        sentido: 'alto_malo', unidad: 'veces/día', limiteAdvertencia: 1, limiteCritico: 3,
        justificacion: 'Cuenta las veces que la PGA superó el objetivo configurado. Cada ocurrencia implica más memoria de la planeada en uso, con riesgo de presión sobre el sistema operativo.',
      },
      {
        id: 'm9', variable: 'Cache hit de PGA', area: 'PGA', dato: 'm9',
        fuente: 'V$PGASTAT ("cache hit percentage")', como: 'SQL',
        sentido: 'alto_bueno', unidad: '%', limiteAdvertencia: 90, limiteCritico: 75,
        justificacion: 'Porcentaje de operaciones de memoria (ordenamientos, joins) resueltas en RAM sin pasar a disco. Un valor bajo dispara operaciones lentas en disco temporal.',
      },
    ],
  },
  archivos: {
    titulo: 'Archivos',
    indicador: 'IA',
    campoSecundario: 'descripcion',
    etiquetaSecundaria: 'Descripción',
    variables: [
      {
        id: 'a1', variable: 'Datafiles online', descripcion: 'Archivos disponibles', dato: 'a1',
        fuente: "V$DATAFILE (status='ONLINE') / V$DATAFILE_HEADER", como: 'SQL',
        sentido: 'fijo', unidad: 'archivos',
        justificacion: 'Cantidad de archivos de datos disponibles para lectura/escritura. Es la referencia base contra la que se detectan archivos que pasaron a offline o con error.',
      },
      {
        id: 'a2', variable: 'Datafiles offline', descripcion: 'Archivos no disponibles', dato: 'a2',
        fuente: "V$DATAFILE (status='OFFLINE')", como: 'SQL',
        sentido: 'alto_malo', unidad: 'archivos', limiteAdvertencia: 1, limiteCritico: 3,
        justificacion: 'Un datafile offline deja inaccesibles los objetos que contiene; cualquier valor mayor a cero es una alerta directa de disponibilidad, no solo de rendimiento.',
      },
      {
        id: 'a3', variable: 'Tamaño de datafiles', descripcion: 'Capacidad utilizada', dato: 'a3',
        fuente: 'V$DATAFILE (bytes) / DBA_DATA_FILES', como: 'SQL',
        sentido: 'alto_malo', unidad: '%', limiteAdvertencia: 80, limiteCritico: 95,
        justificacion: 'Porcentaje de espacio usado dentro de los datafiles. Si se acerca al límite del archivo o del disco, las siguientes escrituras fallan por falta de espacio.',
      },
      {
        id: 'a4', variable: 'Espacio de tablespaces', descripcion: 'Espacio disponible', dato: 'a4',
        fuente: 'DBA_TABLESPACE_USAGE_METRICS / DBA_FREE_SPACE', como: 'SQL',
        sentido: 'alto_bueno', unidad: '%', limiteAdvertencia: 20, limiteCritico: 8,
        justificacion: 'Espacio libre real disponible para nuevos datos. A diferencia del tamaño del datafile, refleja si el tablespace puede seguir creciendo o no.',
      },
      {
        id: 'a5', variable: 'Tempfiles', descripcion: 'Estado y capacidad', dato: 'a5',
        fuente: 'V$TEMPFILE / DBA_TEMP_FILES', como: 'SQL',
        sentido: 'alto_malo', unidad: '%', limiteAdvertencia: 75, limiteCritico: 92,
        justificacion: 'Uso del espacio temporal que usan los ordenamientos y joins que no caben en memoria. Si se agota, las consultas pesadas fallan en vez de solo volverse lentas.',
      },
      {
        id: 'a6', variable: 'Redo logs', descripcion: 'Estado de grupos y miembros', dato: 'a6',
        fuente: 'V$LOG / V$LOGFILE', como: 'SQL',
        sentido: 'alto_malo', unidad: 'logs pendientes', limiteAdvertencia: 2, limiteCritico: 5,
        justificacion: 'Redo logs que Oracle todavía no archivó. Si se acumulan, la instancia puede detener por completo las escrituras hasta liberar espacio de archivado.',
      },
      {
        id: 'a7', variable: 'Archivos inválidos', descripcion: 'Archivos con problemas', dato: 'a7',
        fuente: "V$DATAFILE (status='INVALID' o RECOVER)", como: 'SQL',
        sentido: 'alto_malo', unidad: 'archivos', limiteAdvertencia: 1, limiteCritico: 3,
        justificacion: 'Datafiles marcados con error o en estado de recuperación pendiente. Indican corrupción o una recuperación incompleta que compromete la integridad de los datos.',
      },
      {
        id: 'a8', variable: 'Archivos inaccesibles', descripcion: 'Archivos que no pueden utilizarse', dato: 'a8',
        fuente: 'V$DATAFILE / V$DATAFILE_HEADER (error_status)', como: 'SQL',
        sentido: 'alto_malo', unidad: 'archivos', limiteAdvertencia: 1, limiteCritico: 2,
        justificacion: 'Datafiles que el sistema operativo no puede abrir. Es la falla más severa del componente: los objetos en ese archivo dejan de estar disponibles de inmediato.',
      },
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

/** Umbrales que definen cuando la variable pasa a Amarillo/Rojo (ver estadoVariable.js). */
export function actualizarUmbrales(componenteId, variableId, limiteAdvertencia, limiteCritico) {
  const variable = getVariable(componenteId, variableId);
  if (!variable) return null;
  variable.limiteAdvertencia = limiteAdvertencia;
  variable.limiteCritico = limiteCritico;
  return variable;
}
