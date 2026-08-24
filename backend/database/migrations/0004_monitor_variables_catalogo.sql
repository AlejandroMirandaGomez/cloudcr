SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Catalogo de variables de salud del monitor (Fase 2).
--
-- Es la migracion de frontend/src/modules/monitor/data/variablesMonitor.js a
-- la base de datos: mismos codigos (p1..p8, m1..m9, a1..a8), mismas fuentes
-- Oracle, mismos umbrales y mismos pesos equitativos que ya calculaba
-- distribuirEquitativo() en el frontend (8 variables -> 12.50 c/u,
-- 9 variables -> 11.11 c/u y 11.12 en la ultima para cerrar en 100.00).
--
-- Va separada del DDL igual que Datos_Iniciales.sql lo esta de
-- Modelo_Relacional.sql. El upsert la hace re-aplicable si cambian umbrales.
--
-- En el componente 'memoria' la columna descripcion guarda el area (SGA/PGA),
-- que es lo que el frontend muestra en esa columna para ese componente.
-- ===========================================================================

INSERT INTO Monitor_Variables
    (codigo, componente, orden, variable, descripcion, fuente, unidad, sentido,
     limite_advertencia, limite_critico, peso, justificacion)
VALUES
    ('p1', 'procesos', 1, 'Procesos actuales', 'Número de procesos Oracle activos',
     'V$PROCESS / V$RESOURCE_LIMIT', 'procesos', 'alto_malo', 380, 460, 12.50,
     'Se compara contra el máximo configurado para anticipar saturación: si se acerca al límite, Oracle empieza a rechazar nuevas conexiones.'),

    ('p2', 'procesos', 2, 'Procesos máximos', 'Máximo de procesos registrados',
     'V$RESOURCE_LIMIT', 'procesos', 'fijo', NULL, NULL, 12.50,
     'Es el techo configurado de la instancia (parámetro PROCESSES). Sirve de referencia fija para calcular qué tan cerca está el uso real del límite; no cambia con la salud del momento.'),

    ('p3', 'procesos', 3, 'Sesiones actuales', 'Número de sesiones',
     'V$SESSION', 'sesiones', 'alto_malo', 240, 285, 12.50,
     'Refleja cuántas sesiones tiene abiertas la base en este momento; un crecimiento sostenido sin cierre de sesiones anticipa contención de memoria y de procesos.'),

    ('p4', 'procesos', 4, 'Sesiones activas', 'Sesiones que están ejecutando actividad',
     'V$SESSION (status=''ACTIVE'')', 'sesiones', 'alto_malo', 180, 230, 12.50,
     'Mide cuántas sesiones ejecutan trabajo en este instante. Muchas sesiones activas simultáneas son la señal más directa de carga real sobre CPU e I/O.'),

    ('p5', 'procesos', 5, 'Sesiones inactivas', 'Sesiones conectadas pero sin actividad',
     'V$SESSION (status=''INACTIVE'')', 'sesiones', 'alto_malo', 150, 220, 12.50,
     'Sesiones conectadas que no liberan sus recursos (locks, memoria de sesión) aunque no trabajen; acumularse indica conexiones huérfanas del lado de la aplicación.'),

    ('p6', 'procesos', 6, 'Sesiones bloqueadas', 'Sesiones que esperan por otra sesión',
     'V$SESSION (blocking_session) / V$WAIT_CHAINS', 'sesiones', 'alto_malo', 2, 5, 12.50,
     'Una sesión bloqueada espera a otra. Es la señal más temprana de contención que, si no se resuelve, se propaga en cascada al resto de las sesiones.'),

    ('p7', 'procesos', 7, 'Operaciones prolongadas', 'Operaciones que requieren un tiempo considerable',
     'V$SESSION_LONGOPS', 'operaciones', 'alto_malo', 3, 8, 12.50,
     'Identifica operaciones que tardan más de lo esperado (backups, reconstrucción de índices, consultas pesadas); su acumulación compite por CPU e I/O con el resto de la carga.'),

    ('p8', 'procesos', 8, 'Uso de recursos', 'Utilización de límites establecidos',
     'V$RESOURCE_LIMIT', '%', 'alto_malo', 70, 90, 12.50,
     'Resume qué porcentaje del límite de procesos/sesiones ya se consumió: es el indicador más directo de qué tan cerca está la instancia de rechazar conexiones nuevas.'),

    ('m1', 'memoria', 1, 'Tamaño de SGA', 'SGA',
     'V$SGA / V$SGAINFO', 'GB', 'fijo', NULL, NULL, 11.11,
     'Tamaño configurado de la memoria compartida de la instancia. Es un dato de configuración, referencia para interpretar el resto de las métricas de memoria compartida.'),

    ('m2', 'memoria', 2, 'Memoria libre de SGA', 'SGA',
     'V$SGAINFO ("Free SGA Memory Available")', '%', 'alto_bueno', 15, 5, 11.11,
     'Cuánta memoria de la SGA sigue disponible. Si baja de forma sostenida, Oracle desaloja datos del cache antes de tiempo, aumentando las lecturas a disco.'),

    ('m3', 'memoria', 3, 'Uso de Shared Pool', 'SGA',
     'V$SGASTAT (pool=''shared pool'')', '%', 'alto_malo', 70, 90, 11.11,
     'El Shared Pool guarda planes de ejecución y metadatos. Si se satura, Oracle reparsea sentencias SQL constantemente, degradando el tiempo de respuesta.'),

    ('m4', 'memoria', 4, 'Uso de Buffer Cache', 'SGA',
     'V$SGAINFO ("Buffer Cache Size")', '%', 'alto_malo', 75, 92, 11.11,
     'El Buffer Cache evita leer bloques de datos desde disco. Un uso muy alto y sostenido es la primera señal de que la memoria asignada ya no alcanza para la carga actual.'),

    ('m5', 'memoria', 5, 'PGA asignada', 'PGA',
     'V$PGASTAT ("total PGA allocated")', 'GB', 'fijo', NULL, NULL, 11.11,
     'Memoria privada por proceso configurada como objetivo. Es la referencia contra la que se mide si el uso real de PGA se mantiene dentro de lo planeado.'),

    ('m6', 'memoria', 6, 'PGA utilizada', 'PGA',
     'V$PGASTAT ("total PGA inuse")', '%', 'alto_malo', 75, 92, 11.11,
     'Porcentaje de la PGA objetivo realmente en uso. Cerca del 100%, Oracle recurre a operaciones en disco para ordenamientos y hash joins en vez de memoria.'),

    ('m7', 'memoria', 7, 'PGA máxima', 'PGA',
     'V$PGASTAT ("maximum PGA allocated")', '%', 'alto_malo', 85, 98, 11.11,
     'Pico histórico de uso de PGA. Revela picos de carga que el promedio esconde, útil para detectar sesiones que consumen memoria de forma desproporcionada.'),

    ('m8', 'memoria', 8, 'Over-allocation', 'PGA',
     'V$PGASTAT (allocated vs aggregate PGA target)', 'veces/día', 'alto_malo', 1, 3, 11.11,
     'Cuenta las veces que la PGA superó el objetivo configurado. Cada ocurrencia implica más memoria de la planeada en uso, con riesgo de presión sobre el sistema operativo.'),

    ('m9', 'memoria', 9, 'Cache hit de PGA', 'PGA',
     'V$PGASTAT ("cache hit percentage")', '%', 'alto_bueno', 90, 75, 11.12,
     'Porcentaje de operaciones de memoria (ordenamientos, joins) resueltas en RAM sin pasar a disco. Un valor bajo dispara operaciones lentas en disco temporal.'),

    ('a1', 'archivos', 1, 'Datafiles online', 'Archivos disponibles',
     'V$DATAFILE (status=''ONLINE'') / V$DATAFILE_HEADER', 'archivos', 'fijo', NULL, NULL, 12.50,
     'Cantidad de archivos de datos disponibles para lectura/escritura. Es la referencia base contra la que se detectan archivos que pasaron a offline o con error.'),

    ('a2', 'archivos', 2, 'Datafiles offline', 'Archivos no disponibles',
     'V$DATAFILE (status=''OFFLINE'')', 'archivos', 'alto_malo', 1, 3, 12.50,
     'Un datafile offline deja inaccesibles los objetos que contiene; cualquier valor mayor a cero es una alerta directa de disponibilidad, no solo de rendimiento.'),

    ('a3', 'archivos', 3, 'Tamaño de datafiles', 'Capacidad utilizada',
     'V$DATAFILE (bytes) / DBA_DATA_FILES', '%', 'alto_malo', 80, 95, 12.50,
     'Porcentaje de espacio usado dentro de los datafiles. Si se acerca al límite del archivo o del disco, las siguientes escrituras fallan por falta de espacio.'),

    ('a4', 'archivos', 4, 'Espacio de tablespaces', 'Espacio disponible',
     'DBA_TABLESPACE_USAGE_METRICS / DBA_FREE_SPACE', '%', 'alto_bueno', 20, 8, 12.50,
     'Espacio libre real disponible para nuevos datos. A diferencia del tamaño del datafile, refleja si el tablespace puede seguir creciendo o no.'),

    ('a5', 'archivos', 5, 'Tempfiles', 'Estado y capacidad',
     'V$TEMPFILE / DBA_TEMP_FILES', '%', 'alto_malo', 75, 92, 12.50,
     'Uso del espacio temporal que usan los ordenamientos y joins que no caben en memoria. Si se agota, las consultas pesadas fallan en vez de solo volverse lentas.'),

    ('a6', 'archivos', 6, 'Redo logs', 'Estado de grupos y miembros',
     'V$LOG / V$LOGFILE', 'logs pendientes', 'alto_malo', 2, 5, 12.50,
     'Redo logs que Oracle todavía no archivó. Si se acumulan, la instancia puede detener por completo las escrituras hasta liberar espacio de archivado.'),

    ('a7', 'archivos', 7, 'Archivos inválidos', 'Archivos con problemas',
     'V$DATAFILE (status=''INVALID'' o RECOVER)', 'archivos', 'alto_malo', 1, 3, 12.50,
     'Datafiles marcados con error o en estado de recuperación pendiente. Indican corrupción o una recuperación incompleta que compromete la integridad de los datos.'),

    ('a8', 'archivos', 8, 'Archivos inaccesibles', 'Archivos que no pueden utilizarse',
     'V$DATAFILE / V$DATAFILE_HEADER (error_status)', 'archivos', 'alto_malo', 1, 2, 12.50,
     'Datafiles que el sistema operativo no puede abrir. Es la falla más severa del componente: los objetos en ese archivo dejan de estar disponibles de inmediato.')

ON CONFLICT (codigo) DO UPDATE SET
    componente         = EXCLUDED.componente,
    orden              = EXCLUDED.orden,
    variable           = EXCLUDED.variable,
    descripcion        = EXCLUDED.descripcion,
    fuente             = EXCLUDED.fuente,
    unidad             = EXCLUDED.unidad,
    sentido            = EXCLUDED.sentido,
    limite_advertencia = EXCLUDED.limite_advertencia,
    limite_critico     = EXCLUDED.limite_critico,
    peso               = EXCLUDED.peso,
    justificacion      = EXCLUDED.justificacion;

COMMIT;
