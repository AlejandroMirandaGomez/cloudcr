SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Variables acumulativas que NO deben penalizar el indice en vivo (Fase 2).
--
-- Algunas variables de Oracle son marcas de agua o contadores desde el arranque
-- de la instancia: solo suben y no bajan hasta reiniciar. Como senal de salud
-- EN VIVO son enganosas: un pico transitorio de hace horas las deja "en rojo"
-- para siempre, y con la penalizacion por critico eso clavaba el ISBD sin que
-- pase nada ahora mismo.
--
--   m7  maximum PGA allocated  -> pico historico de PGA (nunca baja)
--   m8  over allocation count  -> contador acumulado (nunca baja)
--
-- Con penaliza = FALSE la variable sigue mostrandose con su color y aporta a la
-- media del componente, pero NO topa el indice ni genera una alerta permanente.
-- ===========================================================================

ALTER TABLE Monitor_Variables
    ADD COLUMN IF NOT EXISTS penaliza BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE Monitor_Variables SET penaliza = FALSE WHERE codigo IN ('m7', 'm8');

COMMIT;
