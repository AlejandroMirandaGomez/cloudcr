<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\Database;
use CloudCR\Core\HttpException;

final class RespuestaRepository extends BaseRepository
{
    public function guardar(int $cuestionarioId, int $preguntaId, array $datos): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');
        $this->assertExists('Preguntas', $preguntaId, 'la pregunta');

        $existia = $this->existe($cuestionarioId, $preguntaId);

        $this->run(
            'INSERT INTO Respuestas
                 (cuestionario_id, pregunta_id, cumple, documentado, repetible, evidencia,
                  justificacion_no_aplica)
             VALUES
                 (:cuestionario_id,
                  :pregunta_id,
                  CAST(:cumple      AS respuesta_pregunta),
                  CAST(:documentado AS respuesta_pregunta),
                  CAST(:repetible   AS respuesta_pregunta),
                  CAST(:evidencia   AS respuesta_pregunta),
                  :justificacion_no_aplica)
             ON CONFLICT (cuestionario_id, pregunta_id) DO UPDATE
                SET cumple                  = EXCLUDED.cumple,
                    documentado             = EXCLUDED.documentado,
                    repetible               = EXCLUDED.repetible,
                    evidencia               = EXCLUDED.evidencia,
                    justificacion_no_aplica = EXCLUDED.justificacion_no_aplica',
            [
                'cuestionario_id'         => $cuestionarioId,
                'pregunta_id'             => $preguntaId,
                'cumple'                  => $datos['cumple'],
                'documentado'             => $datos['documentado'],
                'repetible'               => $datos['repetible'],
                'evidencia'               => $datos['evidencia'],
                // Solo se conserva cuando la pregunta no aplica.
                'justificacion_no_aplica' => $datos['cumple'] === 'N/A'
                    ? $datos['justificacion_no_aplica']
                    : null,
            ]
        );

        return [
            'creado'    => !$existia,
            'respuesta' => $this->buscar($cuestionarioId, $preguntaId),
        ];
    }

    public function guardarLote(int $cuestionarioId, array $filas): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return Database::transaction(function () use ($cuestionarioId, $filas): array {
            $creadas      = 0;
            $actualizadas = 0;

            foreach ($filas as $fila) {
                $resultado = $this->guardar($cuestionarioId, (int) $fila['pregunta_id'], $fila);
                $resultado['creado'] ? $creadas++ : $actualizadas++;
            }

            return [
                'guardadas'    => $creadas + $actualizadas,
                'creadas'      => $creadas,
                'actualizadas' => $actualizadas,
            ];
        });
    }

    public function buscar(int $cuestionarioId, int $preguntaId): array
    {
        $fila = $this->run(
            'SELECT r.id,
                    r.cuestionario_id,
                    r.pregunta_id,
                    p.orden,
                    p.texto,
                    p.control_id,
                    c.codigo,
                    c.nombre AS control,
                    r.cumple,
                    r.documentado,
                    r.repetible,
                    r.evidencia,
                    r.justificacion_no_aplica
               FROM Respuestas r
               JOIN Preguntas p ON p.id = r.pregunta_id
               JOIN Controles c ON c.id = p.control_id
              WHERE r.cuestionario_id = :cuestionario_id
                AND r.pregunta_id = :pregunta_id',
            ['cuestionario_id' => $cuestionarioId, 'pregunta_id' => $preguntaId]
        )->fetch();

        if ($fila === false) {
            throw new HttpException(404, sprintf(
                'La pregunta %d no tiene respuesta registrada en el cuestionario %d.',
                $preguntaId,
                $cuestionarioId
            ));
        }

        return $this->hidratar($fila);
    }

    public function pendientes(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return array_map(
            [$this, 'hidratar'],
            $this->run(
                'SELECT p.id,
                        p.orden,
                        p.texto,
                        p.control_id,
                        c.codigo,
                        c.nombre AS control
                   FROM Preguntas p
                   JOIN Controles c ON c.id = p.control_id
                  WHERE NOT EXISTS (
                            SELECT 1 FROM Respuestas r
                             WHERE r.pregunta_id = p.id
                               AND r.cuestionario_id = :id
                        )
                  ORDER BY LENGTH(c.codigo), c.codigo, p.orden',
                ['id' => $cuestionarioId]
            )->fetchAll()
        );
    }

    public function eliminar(int $cuestionarioId, int $preguntaId): void
    {
        $this->buscar($cuestionarioId, $preguntaId);

        $this->run(
            'DELETE FROM Respuestas
              WHERE cuestionario_id = :cuestionario_id AND pregunta_id = :pregunta_id',
            ['cuestionario_id' => $cuestionarioId, 'pregunta_id' => $preguntaId]
        );
    }

    private function existe(int $cuestionarioId, int $preguntaId): bool
    {
        return $this->run(
            'SELECT 1 FROM Respuestas
              WHERE cuestionario_id = :cuestionario_id AND pregunta_id = :pregunta_id',
            ['cuestionario_id' => $cuestionarioId, 'pregunta_id' => $preguntaId]
        )->fetchColumn() !== false;
    }

    private function hidratar(array $fila): array
    {
        foreach (['id', 'cuestionario_id', 'pregunta_id', 'orden', 'control_id'] as $columna) {
            if (isset($fila[$columna])) {
                $fila[$columna] = (int) $fila[$columna];
            }
        }

        return $fila;
    }
}
