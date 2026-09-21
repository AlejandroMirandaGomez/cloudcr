SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Proceso padre de cada variable del monitor (Fase 2).
--
-- Cada variable se asocia al proceso de fondo de Oracle que administra el
-- recurso que mide, para que la tabla de detalle de cada componente muestre a
-- que proceso pertenece (columna "Proceso Padre"):
--
--   PMON  Process Monitor Process   limpia procesos/sesiones caidos y sus
--                                   recursos; dueño del conteo de procesos
--                                   y sesiones de la instancia.
--   Server Process                  procesos servidor (foreground) que
--                                   ejecutan el trabajo de cada sesion; dueños
--                                   de la PGA y de las operaciones largas.
--   MMAN  Memory Manager Process    reparte la memoria entre los componentes
--                                   de la SGA y el objetivo de PGA.
--   DBWn  Database Writer Process   escribe los bloques del buffer cache a
--                                   los datafiles.
--   LGWR  Log Writer Process        escribe el redo log.
--   CKPT  Checkpoint Process        actualiza cabeceras de datafiles.
--   SMON  System Monitor Process    recuperacion de instancia, limpieza de
--                                   segmentos temporales y espacio libre de
--                                   tablespaces.
-- ===========================================================================

ALTER TABLE Monitor_Variables
    ADD COLUMN IF NOT EXISTS proceso_padre VARCHAR(60);

UPDATE Monitor_Variables SET proceso_padre = v.proceso_padre
FROM (VALUES
    ('p1', 'Process Monitor Process (PMON)'),
    ('p2', 'Process Monitor Process (PMON)'),
    ('p3', 'Process Monitor Process (PMON)'),
    ('p4', 'Server Process'),
    ('p5', 'Process Monitor Process (PMON)'),
    ('p6', 'Process Monitor Process (PMON)'),
    ('p7', 'Server Process'),
    ('p8', 'Process Monitor Process (PMON)'),

    ('m1', 'Memory Manager Process (MMAN)'),
    ('m2', 'Memory Manager Process (MMAN)'),
    ('m3', 'Memory Manager Process (MMAN)'),
    ('m4', 'Database Writer Process (DBWn)'),
    ('m5', 'Memory Manager Process (MMAN)'),
    ('m6', 'Server Process'),
    ('m7', 'Server Process'),
    ('m8', 'Server Process'),
    ('m9', 'Server Process'),

    ('a1', 'Database Writer Process (DBWn)'),
    ('a2', 'Database Writer Process (DBWn)'),
    ('a3', 'Database Writer Process (DBWn)'),
    ('a4', 'System Monitor Process (SMON)'),
    ('a5', 'System Monitor Process (SMON)'),
    ('a6', 'Log Writer Process (LGWR)'),
    ('a7', 'System Monitor Process (SMON)'),
    ('a8', 'Checkpoint Process (CKPT)')
) AS v(codigo, proceso_padre)
WHERE Monitor_Variables.codigo = v.codigo;

ALTER TABLE Monitor_Variables
    ALTER COLUMN proceso_padre SET NOT NULL;

COMMIT;
