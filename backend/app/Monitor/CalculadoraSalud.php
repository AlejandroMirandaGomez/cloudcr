<?php

declare(strict_types=1);

namespace CloudCR\Monitor;

/**
 * Fase 2 - Calculo puro de los indicadores de salud. No toca la base de datos:
 * recibe las definiciones de variables (Monitor_Variables) y los valores
 * medidos por el collector, y devuelve puntajes, indices, estados y alertas.
 *
 * Formula del documento del profesor:
 *
 *     ISBD = Wp*IP + Wm*IM + Wa*IA      (pesos 30% / 35% / 35%)
 *
 * Cada componente (IP/IM/IA) es el promedio ponderado de los puntajes 0-100 de
 * sus variables. El puntaje traduce el valor crudo a la misma escala del
 * semaforo, de modo que un componente con todas sus variables en verde cae en
 * la banda verde del indice, y lo mismo para amarillo y rojo:
 *
 *     zona verde    -> 100..75
 *     zona amarilla ->  75..60
 *     zona roja     ->  60..0
 *
 * Las variables de sentido 'fijo' (tamano de SGA, maximo de procesos) son datos
 * de configuracion: no puntuan ni generan alertas, y su peso se reparte entre
 * las variables del mismo componente que si miden salud.
 */
final class CalculadoraSalud
{
    /** Pesos por componente propuestos por el documento del profesor. */
    public const PESOS_COMPONENTES = [
        'procesos' => 0.30,
        'memoria'  => 0.35,
        'archivos' => 0.35,
    ];

    public const COMPONENTES = ['procesos', 'memoria', 'archivos'];

    /** Indicador que el frontend muestra por componente. */
    public const INDICADORES = ['procesos' => 'IP', 'memoria' => 'IM', 'archivos' => 'IA'];

    private const PUNTAJE_VERDE_MINIMO    = 75.0;
    private const PUNTAJE_AMARILLO_MINIMO = 60.0;

    /**
     * Penalizacion por variable/componente critico.
     *
     * Sin esto, el indice de un componente es el promedio ponderado de sus 8
     * variables, y una sola en rojo apenas lo mueve (7 verdes lo suben de
     * vuelta): el ISBD termina escondiendo las criticas, justo lo que el
     * documento del profesor pide evitar. Con la penalizacion activa, el indice
     * NO puede quedar en una banda mejor que la de su peor componente: una
     * variable roja topa su componente en rojo, y un componente rojo topa el
     * ISBD en rojo. Asi una critica individual se propaga hasta el indice
     * global en vez de diluirse.
     *
     * Se deja como interruptor para poder mostrar el antes/despues y explicar
     * la decision en el informe.
     */
    private const PENALIZAR_CRITICO = true;

    /**
     * Techos de la penalizacion:
     * - Amarillo: el indice no supera el tope de la banda amarilla.
     * - Rojo: el indice baja hasta el puntaje de la PEOR variable/componente
     *   (weakest-link), no a un tope fijo. Asi una critica leve deja el indice
     *   apenas en rojo y una critica profunda lo hunde de verdad, en vez de
     *   quedarse siempre pegado al borde superior del rojo.
     */
    private const TECHO_AMARILLO = 74.99;

    /**
     * Color del semaforo de una variable comparando el valor crudo contra sus
     * umbrales. Mismo criterio que estadoVariable.js en el frontend.
     * Devuelve null para las variables 'fijo', que no tienen estado.
     *
     * @param array{sentido:string,limite_advertencia:?float,limite_critico:?float} $variable
     */
    public static function colorDeVariable(array $variable, float $valor): ?string
    {
        if ($variable['sentido'] === 'fijo') {
            return null;
        }

        $advertencia = (float) $variable['limite_advertencia'];
        $critico     = (float) $variable['limite_critico'];

        if ($variable['sentido'] === 'alto_malo') {
            return match (true) {
                $valor >= $critico     => 'rojo',
                $valor >= $advertencia => 'amarillo',
                default                => 'verde',
            };
        }

        // alto_bueno: mientras mas alto mejor, asi que los umbrales van al reves.
        return match (true) {
            $valor <= $critico     => 'rojo',
            $valor <= $advertencia => 'amarillo',
            default                => 'verde',
        };
    }

