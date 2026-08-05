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
