SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Rubrica para determinar el peso de cada variable (Fase 2).
--
-- El peso de una variable dentro de su componente depende de la empresa: no
-- pesa igual "sesiones activas" en un comercio en linea que en un almacen de
-- datos que corre de noche. En vez de pedirle al cliente un porcentaje a ojo,
-- se le hacen cuatro preguntas cerradas por variable (escala 1-4, sin punto
-- medio) y el peso se deriva del riesgo relativo, con la misma logica de
-- impacto x probabilidad que usa la evaluacion de riesgo de la Fase 1:
--
--   impacto          Si la variable llega a critico, que pasa con la operacion
--                    1 nada perceptible / 2 lentitud tolerable /
--                    3 interrupcion parcial / 4 caida total
--   probabilidad     Con que frecuencia se acerca a sus umbrales en esta base
--                    1 nunca / 2 mensual / 3 semanal / 4 diario o constante
--   tiempo_reaccion  Cuando se degrada, cuanto margen hay antes de afectar
--                    1 horas o mas / 2 una hora / 3 minutos / 4 inmediato
--   cobertura        Existe otro control o alerta que ya cubra ese riesgo
--                    1 si, automatizado / 2 si, manual / 3 parcial / 4 ninguno
--
--   puntaje = impacto * probabilidad + tiempo_reaccion + cobertura   (3..24)
--   peso sugerido = puntaje / suma de puntajes del componente * 100
--
-- El calculo vive en app/Monitor/RubricaPeso.php. Las respuestas se guardan
-- por base y variable; al "aplicar" se escribe el peso resultante en
-- Monitor_Ajustes_Variable, que es lo que ya lee el calculo del indice.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS Monitor_Rubrica_Peso (
    id SERIAL PRIMARY KEY,
    base_datos_id INT NOT NULL REFERENCES Monitor_Bases_Datos(id) ON DELETE CASCADE,
    variable_codigo VARCHAR(5) NOT NULL REFERENCES Monitor_Variables(codigo) ON DELETE CASCADE,
    impacto SMALLINT NOT NULL,
    probabilidad SMALLINT NOT NULL,
    tiempo_reaccion SMALLINT NOT NULL,
    cobertura SMALLINT NOT NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (base_datos_id, variable_codigo),
    CHECK (impacto BETWEEN 1 AND 4),
    CHECK (probabilidad BETWEEN 1 AND 4),
    CHECK (tiempo_reaccion BETWEEN 1 AND 4),
    CHECK (cobertura BETWEEN 1 AND 4)
);

CREATE INDEX IF NOT EXISTS idx_monitor_rubrica_peso_base
    ON Monitor_Rubrica_Peso (base_datos_id);

COMMIT;
