<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

/**
 * HU-018 y consultas de resultados.
 *
 * Criterio de calculo (documentado para Persona 4, que define las reglas de negocio):
 *   - Un control cuenta para una dimension solo si su nivel en esa dimension es P o S.
 *     Los controles marcados N-A en la dimension se excluyen del denominador.
 *   - Las respuestas 'N-A' tambien se excluyen del denominador (no aplican a la organizacion).
 *   - cumplimiento = respuestas 'Si' / controles aplicables.
 *   - Escala de color: rojo < 0.6, amarillo < 0.85, verde >= 0.85.
 */
final class ReporteRepository extends BaseRepository
{
    private const DIMENSIONES = ['integridad', 'disponibilidad', 'confidencialidad'];

    /**
     * Resumen general del cuestionario (pantalla de Resultados).
     *
     * @return array<string,mixed>
     */
    public function resumen(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        $fila = $this->run(
            "SELECT COUNT(*)                                            AS total_respondidos,
                    COUNT(*) FILTER (WHERE rc.respuesta = 'Si')         AS cumplidos,
                    COUNT(*) FILTER (WHERE rc.respuesta = 'No')         AS no_cumplidos,
                    COUNT(*) FILTER (WHERE rc.respuesta = 'N-A')        AS no_aplica,
                    COUNT(*) FILTER (WHERE rc.documentado = 'si')       AS documentados,
                    COUNT(*) FILTER (WHERE rc.repetible = 'si')         AS repetibles,
                    COUNT(*) FILTER (WHERE rc.evidencia = 'si')         AS con_evidencia
               FROM Respuestas_Controles rc
              WHERE rc.cuestionario_id = :id",
            ['id' => $cuestionarioId]
        )->fetch();

        $total     = (int) $fila['total_respondidos'];
        $aplicables = $total - (int) $fila['no_aplica'];

        return [
            'cuestionario_id'   => $cuestionarioId,
            'total_respondidos' => $total,
            'cumplidos'         => (int) $fila['cumplidos'],
            'no_cumplidos'      => (int) $fila['no_cumplidos'],
            'no_aplica'         => (int) $fila['no_aplica'],
            'aplicables'        => $aplicables,
            'cumplimiento'      => $this->ratio((int) $fila['cumplidos'], $aplicables),
            // Insumos para el nivel de madurez que define Persona 4.
            'madurez_insumos'   => [
                'tasa_documentado' => $this->ratio((int) $fila['documentados'], $total),
                'tasa_repetible'   => $this->ratio((int) $fila['repetibles'], $total),
                'tasa_evidencia'   => $this->ratio((int) $fila['con_evidencia'], $total),
            ],
        ];
    }

    /**
     * HU-018: mapa de calor por dimension, con desglose por nivel P/S.
     *
     * @return array<string,mixed>
     */
    public function mapaCalor(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        $selects = [];
        foreach (self::DIMENSIONES as $dim) {
            $selects[] = sprintf(
                "COUNT(*) FILTER (WHERE ct.%1\$s <> 'N-A' AND rc.respuesta <> 'N-A')                        AS %1\$s_aplicables,
                 COUNT(*) FILTER (WHERE ct.%1\$s <> 'N-A' AND rc.respuesta = 'Si')                          AS %1\$s_cumplidos,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'P'   AND rc.respuesta <> 'N-A')                         AS %1\$s_p_aplicables,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'P'   AND rc.respuesta = 'Si')                           AS %1\$s_p_cumplidos,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'S'   AND rc.respuesta <> 'N-A')                         AS %1\$s_s_aplicables,
                 COUNT(*) FILTER (WHERE ct.%1\$s = 'S'   AND rc.respuesta = 'Si')                           AS %1\$s_s_cumplidos",
                $dim
            );
        }

        $fila = $this->run(
            'SELECT ' . implode(",\n                    ", $selects) . '
               FROM Respuestas_Controles rc
               JOIN Controles ct ON ct.id = rc.control_id
              WHERE rc.cuestionario_id = :id',
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

    /**
     * Controles no cumplidos del cuestionario. Es la entrada para las
     * recomendaciones automaticas que define Persona 4.
     *
     * @return list<array<string,mixed>>
     */
    public function hallazgos(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return array_map(
            static function (array $f): array {
                $f['control_id'] = (int) $f['control_id'];
                $f['normas']     = json_decode((string) $f['normas'], true) ?: [];
                return $f;
            },
            $this->run(
                "SELECT ct.id AS control_id,
                        ct.tipo_control,
                        ct.nombre_control,
                        ct.detalle,
                        ct.integridad,
                        ct.disponibilidad,
                        ct.confidencialidad,
                        rc.documentado,
                        rc.repetible,
                        rc.evidencia,
                        COALESCE(
                            JSON_AGG(n.nombre ORDER BY n.nombre) FILTER (WHERE n.id IS NOT NULL),
                            '[]'
                        ) AS normas
                   FROM Respuestas_Controles rc
                   JOIN Controles ct ON ct.id = rc.control_id
                   LEFT JOIN Controles_Normas cn ON cn.control_id = ct.id
                   LEFT JOIN Normas n ON n.id = cn.norma_id
                  WHERE rc.cuestionario_id = :id
                    AND rc.respuesta = 'No'
                  GROUP BY ct.id, rc.documentado, rc.repetible, rc.evidencia
                  ORDER BY ct.tipo_control, ct.nombre_control",
                ['id' => $cuestionarioId]
            )->fetchAll()
        );
    }

    /**
     * Evolucion del cumplimiento de una organizacion en el tiempo.
     *
     * @return list<array<string,mixed>>
     */
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
                        COUNT(rc.id) FILTER (WHERE rc.respuesta <> 'N-A') AS aplicables,
                        COUNT(rc.id) FILTER (WHERE rc.respuesta = 'Si')   AS cumplidos
                   FROM Cuestionarios_Control_Interno c
                   JOIN Evaluadores e ON e.id = c.evaluador_id
                   LEFT JOIN Respuestas_Controles rc ON rc.cuestionario_id = c.id
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
            return null; // sin datos: el frontend debe mostrar "sin evaluar", no 0%.
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