    /**
     * Puntaje 0-100 de una variable. Interpola linealmente dentro de la banda
     * de color que le corresponde, para que el indice distinga entre "apenas
     * entro en amarillo" y "casi rojo". Null para las variables 'fijo'.
     *
     * @param array{sentido:string,limite_advertencia:?float,limite_critico:?float} $variable
     */
    public static function puntajeDeVariable(array $variable, float $valor): ?float
    {
        $color = self::colorDeVariable($variable, $valor);
        if ($color === null) {
            return null;
        }

        $advertencia = (float) $variable['limite_advertencia'];
        $critico     = (float) $variable['limite_critico'];
        $altoMalo    = $variable['sentido'] === 'alto_malo';

        // Fraccion 0..1 de avance dentro de la banda, siempre en direccion
        // "hacia peor", sin importar el sentido de la variable.
        $avance = match ($color) {
            'verde' => $altoMalo
                // 0 -> limite de advertencia
                ? self::fraccion($valor, 0.0, $advertencia)
                // Referencia "comodamente sano" -> limite de advertencia. Se toma
                // el doble del umbral (topado en 100 para los porcentajes) porque
                // el maximo real depende de la variable: 100% de SGA libre no es
                // alcanzable, pero 30% con umbral en 15% si es holgado.
                : self::fraccion($valor, self::referenciaSana($advertencia), $advertencia),

            'amarillo' => self::fraccion($valor, $advertencia, $critico),

            // Rojo: se llega a 0 cuando el valor supera el umbral critico en un
            // 50% (alto_malo) o cae a 0 (alto_bueno). Sin esa referencia el
            // puntaje nunca tocaria el fondo de la escala.
            default => $altoMalo
                ? self::fraccion($valor, $critico, $critico + max(abs($critico) * 0.5, 1.0))
                : self::fraccion($valor, $critico, 0.0),
        };

        return match ($color) {
            'verde'    => self::redondear(100.0 - (100.0 - self::PUNTAJE_VERDE_MINIMO) * $avance),
            'amarillo' => self::redondear(
                self::PUNTAJE_VERDE_MINIMO
                - (self::PUNTAJE_VERDE_MINIMO - self::PUNTAJE_AMARILLO_MINIMO) * $avance
            ),
            default    => self::redondear(self::PUNTAJE_AMARILLO_MINIMO * (1.0 - $avance)),
        };
    }

    /**
     * Indice 0-100 de un componente: promedio de los puntajes ponderado por el
     * peso de cada variable. Los pesos se renormalizan sobre las variables
     * realmente puntuadas, asi que no hace falta que el collector envie las 25
     * ni que los pesos del catalogo sumen exactamente 100.
     *
     * Las variables con penaliza=false (marcas de agua / contadores
     * acumulativos como m7 y m8) aportan a la media pero NO cuentan para el
     * techo: un pico historico no debe hundir el indice en vivo.
     *
     * @param list<array{peso:float,puntaje:?float,penaliza?:bool}> $variables
     */
    public static function indiceComponente(array $variables): ?float
    {
        $sumaPesos    = 0.0;
        $sumaPuntajes = 0.0;
        $peor         = 100.0;

        foreach ($variables as $v) {
            if ($v['puntaje'] === null || $v['peso'] <= 0) {
                continue;
            }
            $sumaPesos    += $v['peso'];
            $sumaPuntajes += $v['peso'] * $v['puntaje'];
            if ($v['penaliza'] ?? true) {
                $peor = min($peor, $v['puntaje']);
            }
        }

        if ($sumaPesos <= 0) {
            return null;
        }

        $promedio = $sumaPuntajes / $sumaPesos;

        // El componente no puede estar en mejor banda que su peor variable.
        return self::redondear(min($promedio, self::techoDeBanda($peor)));
    }

    /**
     * ISBD = Wp*IP + Wm*IM + Wa*IA. Los pesos se renormalizan sobre los
     * componentes presentes para que el resultado siga en escala 0-100 aunque
     * falte alguno.
     *
     * @param array<string,float> $indices  componente => indice 0-100
     */
    public static function isbd(array $indices): float
    {
        $sumaPesos  = 0.0;
        $acumulado  = 0.0;
        $peor       = 100.0;

        foreach (self::PESOS_COMPONENTES as $componente => $peso) {
            if (!isset($indices[$componente])) {
                continue;
            }
            $sumaPesos += $peso;
            $acumulado += $peso * $indices[$componente];
            $peor       = min($peor, $indices[$componente]);
        }

        if ($sumaPesos <= 0) {
            return 0.0;
        }

        $promedio = $acumulado / $sumaPesos;

        // El ISBD no puede estar en mejor banda que su peor componente.
        return self::redondear(min($promedio, self::techoDeBanda($peor)));
    }

