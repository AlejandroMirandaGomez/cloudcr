SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Estado "caida" de una base monitoreada (Fase 2).
--
-- Cuando el collector no logra leer una instancia (rechaza conexiones, esta
-- apagada, se quedo sin procesos), avisa al monitor por POST /monitor/estado-caida
-- y la base se marca como caida. El dashboard la muestra como "Caida - sin
-- conexion" en vez de seguir mostrando el ultimo ISBD, que ya es viejo.
--
-- Una ingesta exitosa limpia el flag automaticamente (la base volvio).
-- ===========================================================================

ALTER TABLE Monitor_Bases_Datos
    ADD COLUMN IF NOT EXISTS caida        BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS caida_desde  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS caida_motivo TEXT;

COMMIT;
