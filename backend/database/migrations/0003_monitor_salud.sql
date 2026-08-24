SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Fase 2 - Monitor de Salud de Base de Datos.
--
-- Reemplaza las fixtures que vivian en MonitorRepository.php (arreglo PERFILES)
-- y en frontend/src/modules/monitor/data/variablesMonitor.js por tablas reales.
-- El collector local (collector/) empuja las mediciones a POST /monitor/ingesta
-- y el backend calcula aqui los indicadores IP/IM/IA y el ISBD.
--
-- Nota sobre el diseno: claude.md proponia una tabla por componente
-- (Monitor_Procesos, Monitor_Memoria, Monitor_Archivos). Se normalizo en
-- Monitor_Variables + Monitor_Mediciones porque las tres tendrian exactamente
-- las mismas columnas y porque asi se pueden agregar variables nuevas sin DDL.
-- ===========================================================================

DO $$ BEGIN
    CREATE TYPE monitor_componente AS ENUM ('procesos', 'memoria', 'archivos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    -- Como leer el valor contra sus umbrales:
    --   alto_malo  : mientras mas alto, peor (ej. % de uso, sesiones bloqueadas)
    --   alto_bueno : mientras mas alto, mejor (ej. % libre, cache hit)
    --   fijo       : dato de configuracion, no refleja salud (ej. tamano de SGA)
    CREATE TYPE monitor_sentido AS ENUM ('alto_malo', 'alto_bueno', 'fijo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE monitor_severidad AS ENUM ('advertencia', 'critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Instancias monitoreadas. El collector las registra por nombre (upsert) la
-- primera vez que empuja un snapshot, asi que no se siembran filas aqui.
CREATE TABLE IF NOT EXISTS Monitor_Bases_Datos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    motor VARCHAR(30) NOT NULL DEFAULT 'Oracle',
    host VARCHAR(150),
    puerto INT,
    servicio VARCHAR(100),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (puerto IS NULL OR puerto BETWEEN 1 AND 65535)
);

-- Catalogo de las variables de salud (p1..p8, m1..m9, a1..a8) con sus umbrales
-- y su peso dentro del componente. Es la unica fuente de verdad: el backend
-- calcula con ella y el frontend la consume por GET /monitor/variables.
CREATE TABLE IF NOT EXISTS Monitor_Variables (
    codigo VARCHAR(5) PRIMARY KEY,
    componente monitor_componente NOT NULL,
    orden SMALLINT NOT NULL,
    variable VARCHAR(80) NOT NULL,
    descripcion VARCHAR(250) NOT NULL,
    fuente VARCHAR(150) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    sentido monitor_sentido NOT NULL,
    limite_advertencia NUMERIC(12,2),
    limite_critico NUMERIC(12,2),
    peso NUMERIC(5,2) NOT NULL,
    justificacion TEXT NOT NULL,
    UNIQUE (componente, orden),
    CHECK (peso > 0 AND peso <= 100),
    -- Una variable 'fijo' no tiene umbrales; el resto los exige ambos.
    CHECK ((sentido = 'fijo') = (limite_advertencia IS NULL)),
    CHECK ((sentido = 'fijo') = (limite_critico IS NULL))
);

-- Un snapshot por ciclo del collector, con los indicadores ya calculados.
CREATE TABLE IF NOT EXISTS Monitor_Snapshots (
    id BIGSERIAL PRIMARY KEY,
    base_datos_id INT NOT NULL,
    capturado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip NUMERIC(5,2) NOT NULL,
    im NUMERIC(5,2) NOT NULL,
    ia NUMERIC(5,2) NOT NULL,
    isbd NUMERIC(5,2) NOT NULL,
    peso_procesos NUMERIC(4,3) NOT NULL,
    peso_memoria NUMERIC(4,3) NOT NULL,
    peso_archivos NUMERIC(4,3) NOT NULL,
    FOREIGN KEY (base_datos_id) REFERENCES Monitor_Bases_Datos(id) ON DELETE CASCADE,
    CHECK (ip BETWEEN 0 AND 100),
    CHECK (im BETWEEN 0 AND 100),
    CHECK (ia BETWEEN 0 AND 100),
    CHECK (isbd BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_base_fecha
    ON Monitor_Snapshots (base_datos_id, capturado_en DESC);

-- Valor crudo de cada variable en ese snapshot, tal como lo leyo el collector.
CREATE TABLE IF NOT EXISTS Monitor_Mediciones (
    snapshot_id BIGINT NOT NULL,
    variable_codigo VARCHAR(5) NOT NULL,
    valor NUMERIC(14,2) NOT NULL,
    PRIMARY KEY (snapshot_id, variable_codigo),
    FOREIGN KEY (snapshot_id) REFERENCES Monitor_Snapshots(id) ON DELETE CASCADE,
    FOREIGN KEY (variable_codigo) REFERENCES Monitor_Variables(codigo)
);

-- Alertas por componente. Regla del documento del profesor: una alerta critica
-- individual no debe quedar oculta por un ISBD ponderado alto, por eso se
-- guardan aparte del indice y se muestran ambas cosas.
CREATE TABLE IF NOT EXISTS Monitor_Alertas (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id BIGINT NOT NULL,
    componente monitor_componente NOT NULL,
    variable_codigo VARCHAR(5),
    severidad monitor_severidad NOT NULL,
    mensaje TEXT NOT NULL,
    generada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (snapshot_id) REFERENCES Monitor_Snapshots(id) ON DELETE CASCADE,
    FOREIGN KEY (variable_codigo) REFERENCES Monitor_Variables(codigo)
);

CREATE INDEX IF NOT EXISTS idx_monitor_alertas_snapshot
    ON Monitor_Alertas (snapshot_id);

COMMIT;
