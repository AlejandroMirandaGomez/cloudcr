SET client_encoding TO 'UTF8';

BEGIN;

-- ===========================================================================
-- Recalibracion de umbrales contra una instancia Oracle real (XE 21c).
--
-- Los umbrales originales de 0004 venian de los datos simulados del frontend,
-- que nunca se contrastaron contra Oracle. Al conectar el collector aparecio
-- que m4 marca critico de forma permanente sin que haya ningun problema.
--
-- m4 "Uso de Buffer Cache": Oracle mantiene los bloques en cache a proposito y
-- solo libera buffers cuando los necesita. En una instancia con trabajo real la
-- ocupacion se estabiliza cerca del 100% (medido: 99.91% en XE recien
-- arrancada). Con los umbrales 75/92 la variable quedaba en rojo siempre,
-- ensuciando el panel de alertas y hundiendo IM sin motivo.
--
-- Se suben los umbrales al rango donde la saturacion si es sintoma: cuando
-- practicamente no queda ningun buffer libre para reemplazo.
--
-- Alternativa mejor para una version futura, anotada en backend/docs/Gaps.md:
-- reemplazar la ocupacion por el miss ratio del buffer cache
-- (physical reads cache / logical reads), que en la misma instancia dio 3.41%
-- y si es un indicador directo de presion de memoria.
-- ===========================================================================

UPDATE Monitor_Variables
SET limite_advertencia = 99.50,
    limite_critico     = 99.95,
    justificacion      = 'El Buffer Cache evita leer bloques de datos desde disco y Oracle lo mantiene lleno a proposito, '
                      || 'por lo que una ocupacion alta es lo normal. Solo cuando practicamente no queda ningun buffer '
                      || 'libre para reemplazo hay presion real de memoria; de ahi que los umbrales esten tan arriba.'
WHERE codigo = 'm4';

COMMIT;
