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
                       o.correo,
                       COUNT(c.id) AS total_cuestionarios,
                       MAX(c.fecha) AS ultimo_cuestionario
                  FROM Organizaciones o
                  LEFT JOIN Cuestionarios_Control_Interno c ON c.organizacion_id = o.id';

        $params = [];
        if ($buscar !== null) {
            $sql .= ' WHERE o.nombre ILIKE :buscar';
            $params['buscar'] = '%' . $buscar . '%';
        }

        $sql .= ' GROUP BY o.id, o.nombre, o.correo
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
        $fila = $this->run('SELECT id, nombre, correo FROM Organizaciones WHERE id = :id', ['id' => $id])->fetch();
        if ($fila === false) {
            throw HttpException::notFound('la organizacion', $id);
        }
        return $fila;
    }

    /** Incluye el hash de la contrasena; solo para uso interno del login. */
    public function buscarPorCorreo(string $correo): ?array
    {
        $fila = $this->run(
            'SELECT id, nombre, correo, contrasena_hash FROM Organizaciones WHERE correo = :correo',
            ['correo' => $correo]
        )->fetch();

        return $fila === false ? null : $fila;
    }

    /** @return array<string,mixed> */
    public function crear(string $nombre, string $correo, string $contrasenaHash): array
    {
        return $this->run(
            'INSERT INTO Organizaciones (nombre, correo, contrasena_hash)
             VALUES (:nombre, :correo, :hash)
             RETURNING id, nombre, correo',
            ['nombre' => $nombre, 'correo' => $correo, 'hash' => $contrasenaHash]
        )->fetch();
    }

    /** @return array<string,mixed> */
    public function actualizar(int $id, string $nombre, string $correo, ?string $contrasenaHash): array
    {
        $sql = 'UPDATE Organizaciones SET nombre = :nombre, correo = :correo';
        $params = ['id' => $id, 'nombre' => $nombre, 'correo' => $correo];

        if ($contrasenaHash !== null) {
            $sql .= ', contrasena_hash = :hash';
            $params['hash'] = $contrasenaHash;
        }
        $sql .= ' WHERE id = :id RETURNING id, nombre, correo';

        $fila = $this->run($sql, $params)->fetch();

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