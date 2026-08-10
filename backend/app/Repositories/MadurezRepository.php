<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\Database;

final class MadurezRepository extends BaseRepository
{
    public const NIVEL_MINIMO = 1;
    public const NIVEL_MAXIMO = 5;

    private const SELECCION =
        'SELECT m.control_id,
                c.codigo,
                c.nombre AS control,
                m.nivel,
                e.nombre AS nivel_nombre,
                nm.descripcion AS nivel_descripcion
           FROM Madurez_Controles m
           JOIN Controles c ON c.id = m.control_id
           JOIN Escala_Madurez e ON e.nivel = m.nivel
           LEFT JOIN Niveles_Madurez_Control nm
                  ON nm.control_id = m.control_id AND nm.nivel = m.nivel';

    public function escala(): array
    {
        return array_map(
            static function (array $f): array {
                $f['nivel'] = (int) $f['nivel'];
                return $f;
            },
            $this->run('SELECT nivel, nombre FROM Escala_Madurez ORDER BY nivel')->fetchAll()
        );
    }

    public function listar(int $cuestionarioId): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');

        return array_map(
            [$this, 'hidratar'],
            $this->run(
                self::SELECCION . ' WHERE m.cuestionario_id = :id
                                    ORDER BY LENGTH(c.codigo), c.codigo',
                ['id' => $cuestionarioId]
            )->fetchAll()
        );
    }

    public function guardar(int $cuestionarioId, int $controlId, int $nivel): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $cuestionarioId, 'el cuestionario');
        $this->assertExists('Controles', $controlId, 'el control');

        return Database::transaction(function () use ($cuestionarioId, $controlId, $nivel): array {
            $existia = $this->buscar($cuestionarioId, $controlId) !== null;

            $this->run(
                'INSERT INTO Madurez_Controles (cuestionario_id, control_id, nivel)
                 VALUES (:cuestionario_id, :control_id, :nivel)
                 ON CONFLICT (cuestionario_id, control_id) DO UPDATE
                    SET nivel = EXCLUDED.nivel',
                [
                    'cuestionario_id' => $cuestionarioId,
                    'control_id'      => $controlId,
                    'nivel'           => $nivel,
                ]
            );

            return [
                'creado'  => !$existia,
                'madurez' => $this->buscar($cuestionarioId, $controlId),
            ];
        });
    }

    public function buscar(int $cuestionarioId, int $controlId): ?array
    {
        $fila = $this->run(
            self::SELECCION . ' WHERE m.cuestionario_id = :cuestionario_id
                                  AND m.control_id = :control_id',
            ['cuestionario_id' => $cuestionarioId, 'control_id' => $controlId]
        )->fetch();

        return $fila === false ? null : $this->hidratar($fila);
    }

    private function hidratar(array $fila): array
    {
        $fila['control_id'] = (int) $fila['control_id'];
        $fila['nivel']      = (int) $fila['nivel'];

        return $fila;
    }
}
