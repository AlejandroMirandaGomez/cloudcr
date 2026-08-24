<?php

declare(strict_types=1);

namespace CloudCR\Monitor;

/**
 * Fase 2 - Calculo puro de los indicadores de salud. No toca la base de datos:
 * recibe las definiciones de variables (Monitor_Variables) y los valores
 * medidos por el collector, y devuelve puntajes, indices, estados y alertas.
 *
 *     ISBD = (IP + IM + IA) / 3
 *
 * Cada componente (IP/IM/IA) es la media geometrica ponderada de los puntajes
 * 0-100 de sus variables. El puntaje traduce el valor crudo a la escala 0-100
 * usando las bandas fijas 100..75 (verde), 75..60 (amarillo) y 60..0 (rojo).
 *
 * El color del semaforo de los cuatro indices (ISBD, IP, IM, IA) NO usa esas
 * bandas fijas: sale de los umbrales configurables por base que guarda
 * Monitor_Umbrales_Indice y que llegan aqui como ['verde' => x, 'rojo' => y].
 *
 * Las variables de sentido 'fijo' (tamano de SGA, maximo de procesos) son datos
 * de configuracion: no puntuan ni generan alertas, y su peso se reparte entre
 * las variables del mismo componente que si miden salud.
 */
final class CalculadoraSalud
{
    public const PESOS_COMPONENTES = [
        'procesos' => 1 / 3,
        'memoria'  => 1 / 3,
        'archivos' => 1 / 3,
    ];

    public const COMPONENTES = ['procesos', 'memoria', 'archivos'];

    public const INDICADORES = ['procesos' => 'IP', 'memoria' => 'IM', 'archivos' => 'IA'];

    public const CLAVES_INDICE = ['procesos' => 'ip', 'memoria' => 'im', 'archivos' => 'ia'];

    public const INDICES_CONFIGURABLES = ['isbd', 'ip', 'im', 'ia'];

    public const UMBRALES_INDICE_POR_DEFECTO = [
        'isbd' => ['verde' => 75.0, 'rojo' => 60.0],
        'ip'   => ['verde' => 75.0, 'rojo' => 60.0],
        'im'   => ['verde' => 75.0, 'rojo' => 60.0],
        'ia'   => ['verde' => 75.0, 'rojo' => 60.0],
    ];

    private const PUNTAJE_VERDE_MINIMO    = 75.0;
    private const PUNTAJE_AMARILLO_MINIMO = 60.0;

    /**
     * Piso del puntaje dentro de la media geometrica de un componente.
     *
     * La media geometrica es parcialmente no-compensatoria: un puntaje bajo
     * pesa mas de lo que su peso nominal sugeriria, y esa penalizacion crece
     * con el propio peso de la variable -- sin recurrir a un techo fijo por
     * banda de color, que trataba igual a una critica que pesa 1% del
     * componente que a una que pesa 50%. Mismo criterio que uso el PNUD al
     * pasar el IDH de media aritmetica a geometrica en 2010, para que un
     * puntaje bueno no "tape" a uno malo en el promedio.
     *
     * log(0) no esta definido, asi que una variable en el fondo de la escala
     * (puntaje 0) se trata como 1 en vez de anular el producto entero sin
     * importar el peso de las demas variables.
     *
     * Aplica solo a IP/IM/IA. El ISBD es el promedio simple de los tres.
     */
    private const PUNTAJE_MINIMO_GEOMETRICO = 1.0;

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

        $verde = (float) $variable['limite_advertencia'];
        $rojo  = (float) $variable['limite_critico'];

        // La direccion sale del orden de los dos umbrales, no de una columna
        // aparte: si el rojo es mayor, valores altos son peores.
        if ($rojo > $verde) {
            return match (true) {
                $valor >= $rojo  => 'rojo',
                $valor <= $verde => 'verde',
                default          => 'amarillo',
            };
        }

        return match (true) {
            $valor <= $rojo  => 'rojo',
            $valor >= $verde => 'verde',
            default          => 'amarillo',
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
        $altoMalo    = $critico > $advertencia;

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
     * Indice 0-100 de un componente: media geometrica de los puntajes
     * ponderada por el peso de cada variable. Los pesos se renormalizan sobre
     * las variables realmente puntuadas, asi que no hace falta que el
     * collector envie las 25 ni que los pesos del catalogo sumen exactamente
     * 100.
     *
     * @param list<array{peso:float,puntaje:?float}> $variables
     */
    public static function indiceComponente(array $variables): ?float
    {
        $sumaPesos      = 0.0;
        $sumaLogaritmos = 0.0;

        foreach ($variables as $v) {
            if ($v['puntaje'] === null || $v['peso'] <= 0) {
                continue;
            }
            $puntaje = max($v['puntaje'], self::PUNTAJE_MINIMO_GEOMETRICO);
            $sumaPesos      += $v['peso'];
            $sumaLogaritmos += $v['peso'] * log($puntaje);
        }

        if ($sumaPesos <= 0) {
            return null;
        }

        return self::redondear(exp($sumaLogaritmos / $sumaPesos));
    }

    /**
     * ISBD = (IP + IM + IA) / 3. Promedio simple de los componentes presentes,
     * sin ponderacion y sin techo por peor componente: el numero es la media de
     * los tres indices. Las criticas individuales siguen viajando por
     * Monitor_Alertas y por el techo interno de cada componente.
     *
     * @param array<string,float> $indices  componente => indice 0-100
     */
    public static function isbd(array $indices): float
    {
        $valores = [];

        foreach (self::COMPONENTES as $componente) {
            if (isset($indices[$componente])) {
                $valores[] = (float) $indices[$componente];
            }
        }

        if ($valores === []) {
            return 0.0;
        }

        return self::redondear(array_sum($valores) / count($valores));
    }

    /**
     * Semaforo de un indice 0-100 contra sus dos umbrales configurables. Los
     * indices son siempre "mientras mas alto, mejor", asi que se lee igual que
     * una variable alto_bueno: verde desde el umbral verde hacia arriba, rojo
     * desde el umbral rojo hacia abajo, amarillo en medio.
     *
     * Sin umbrales cae en los cortes historicos 75 / 60.
     *
     * @param array{verde:float,rojo:float}|null $umbrales
     * @return array{nombre:string,color:string}
     */
    public static function estadoDeIndice(float $valor, ?array $umbrales = null): array
    {
        $verde = (float) ($umbrales['verde'] ?? self::PUNTAJE_VERDE_MINIMO);
        $rojo  = (float) ($umbrales['rojo'] ?? self::PUNTAJE_AMARILLO_MINIMO);

        return match (true) {
            $valor >= $verde => ['nombre' => 'Verde', 'color' => 'verde'],
            $valor <= $rojo  => ['nombre' => 'Rojo', 'color' => 'rojo'],
            default          => ['nombre' => 'Amarillo', 'color' => 'amarillo'],
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
        $altoMalo     = (float) $variable['limite_critico'] > (float) $variable['limite_advertencia'];
        $direccion    = $altoMalo ? 'por encima del' : 'por debajo del';

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
