<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\HttpException;

/** HU-001, HU-016. Tabla Organizaciones. */
final class OrganizacionRepository extends BaseRepository
{
    /** @return list<array<string,mixed>> */
    public function listar(?string $buscar, int $limit, int $offset): array
    {
        $sql = 'SELECT o.id,
                       o.nombre,
                       COUNT(c.id) AS total_cuestionarios,
                       MAX(c.fecha) AS ultimo_cuestionario
                  FROM Organizaciones o
                  LEFT JOIN Cuestionarios_Control_Interno c ON c.organizacion_id = o.id';

        $params = [];
        if ($buscar !== null) {
            $sql .= ' WHERE o.nombre ILIKE :buscar';
            $params['buscar'] = '%' . $buscar . '%';
        }

        $sql .= ' GROUP BY o.id, o.nombre
                  ORDER BY o.nombre
                  LIMIT :limit OFFSET :offset';

        $params['limit']  = $limit;
        $params['offset'] = $offset;

        $filas = $this->run($sql, $params)->fetchAll();

        return array_map(static function (array $f): array {
            $f['total_cuestionarios'] = (int) $f['total_cuestionarios'];
            return $f;
        }, $filas);
    }

    public function contar(?string $buscar): int
    {
        $sql    = 'SELECT COUNT(*) FROM Organizaciones';
        $params = [];
        if ($buscar !== null) {
            $sql .= ' WHERE nombre ILIKE :buscar';
            $params['buscar'] = '%' . $buscar . '%';
        }
        return (int) $this->run($sql, $params)->fetchColumn();
    }

    /** @return array<string,mixed> */
    public function buscarPorId(int $id): array
    {
        $fila = $this->run('SELECT id, nombre FROM Organizaciones WHERE id = :id', ['id' => $id])->fetch();
        if ($fila === false) {
            throw HttpException::notFound('la organizacion', $id);
        }
        return $fila;
    }

    /** @return array<string,mixed> */
    public function crear(string $nombre): array
    {
        return $this->run(
            'INSERT INTO Organizaciones (nombre) VALUES (:nombre) RETURNING id, nombre',
            ['nombre' => $nombre]
        )->fetch();
    }

    /** @return array<string,mixed> */
    public function actualizar(int $id, string $nombre): array
    {
        $fila = $this->run(
            'UPDATE Organizaciones SET nombre = :nombre WHERE id = :id RETURNING id, nombre',
            ['id' => $id, 'nombre' => $nombre]
        )->fetch();

        if ($fila === false) {
            throw HttpException::notFound('la organizacion', $id);
        }
        return $fila;
    }

    public function eliminar(int $id): void
    {
        $this->buscarPorId($id);

        $enUso = (int) $this->run(
            'SELECT COUNT(*) FROM Cuestionarios_Control_Interno WHERE organizacion_id = :id',
            ['id' => $id]
        )->fetchColumn();

        if ($enUso > 0) {
            throw HttpException::conflicto(sprintf(
                'La organizacion tiene %d cuestionario(s) registrado(s) y no puede eliminarse sin perder historial.',
                $enUso
            ));
        }

        $this->run('DELETE FROM Organizaciones WHERE id = :id', ['id' => $id]);
    }
}