<?php

declare(strict_types=1);

namespace CloudCR\Monitor;

/**
 * Fase 2 - Rubrica para derivar el peso de cada variable dentro de su
 * componente. Calculo puro: no toca la base de datos.
 *
 * Cuatro preguntas cerradas por variable, escala 1-4 sin punto medio:
 *
 *   impacto          si la variable llega a critico, que pasa con la operacion
 *   probabilidad     con que frecuencia se acerca a sus umbrales en esta base
 *   tiempo_reaccion  cuanto margen hay antes de que afecte a los usuarios
 *   cobertura        si existe otro control o alerta que ya cubra ese riesgo
 *
 *   puntaje = impacto * probabilidad + tiempo_reaccion + cobertura   (3..24)
 *
 * Impacto y probabilidad se multiplican (matriz de riesgo clasica, la misma
 * logica de la evaluacion de riesgo de la Fase 1); tiempo de reaccion y
 * cobertura solo suman, como ajustes. El peso sugerido de cada variable es su
 * puntaje sobre la suma de puntajes del componente. Una variable sin
 * responder entra con PUNTAJE_NEUTRO (todo en 2) para no dejar el componente
 * sin sugerencia, y el resultado avisa que la rubrica esta incompleta.
 */
final class RubricaPeso
{
    public const PREGUNTAS = ['impacto', 'probabilidad', 'tiempo_reaccion', 'cobertura'];

    public const RESPUESTA_MINIMA = 1;
    public const RESPUESTA_MAXIMA = 4;

    /** Puntaje de una variable con todas sus respuestas en 2. */
    public const PUNTAJE_NEUTRO = 8;

    public const PUNTAJE_MINIMO = 3;
    public const PUNTAJE_MAXIMO = 24;

    /**
     * @param array<string,int> $respuestas indexado por pregunta, valores 1..4
     */
    public static function puntaje(array $respuestas): int
    {
        return $respuestas['impacto'] * $respuestas['probabilidad']
            + $respuestas['tiempo_reaccion']
            + $respuestas['cobertura'];
    }

    /**
     * Reparte 100 entre las variables en proporcion a su puntaje, a dos
     * decimales. El residuo del redondeo se carga a la ultima variable para
     * que la suma cierre exacta en 100.00, igual que hace el frontend al
     * distribuir equitativo.
     *
     * @param array<string,int> $puntajes indexado por codigo de variable
     * @return array<string,float>
     */
    public static function pesosSugeridos(array $puntajes): array
    {
        if ($puntajes === []) {
            return [];
        }

        $total = array_sum($puntajes);
        $pesos = [];
        $suma  = 0.0;

        foreach ($puntajes as $codigo => $puntaje) {
            $peso           = floor($puntaje / $total * 100 * 100) / 100;
            $pesos[$codigo] = $peso;
            $suma          += $peso;
        }

        $ultimo          = array_key_last($pesos);
        $pesos[$ultimo]  = round($pesos[$ultimo] + (100.0 - $suma), 2);

        return $pesos;
    }
}
