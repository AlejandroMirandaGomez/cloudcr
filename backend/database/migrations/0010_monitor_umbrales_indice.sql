SET client_encoding TO 'UTF8';

BEGIN;

DO $$ BEGIN
    CREATE TYPE monitor_indice AS ENUM ('isbd', 'ip', 'im', 'ia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS Monitor_Umbrales_Indice (
    id SERIAL PRIMARY KEY,
    base_datos_id INT NOT NULL REFERENCES Monitor_Bases_Datos(id) ON DELETE CASCADE,
    indice monitor_indice NOT NULL,
    umbral_verde NUMERIC(5,2) NOT NULL,
    umbral_rojo NUMERIC(5,2) NOT NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (base_datos_id, indice),
    CHECK (umbral_verde BETWEEN 0 AND 100),
    CHECK (umbral_rojo BETWEEN 0 AND 100),
    CHECK (umbral_rojo < umbral_verde)
);

CREATE INDEX IF NOT EXISTS idx_monitor_umbrales_indice_base
    ON Monitor_Umbrales_Indice (base_datos_id);

COMMIT;
