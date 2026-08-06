-- Migracion: justificacion obligatoria al responder 'N/A'.
--
-- Aplicar sobre una base ya creada con Modelo_Relacional.sql en su version
-- anterior. Si la base se crea desde cero, el modelo ya trae la columna y el
-- CHECK, y este script no hace falta.
--
--   psql -U postgres -d cloud_cr -f database/Migracion_Justificacion_No_Aplica.sql

SET client_encoding TO 'UTF8';

BEGIN;

ALTER TABLE Respuestas
    ADD COLUMN IF NOT EXISTS justificacion_no_aplica TEXT;

-- Las respuestas 'N/A' registradas antes de esta migracion no tienen texto:
-- se marcan para que el evaluador las complete, sin perder el historial.
UPDATE Respuestas
   SET justificacion_no_aplica = 'Sin justificación registrada (respuesta anterior a la migración).'
 WHERE cumple = 'N/A'
   AND (justificacion_no_aplica IS NULL OR btrim(justificacion_no_aplica) = '');

UPDATE Respuestas
   SET justificacion_no_aplica = NULL
 WHERE cumple <> 'N/A'
   AND justificacion_no_aplica IS NOT NULL;

ALTER TABLE Respuestas
    DROP CONSTRAINT IF EXISTS respuestas_justificacion_no_aplica_check;

ALTER TABLE Respuestas
    ADD CONSTRAINT respuestas_justificacion_no_aplica_check CHECK (
        (cumple = 'N/A' AND justificacion_no_aplica IS NOT NULL AND btrim(justificacion_no_aplica) <> '')
        OR (cumple <> 'N/A' AND justificacion_no_aplica IS NULL)
    );

COMMIT;
