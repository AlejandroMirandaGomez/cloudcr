<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\HttpException;

/**
 * Tabla Evaluadores. El registro con aprobacion (HU-002/003) y el login (HU-007)
 * quedan como implementacion futura: la tabla solo tiene id y nombre.
 */
final class EvaluadorRepository extends BaseRepository
{
    /** @return list<array<string,mixed>> */
    public function listar(int $limit, int $offset): array
    {
        $filas = $this->run(
            'SELECT e.id,
                    e.nombre,
                    COUNT(c.id) AS cuestionarios_realizados
               FROM Evaluadores e
               LEFT JOIN Cuestionarios_Control_Interno c ON c.evaluador_id = e.id
              GROUP BY e.id, e.nombre
              ORDER BY e.nombre
              LIMIT :limit OFFSET :offset',
            ['limit' => $limit, 'offset' => $offset]
        )->fetchAll();

        return array_map(static function (array $f): array {
            $f['cuestionarios_realizados'] = (int) $f['cuestionarios_realizados'];
            return $f;
        }, $filas);
    }

    public function contar(): int
    {
        return (int) $this->run('SELECT COUNT(*) FROM Evaluadores')->fetchColumn();
    }

    /** @return array<string,mixed> */
    public function buscarPorId(int $id): array
    {
        $fila = $this->run('SELECT id, nombre FROM Evaluadores WHERE id = :id', ['id' => $id])->fetch();
        if ($fila === false) {
            throw HttpException::notFound('el evaluador', $id);
        }
        return $fila;
    }

    /** @return array<string,mixed> */
    public function crear(string $nombre): array
    {
        return $this->run(
            'INSERT INTO Evaluadores (nombre) VALUES (:nombre) RETURNING id, nombre',
            ['nombre' => $nombre]
        )->fetch();
    }

    /** @return array<string,mixed> */
    public function actualizar(int $id, string $nombre): array
    {
        $fila = $this->run(
            'UPDATE Evaluadores SET nombre = :nombre WHERE id = :id RETURNING id, nombre',
            ['id' => $id, 'nombre' => $nombre]
        )->fetch();

        if ($fila === false) {
            throw HttpException::notFound('el evaluador', $id);
        }
        return $fila;
    }
}