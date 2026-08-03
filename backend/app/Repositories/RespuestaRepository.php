<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\Database;
use CloudCR\Core\HttpException;

/** HU-013, HU-014. Tabla Respuestas_Controles. */
final class RespuestaRepository extends BaseRepository
{
    /**
     * HU-013 y HU-014 en una sola operacion idempotente: aprovecha la restriccion
     * UNIQUE (cuestionario_id, control_id) para insertar o actualizar segun corresponda.
     *
     * @param array{respuesta:string,documentado:string,repetible:string,evidencia:string} $datos
     * @return array{creado:bool,respuesta:array<string,mixed>}
     */
    public function guardar(int $cuestionarioId, int $controlId, array $datos): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');
        $this->assertExists('Controles', $controlId, 'el control');

        $existia = $this->existe($cuestionarioId, $controlId);

        $this->run(
            'INSERT INTO Respuestas_Controles
                 (cuestionario_id, control_id, respuesta, documentado, repetible, evidencia)
             VALUES
                 (:cuestionario_id,
                  :control_id,
                  CAST(:respuesta   AS respuesta_control),
                  CAST(:documentado AS si_no),
                  CAST(:repetible   AS si_no),
                  CAST(:evidencia   AS si_no))
             ON CONFLICT (cuestionario_id, control_id) DO UPDATE
                SET respuesta   = EXCLUDED.respuesta,
                    documentado = EXCLUDED.documentado,
                    repetible   = EXCLUDED.repetible,
                    evidencia   = EXCLUDED.evidencia',
            [
                'cuestionario_id' => $cuestionarioId,
                'control_id'      => $controlId,
                'respuesta'       => $datos['respuesta'],
                'documentado'     => $datos['documentado'],
                'repetible'       => $datos['repetible'],
                'evidencia'       => $datos['evidencia'],
            ]
        );

        return [
            'creado'    => !$existia,
            'respuesta' => $this->buscar($cuestionarioId, $controlId),
        ];
    }

    /**
     * Guardado por lotes: el cuestionario completo en una transaccion.
     * Si una sola fila falla, no queda nada a medias.
     *
     * @param list<array{control_id:int,respuesta:string,documentado:string,repetible:string,evidencia:string}> $filas
     * @return array{guardadas:int,creadas:int,actualizadas:int}
     */
    public function guardarLote(int $cuestionarioId, array $filas): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return Database::transaction(function () use ($cuestionarioId, $filas): array {
            $creadas = 0;
            $actualizadas = 0;

            foreach ($filas as $fila) {
                $resultado = $this->guardar($cuestionarioId, (int) $fila['control_id'], $fila);
                $resultado['creado'] ? $creadas++ : $actualizadas++;
            }

            return [
                'guardadas'    => $creadas + $actualizadas,
                'creadas'      => $creadas,
                'actualizadas' => $actualizadas,
            ];
        });
    }

    /** @return array<string,mixed> */
    public function buscar(int $cuestionarioId, int $controlId): array
    {
        $fila = $this->run(
            'SELECT rc.id,
                    rc.cuestionario_id,
                    rc.control_id,
                    ct.nombre_control,
                    rc.respuesta,
                    rc.documentado,
                    rc.repetible,
                    rc.evidencia
               FROM Respuestas_Controles rc
               JOIN Controles ct ON ct.id = rc.control_id
              WHERE rc.cuestionario_id = :cuestionario_id
                AND rc.control_id = :control_id',
            ['cuestionario_id' => $cuestionarioId, 'control_id' => $controlId]
        )->fetch();

        if ($fila === false) {
            throw new HttpException(404, sprintf(
                'El control %d no tiene respuesta registrada en el cuestionario %d.',
                $controlId,
                $cuestionarioId
            ));
        }

        $fila['id']              = (int) $fila['id'];
        $fila['cuestionario_id'] = (int) $fila['cuestionario_id'];
        $fila['control_id']      = (int) $fila['control_id'];

        return $fila;
    }

    private function existe(int $cuestionarioId, int $controlId): bool
    {
        return $this->run(
            'SELECT 1 FROM Respuestas_Controles
              WHERE cuestionario_id = :cuestionario_id AND control_id = :control_id',
            ['cuestionario_id' => $cuestionarioId, 'control_id' => $controlId]
        )->fetchColumn() !== false;
    }

    /**
     * Controles del catalogo que todavia no tienen respuesta en este cuestionario.
     * Le sirve al frontend para armar la pantalla del cuestionario.
     *
     * @return list<array<string,mixed>>
     */
    public function pendientes(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return array_map(
            static function (array $f): array {
                $f['id'] = (int) $f['id'];
                return $f;
            },
            $this->run(
                'SELECT ct.id,
                        ct.tipo_control,
                        ct.nombre_control,
                        ct.detalle,
                        ct.integridad,
                        ct.disponibilidad,
                        ct.confidencialidad
                   FROM Controles ct
                  WHERE NOT EXISTS (
                            SELECT 1 FROM Respuestas_Controles rc
                             WHERE rc.control_id = ct.id
                               AND rc.cuestionario_id = :id
                        )
                  ORDER BY ct.tipo_control, ct.nombre_control',
                ['id' => $cuestionarioId]
            )->fetchAll()
        );
    }

    public function eliminar(int $cuestionarioId, int $controlId): void
    {
        $this->buscar($cuestionarioId, $controlId);

        $this->run(
            'DELETE FROM Respuestas_Controles
              WHERE cuestionario_id = :cuestionario_id AND control_id = :control_id',
            ['cuestionario_id' => $cuestionarioId, 'control_id' => $controlId]
        );
    }
}