    /**
     * Tope al que se limita un indice segun la banda de su peor componente.
     * Con la penalizacion desactivada no topa nada (devuelve 100).
     */
    private static function techoDeBanda(float $peor): float
    {
        if (!self::PENALIZAR_CRITICO) {
            return 100.0;
        }

        return match (true) {
            // Rojo: el techo es el propio puntaje de la peor senal, para que la
            // profundidad de la critica se refleje en el indice.
            $peor < self::PUNTAJE_AMARILLO_MINIMO => $peor,
            $peor < self::PUNTAJE_VERDE_MINIMO    => self::TECHO_AMARILLO,
            default                               => 100.0,
        };
    }

    /**
     * Estado de un indice en la escala 0-100. Mismos cortes que ya usaba el
     * frontend para colorear las tarjetas.
     *
     * @return array{nombre:string,color:string}
     */
    public static function estadoDeIndice(float $valor): array
    {
        return match (true) {
            $valor >= self::PUNTAJE_VERDE_MINIMO    => ['nombre' => 'Verde', 'color' => 'verde'],
            $valor >= self::PUNTAJE_AMARILLO_MINIMO => ['nombre' => 'Amarillo', 'color' => 'amarillo'],
            default                                 => ['nombre' => 'Rojo', 'color' => 'rojo'],
        };
    }

    /**
     * Mensaje de alerta de una variable fuera de umbral. El texto nombra la
     * variable, su valor y el umbral cruzado para que la alerta se entienda sin
     * abrir el detalle del componente.
     *
     * @param array{variable:string,unidad:string,sentido:string,limite_advertencia:?float,limite_critico:?float} $variable
     */
    public static function mensajeDeAlerta(array $variable, float $valor, string $color): string
    {
        $limite = $color === 'rojo'
            ? (float) $variable['limite_critico']
            : (float) $variable['limite_advertencia'];

        $nombreLimite = $color === 'rojo' ? 'critico' : 'de advertencia';
        $direccion    = $variable['sentido'] === 'alto_malo' ? 'por encima del' : 'por debajo del';

        return sprintf(
            '%s: %s %s, %s umbral %s (%s %s).',
            $variable['variable'],
            self::formatearNumero($valor),
            $variable['unidad'],
            $direccion,
            $nombreLimite,
            self::formatearNumero($limite),
            $variable['unidad']
        );
    }

    /** Severidad que corresponde al color del semaforo de una variable. */
    public static function severidadDeColor(string $color): ?string
    {
        return match ($color) {
            'rojo'     => 'critica',
            'amarillo' => 'advertencia',
            default    => null,
        };
    }

    /**
     * Valor de una variable 'alto_bueno' a partir del cual se considera que hay
     * holgura de sobra. El doble del umbral de advertencia, topado en 100 para
     * las variables porcentuales.
     */
    private static function referenciaSana(float $advertencia): float
    {
        if ($advertencia <= 0) {
            return 100.0;
        }

        return min(100.0, $advertencia * 2);
    }

    /**
     * Fraccion 0..1 del recorrido de $desde a $hasta en que cae $valor.
     * Si el tramo es degenerado (ambos extremos iguales) devuelve 1.0, que es
     * el extremo conservador: asume el peor punto de la banda.
     */
    private static function fraccion(float $valor, float $desde, float $hasta): float
    {
        $tramo = $hasta - $desde;
        if (abs($tramo) < 1e-9) {
            return 1.0;
        }

        return max(0.0, min(1.0, ($valor - $desde) / $tramo));
    }

    private static function redondear(float $valor): float
    {
        return round(max(0.0, min(100.0, $valor)), 2);
    }

    private static function formatearNumero(float $valor): string
    {
        return $valor == (int) $valor
            ? (string) (int) $valor
            : rtrim(rtrim(number_format($valor, 2, '.', ''), '0'), '.');
    }
}
