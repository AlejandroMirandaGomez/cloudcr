<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

/**
 * Criterio de calculo:
 *   - La unidad de medida es la pregunta: un control aporta tantas preguntas como tenga.
 *   - Una pregunta cuenta para una dimension solo si el control al que pertenece tiene
 *     nivel Primario o Secundario en esa dimension. Las dimensiones en NULL se excluyen.
 *   - Las respuestas 'N/A' se excluyen del denominador (no aplican a la organizacion).
 *   - cumplimiento = respuestas 'Si' / preguntas aplicables.
 *   - Escala de color: rojo < 0.6, amarillo < 0.85, verde >= 0.85.
 */
final class ReporteRepository extends BaseRepository
{
    private const DIMENSIONES = ['integridad', 'disponibilidad', 'confidencialidad'];

    public function resumen(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        $fila = $this->run(
            "SELECT COUNT(*)                                        AS total_respondidos,
                    COUNT(*) FILTER (WHERE r.cumple = 'Sí')         AS cumplidos,
                    COUNT(*) FILTER (WHERE r.cumple = 'No')         AS no_cumplidos,
                    COUNT(*) FILTER (WHERE r.cumple = 'N/A')        AS no_aplica,
                    COUNT(*) FILTER (WHERE r.documentado = 'Sí')    AS documentados,
                    COUNT(*) FILTER (WHERE r.repetible = 'Sí')      AS repetibles,
                    COUNT(*) FILTER (WHERE r.evidencia = 'Sí')      AS con_evidencia
               FROM Respuestas r
              WHERE r.cuestionario_id = :id",
            ['id' => $cuestionarioId]
        )->fetch();

        $total      = (int) $fila['total_respondidos'];
        $aplicables = $total - (int) $fila['no_aplica'];

        return [
            'cuestionario_id'   => $cuestionarioId,
            'total_respondidos' => $total,
            'cumplidos'         => (int) $fila['cumplidos'],
            'no_cumplidos'      => (int) $fila['no_cumplidos'],
            'no_aplica'         => (int) $fila['no_aplica'],
            'aplicables'        => $aplicables,
            'cumplimiento'      => $this->ratio((int) $fila['cumplidos'], $aplicables),
            'madurez_insumos'   => [
                'tasa_documentado' => $this->ratio((int) $fila['documentados'], $total),
                'tasa_repetible'   => $this->ratio((int) $fila['repetibles'], $total),
                'tasa_evidencia'   => $this->ratio((int) $fila['con_evidencia'], $total),
            ],
        ];
    }

