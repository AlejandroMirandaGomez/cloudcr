SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Recalibracion de m2 (Memoria libre de SGA) contra Oracle XE 21c real.
--
-- Mismo caso que m4 en la migracion 0005: el umbral venia de los datos
-- simulados. En una instancia XE con la SGA ya repartida en granulos, la
-- memoria libre de los pools se estabiliza cerca del 6 %, muy por debajo del
-- umbral de advertencia original (15 %). Resultado: m2 quedaba en amarillo de
-- forma permanente.
--
-- Con la penalizacion por critico activa (ver CalculadoraSalud::PENALIZAR_CRITICO),
-- una sola variable en amarillo topa su componente en amarillo y el ISBD con
-- el, asi que ese falso positivo dejaba la instancia sana mostrandose en
-- amarillo en reposo. Se bajan los umbrales al rango donde un descenso de la
-- memoria libre si es sintoma real (presion sobre los pools de la SGA).
-- ===========================================================================

UPDATE Monitor_Variables
SET limite_advertencia = 4,
    limite_critico     = 2
WHERE codigo = 'm2';

COMMIT;
