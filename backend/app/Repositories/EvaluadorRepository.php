<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\HttpException;

/**
 * Tabla Evaluadores. Registro, edicion y login (HU-002/003/007) por correo + contrasena.
 */
final class EvaluadorRepository extends BaseRepository
{
    /** @return list<array<string,mixed>> */
    public function listar(int $limit, int $offset): array
    {
        $filas = $this->run(
            'SELECT e.id,
                    e.nombre,
                    e.correo,
                    COUNT(c.id) AS cuestionarios_realizados
               FROM Evaluadores e
               LEFT JOIN Cuestionarios_Control_Interno c ON c.evaluador_id = e.id
              GROUP BY e.id, e.nombre, e.correo
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
        $fila = $this->run('SELECT id, nombre, correo FROM Evaluadores WHERE id = :id', ['id' => $id])->fetch();
        if ($fila === false) {
            throw HttpException::notFound('el evaluador', $id);
        }
        return $fila;
    }

    /** Incluye el hash de la contrasena; solo para uso interno del login. */
    public function buscarPorCorreo(string $correo): ?array
    {
        $fila = $this->run(
            'SELECT id, nombre, correo, contrasena_hash FROM Evaluadores WHERE correo = :correo',
            ['correo' => $correo]
        )->fetch();

        return $fila === false ? null : $fila;
    }

    /** @return array<string,mixed> */
    public function crear(string $nombre, string $correo, string $contrasenaHash): array
    {
        return $this->run(
            'INSERT INTO Evaluadores (nombre, correo, contrasena_hash)
             VALUES (:nombre, :correo, :hash)
             RETURNING id, nombre, correo',
            ['nombre' => $nombre, 'correo' => $correo, 'hash' => $contrasenaHash]
        )->fetch();
    }

    /** @return array<string,mixed> */
    public function actualizar(int $id, string $nombre, string $correo, ?string $contrasenaHash): array
    {
        $sql = 'UPDATE Evaluadores SET nombre = :nombre, correo = :correo';
        $params = ['id' => $id, 'nombre' => $nombre, 'correo' => $correo];

        if ($contrasenaHash !== null) {
            $sql .= ', contrasena_hash = :hash';
            $params['hash'] = $contrasenaHash;
        }
        $sql .= ' WHERE id = :id RETURNING id, nombre, correo';

        $fila = $this->run($sql, $params)->fetch();

        if ($fila === false) {
            throw HttpException::notFound('el evaluador', $id);
        }
        return $fila;
    }
}