    public function mapaCalor(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        $selects = [];
        foreach (self::DIMENSIONES as $dim) {
            $selects[] = sprintf(
                "COUNT(*) FILTER (WHERE ct.%1\$s IS NOT NULL      AND r.cumple <> 'N/A') AS %1\$s_aplicables,
                 COUNT(*) FILTER (WHERE ct.%1\$s IS NOT NULL      AND r.cumple = 'Sí')   AS %1\$s_cumplidos,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'Primario'     AND r.cumple <> 'N/A') AS %1\$s_p_aplicables,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'Primario'     AND r.cumple = 'Sí')   AS %1\$s_p_cumplidos,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'Secundario'   AND r.cumple <> 'N/A') AS %1\$s_s_aplicables,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'Secundario'   AND r.cumple = 'Sí')   AS %1\$s_s_cumplidos",
                $dim
            );
        }

        $fila = $this->run(
            'SELECT ' . implode(",\n                    ", $selects) . '
               FROM Respuestas r
               JOIN Preguntas p ON p.id = r.pregunta_id
               JOIN Controles ct ON ct.id = p.control_id
              WHERE r.cuestionario_id = :id',
            ['id' => $cuestionarioId]
        )->fetch();

        $dimensiones = [];
        foreach (self::DIMENSIONES as $dim) {
            $aplicables = (int) $fila[$dim . '_aplicables'];
            $cumplidos  = (int) $fila[$dim . '_cumplidos'];
            $porcentaje = $this->ratio($cumplidos, $aplicables);

            $dimensiones[] = [
                'dimension'    => $dim,
                'aplicables'   => $aplicables,
                'cumplidos'    => $cumplidos,
                'cumplimiento' => $porcentaje,
                'color'        => $this->color($porcentaje),
                'por_nivel'    => [
                    'primario'   => [
                        'aplicables'   => (int) $fila[$dim . '_p_aplicables'],
                        'cumplidos'    => (int) $fila[$dim . '_p_cumplidos'],
                        'cumplimiento' => $this->ratio(
                            (int) $fila[$dim . '_p_cumplidos'],
                            (int) $fila[$dim . '_p_aplicables']
                        ),
                    ],
                    'secundario' => [
                        'aplicables'   => (int) $fila[$dim . '_s_aplicables'],
                        'cumplidos'    => (int) $fila[$dim . '_s_cumplidos'],
                        'cumplimiento' => $this->ratio(
                            (int) $fila[$dim . '_s_cumplidos'],
                            (int) $fila[$dim . '_s_aplicables']
                        ),
                    ],
                ],
            ];
        }

        return [
            'cuestionario_id' => $cuestionarioId,
            'escala'          => [
                ['color' => 'rojo',     'desde' => 0.0,  'hasta' => 0.6],
                ['color' => 'amarillo', 'desde' => 0.6,  'hasta' => 0.85],
                ['color' => 'verde',    'desde' => 0.85, 'hasta' => 1.0],
            ],
            'dimensiones'     => $dimensiones,
        ];
    }

    public function hallazgos(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return array_map(
            static function (array $f): array {
                $f['control_id']  = (int) $f['control_id'];
                $f['pregunta_id'] = (int) $f['pregunta_id'];
                $f['orden']       = (int) $f['orden'];
                $f['peso']        = (int) $f['peso'];
                return $f;
            },
            $this->run(
                "SELECT ct.id AS control_id,
                        ct.codigo,
                        ct.nombre AS control,
                        ct.peso,
                        n.nombre AS norma,
                        dn.nombre AS dominio_norma,
                        p.id AS pregunta_id,
                        p.orden,
                        p.texto,
                        ct.integridad,
                        ct.disponibilidad,
                        ct.confidencialidad,
                        r.documentado,
                        r.repetible,
                        r.evidencia
                   FROM Respuestas r
                   JOIN Preguntas p ON p.id = r.pregunta_id
                   JOIN Controles ct ON ct.id = p.control_id
                   JOIN Normas n ON n.id = ct.norma_id
                   JOIN Dominios_Norma dn ON dn.id = ct.dominio_norma_id
                  WHERE r.cuestionario_id = :id
                    AND r.cumple = 'No'
                  ORDER BY ct.peso DESC, LENGTH(ct.codigo), ct.codigo, p.orden",
                ['id' => $cuestionarioId]
            )->fetchAll()
        );
    }

    /** Preguntas marcadas 'N/A' con su justificacion, para la trazabilidad del reporte. */
    public function noAplicables(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return array_map(
            static function (array $f): array {
                $f['control_id']  = (int) $f['control_id'];
                $f['pregunta_id'] = (int) $f['pregunta_id'];
                $f['orden']       = (int) $f['orden'];
                return $f;
            },
            $this->run(
                "SELECT ct.id AS control_id,
                        ct.codigo,
                        ct.nombre AS control,
                        p.id AS pregunta_id,
                        p.orden,
                        p.texto,
                        r.justificacion_no_aplica
                   FROM Respuestas r
                   JOIN Preguntas p ON p.id = r.pregunta_id
                   JOIN Controles ct ON ct.id = p.control_id
                  WHERE r.cuestionario_id = :id
                    AND r.cumple = 'N/A'
                  ORDER BY LENGTH(ct.codigo), ct.codigo, p.orden",
                ['id' => $cuestionarioId]
            )->fetchAll()
        );
    }

    public function historialOrganizacion(int $organizacionId): array
    {
        $this->assertExists('Organizaciones', $organizacionId, 'la organizacion');

        return array_map(
            function (array $f): array {
                $aplicables = (int) $f['aplicables'];
                $cumplidos  = (int) $f['cumplidos'];

                return [
                    'cuestionario_id' => (int) $f['cuestionario_id'],
                    'fecha'           => $f['fecha'],
                    'evaluador'       => $f['evaluador'],
                    'aplicables'      => $aplicables,
                    'cumplidos'       => $cumplidos,
                    'cumplimiento'    => $this->ratio($cumplidos, $aplicables),
                    'color'           => $this->color($this->ratio($cumplidos, $aplicables)),
                ];
            },
            $this->run(
                "SELECT c.id AS cuestionario_id,
                        c.fecha,
                        e.nombre AS evaluador,
                        COUNT(r.id) FILTER (WHERE r.cumple <> 'N/A') AS aplicables,
                        COUNT(r.id) FILTER (WHERE r.cumple = 'Sí')   AS cumplidos
                   FROM Cuestionarios_Control_Interno c
                   JOIN Evaluadores e ON e.id = c.evaluador_id
                   LEFT JOIN Respuestas r ON r.cuestionario_id = c.id
                  WHERE c.organizacion_id = :id
                  GROUP BY c.id, c.fecha, e.nombre
                  ORDER BY c.fecha, c.id",
                ['id' => $organizacionId]
            )->fetchAll()
        );
    }

    /**
     * Nivel de madurez 0-5 por control segun docs/Metodologia_Madurez.md:
     *   tasas de 'Sí' por atributo sobre preguntas aplicables (cumple <> 'N/A'),
     *   IM = 5 * (tC + tD + tR + tE) / 4, redondeo con topes cualitativos
     *   (sin documentacion max 2, sin evidencia max 3, sin 100% en todo max 4).
     */
    public function madurez(int $cuestionarioId): array
    {
        $controles = $this->madurezPorControl($cuestionarioId);

        $dominios = [];
        foreach ($controles as $c) {
            if ($c['indice_madurez'] === null) {
                continue;
            }
            $clave = $c['dominio_norma'];
            $dominios[$clave] ??= [
                'dominio_norma' => $c['dominio_norma'],
                'clausula'      => $c['clausula'],
                'peso_total'    => 0,
                'suma'          => 0.0,
                'controles'     => 0,
            ];
            $dominios[$clave]['peso_total'] += $c['peso'];
            $dominios[$clave]['suma']       += $c['peso'] * $c['indice_madurez'];
            $dominios[$clave]['controles']++;
        }

        $porDominio = array_map(
            static fn (array $d): array => [
                'dominio_norma'       => $d['dominio_norma'],
                'clausula'            => $d['clausula'],
                'controles_evaluados' => $d['controles'],
                'indice_madurez'      => round($d['suma'] / $d['peso_total'], 2),
            ],
            array_values($dominios)
        );

        $evaluados = array_filter($controles, static fn (array $c): bool => $c['indice_madurez'] !== null);
        $pesoTotal = array_sum(array_column($evaluados, 'peso'));
        $global    = $pesoTotal > 0
            ? round(
                array_sum(array_map(
                    static fn (array $c): float => $c['peso'] * $c['indice_madurez'],
                    $evaluados
                )) / $pesoTotal,
                2
            )
            : null;

        return [
            'cuestionario_id' => $cuestionarioId,
            'escala'          => [
                ['nivel' => 0, 'descripcion' => 'El control no existe'],
                ['nivel' => 1, 'descripcion' => 'Informal u ocasional, sin procedimientos definidos'],
                ['nivel' => 2, 'descripcion' => 'Parcial, con algunas practicas documentadas'],
                ['nivel' => 3, 'descripcion' => 'Documentado, definido e implementado'],
                ['nivel' => 4, 'descripcion' => 'Implementado, supervisado y con evidencias'],
                ['nivel' => 5, 'descripcion' => 'Medido, evaluado y en mejora continua'],
            ],
            'controles'       => $controles,
            'dominios'        => $porDominio,
            'global'          => [
                'controles_evaluados' => count($evaluados),
                'indice_madurez'      => $global,
            ],
        ];
    }

    /**
     * Exposicion al riesgo C/I/D segun docs/Metodologia_Riesgo.md:
     *   deficiencia d = 1 - IM/5; relevancia Primario 1.0 / Secundario 0.5 / NULL 0;
     *   E(X) = sum(peso * r * d) / sum(peso * r); ER(control) = (peso/10) * d.
     */
    public function riesgo(int $cuestionarioId): array
    {
        $controles = $this->madurezPorControl($cuestionarioId);

        $acumulado = [];
        foreach (self::DIMENSIONES as $dim) {
            $acumulado[$dim] = ['numerador' => 0.0, 'denominador' => 0.0, 'controles' => 0];
        }
        $porControl = [];

        foreach ($controles as $c) {
            if ($c['indice_madurez'] === null) {
                continue;
            }
            $deficiencia = round(1 - $c['indice_madurez'] / 5, 4);

            foreach (self::DIMENSIONES as $dim) {
                $factor = self::factorRelevancia($c[$dim]);
                if ($factor <= 0.0) {
                    continue;
                }
                $acumulado[$dim]['numerador']   += $c['peso'] * $factor * $deficiencia;
                $acumulado[$dim]['denominador'] += $c['peso'] * $factor;
                $acumulado[$dim]['controles']++;
            }

            $porControl[] = [
                'control_id'       => $c['control_id'],
                'codigo'           => $c['codigo'],
                'nombre'           => $c['nombre'],
                'dominio_norma'    => $c['dominio_norma'],
                'peso'             => $c['peso'],
                'indice_madurez'   => $c['indice_madurez'],
                'nivel_madurez'    => $c['nivel_madurez'],
                'deficiencia'      => $deficiencia,
                'exposicion'       => round($c['peso'] / 10 * $deficiencia, 4),
                'confidencialidad' => $c['confidencialidad'],
                'integridad'       => $c['integridad'],
                'disponibilidad'   => $c['disponibilidad'],
            ];
        }

        usort($porControl, static fn (array $a, array $b): int => $b['exposicion'] <=> $a['exposicion']);

        $dimensiones     = [];
        $sumaNumerador   = 0.0;
        $sumaDenominador = 0.0;
        foreach (self::DIMENSIONES as $dim) {
            $numerador   = $acumulado[$dim]['numerador'];
            $denominador = $acumulado[$dim]['denominador'];
            $exposicion  = $denominador > 0 ? round($numerador / $denominador, 4) : null;

            $sumaNumerador   += $numerador;
            $sumaDenominador += $denominador;

            $dimensiones[] = [
                'dimension'             => $dim,
                'controles_considerados' => $acumulado[$dim]['controles'],
                'exposicion'            => $exposicion,
                'nivel_riesgo'          => self::nivelRiesgo($exposicion),
                'color'                 => self::colorRiesgo($exposicion),
            ];
        }

        $general = $sumaDenominador > 0 ? round($sumaNumerador / $sumaDenominador, 4) : null;

        return [
            'cuestionario_id' => $cuestionarioId,
            'escala'          => [
                ['nivel' => 'bajo',  'color' => 'verde',    'desde' => 0.0,  'hasta' => 0.15],
                ['nivel' => 'medio', 'color' => 'amarillo', 'desde' => 0.15, 'hasta' => 0.4],
                ['nivel' => 'alto',  'color' => 'rojo',     'desde' => 0.4,  'hasta' => 1.0],
            ],
            'dimensiones'     => $dimensiones,
            'indice_general'  => [
                'exposicion'   => $general,
                'nivel_riesgo' => self::nivelRiesgo($general),
                'color'        => self::colorRiesgo($general),
            ],
            'controles'       => $porControl,
        ];
    }

    /** @return list<array<string,mixed>> tasas, IM y nivel por control */
    private function madurezPorControl(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        $filas = $this->run(
            "SELECT ct.id AS control_id,
                    ct.codigo,
                    ct.nombre,
                    ct.peso,
                    ct.confidencialidad,
                    ct.integridad,
                    ct.disponibilidad,
                    dn.nombre AS dominio_norma,
                    dn.clausula,
                    COUNT(p.id)  AS preguntas,
                    COUNT(r.id)  AS respondidas,
                    COUNT(r.id) FILTER (WHERE r.cumple <> 'N/A') AS aplicables,
                    COUNT(r.id) FILTER (WHERE r.cumple <> 'N/A' AND r.cumple      = 'Sí') AS cumple_si,
                    COUNT(r.id) FILTER (WHERE r.cumple <> 'N/A' AND r.documentado = 'Sí') AS documentado_si,
                    COUNT(r.id) FILTER (WHERE r.cumple <> 'N/A' AND r.repetible   = 'Sí') AS repetible_si,
                    COUNT(r.id) FILTER (WHERE r.cumple <> 'N/A' AND r.evidencia   = 'Sí') AS evidencia_si
               FROM Controles ct
               JOIN Dominios_Norma dn ON dn.id = ct.dominio_norma_id
               LEFT JOIN Preguntas p ON p.control_id = ct.id
               LEFT JOIN Respuestas r ON r.pregunta_id = p.id AND r.cuestionario_id = :id
              GROUP BY ct.id, ct.codigo, ct.nombre, ct.peso,
                       ct.confidencialidad, ct.integridad, ct.disponibilidad,
                       dn.nombre, dn.clausula
              ORDER BY LENGTH(ct.codigo), ct.codigo",
            ['id' => $cuestionarioId]
        )->fetchAll();

        return array_map(static function (array $f): array {
            $aplicables = (int) $f['aplicables'];

            $tasas          = null;
            $indice         = null;
            $nivel          = null;
            if ($aplicables > 0) {
                $tC = (int) $f['cumple_si'] / $aplicables;
                $tD = (int) $f['documentado_si'] / $aplicables;
                $tR = (int) $f['repetible_si'] / $aplicables;
                $tE = (int) $f['evidencia_si'] / $aplicables;

                $indice = 5 * ($tC + $tD + $tR + $tE) / 4;
                $nivel  = (int) round($indice);

                // topes cualitativos de la escala del enunciado
                if ($tD <= 0.0) {
                    $nivel = min($nivel, 2);
                }
                if ($tE <= 0.0) {
                    $nivel = min($nivel, 3);
                }
                if ($tC < 1.0 || $tD < 1.0 || $tR < 1.0 || $tE < 1.0) {
                    $nivel = min($nivel, 4);
                }

                $indice = round($indice, 2);
                $tasas  = [
                    'cumple'      => round($tC, 4),
                    'documentado' => round($tD, 4),
                    'repetible'   => round($tR, 4),
                    'evidencia'   => round($tE, 4),
                ];
            }

            return [
                'control_id'       => (int) $f['control_id'],
                'codigo'           => $f['codigo'],
                'nombre'           => $f['nombre'],
                'dominio_norma'    => $f['dominio_norma'],
                'clausula'         => (int) $f['clausula'],
                'peso'             => (int) $f['peso'],
                'confidencialidad' => $f['confidencialidad'],
                'integridad'       => $f['integridad'],
                'disponibilidad'   => $f['disponibilidad'],
                'preguntas'        => (int) $f['preguntas'],
                'respondidas'      => (int) $f['respondidas'],
                'aplicables'       => $aplicables,
                'tasas'            => $tasas,
                'indice_madurez'   => $indice,
                'nivel_madurez'    => $nivel,
            ];
        }, $filas);
    }

    private static function factorRelevancia(?string $nivel): float
    {
        return match ($nivel) {
            'Primario'   => 1.0,
            'Secundario' => 0.5,
            default      => 0.0,
        };
    }

    private static function nivelRiesgo(?float $exposicion): string
    {
        if ($exposicion === null) {
            return 'sin_datos';
        }
        if ($exposicion < 0.15) {
            return 'bajo';
        }
        if ($exposicion < 0.4) {
            return 'medio';
        }
        return 'alto';
    }

    private static function colorRiesgo(?float $exposicion): string
    {
        return match (self::nivelRiesgo($exposicion)) {
            'bajo'      => 'verde',
            'medio'     => 'amarillo',
            'alto'      => 'rojo',
            default     => 'sin_datos',
        };
    }

    private function ratio(int $numerador, int $denominador): ?float
    {
        if ($denominador <= 0) {
            return null;
        }
        return round($numerador / $denominador, 4);
    }

    private function color(?float $valor): string
    {
        if ($valor === null) {
            return 'sin_datos';
        }
        if ($valor < 0.6) {
            return 'rojo';
        }
        if ($valor < 0.85) {
            return 'amarillo';
        }
        return 'verde';
    }
}
