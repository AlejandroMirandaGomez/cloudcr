SET client_encoding TO 'UTF8';

BEGIN;

CREATE TABLE IF NOT EXISTS Monitor_Ajustes_Variable (
    id SERIAL PRIMARY KEY,
    base_datos_id INT NOT NULL REFERENCES Monitor_Bases_Datos(id) ON DELETE CASCADE,
    variable_codigo VARCHAR(5) NOT NULL REFERENCES Monitor_Variables(codigo) ON DELETE CASCADE,
    limite_advertencia NUMERIC(14,2),
    limite_critico NUMERIC(14,2),
    peso NUMERIC(6,2) NOT NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (base_datos_id, variable_codigo),
    CHECK (peso > 0 AND peso <= 100),
    CHECK (
        (limite_advertencia IS NULL AND limite_critico IS NULL)
        OR (limite_advertencia IS NOT NULL AND limite_critico IS NOT NULL
            AND limite_advertencia <> limite_critico)
    )
);

CREATE INDEX IF NOT EXISTS idx_monitor_ajustes_base
    ON Monitor_Ajustes_Variable (base_datos_id);

COMMIT;
