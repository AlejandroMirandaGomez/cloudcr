<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\HttpException;

/** HU-004, HU-009. Tabla Normas. */
final class NormaRepository extends BaseRepository
{
    /** @return list<array<string,mixed>> */
    public function listar(int $limit, int $offset): array
    {
        $filas = $this->run(
            'SELECT n.id,
                    n.nombre,
                    COUNT(cn.control_id) AS controles_vinculados
               FROM Normas n
               LEFT JOIN Controles_Normas cn ON cn.norma_id = n.id
              GROUP BY n.id, n.nombre
              ORDER BY n.nombre
              LIMIT :limit OFFSET :offset',
            ['limit' => $limit, 'offset' => $offset]
        )->fetchAll();

        return array_map(static function (array $f): array {
            $f['controles_vinculados'] = (int) $f['controles_vinculados'];
            return $f;
        }, $filas);
    }

    public function contar(): int
    {
        return (int) $this->run('SELECT COUNT(*) FROM Normas')->fetchColumn();
    }

    /** @return array<string,mixed> */
    public function buscarPorId(int $id): array
    {
        $fila = $this->run('SELECT id, nombre FROM Normas WHERE id = :id', ['id' => $id])->fetch();
        if ($fila === false) {
            throw HttpException::notFound('la norma', $id);
        }
        return $fila;
    }

    /** @return array<string,mixed> */
    public function crear(string $nombre): array
    {
        return $this->run(
            'INSERT INTO Normas (nombre) VALUES (:nombre) RETURNING id, nombre',
            ['nombre' => $nombre]
        )->fetch();
    }

    /**
     * HU-009. Los controles ya vinculados conservan la relacion porque
     * Controles_Normas apunta al id, no al nombre.
     *
     * @return array<string,mixed>
     */
    public function actualizar(int $id, string $nombre): array
    {
        $fila = $this->run(
            'UPDATE Normas SET nombre = :nombre WHERE id = :id RETURNING id, nombre',
            ['id' => $id, 'nombre' => $nombre]
        )->fetch();

        if ($fila === false) {
            throw HttpException::notFound('la norma', $id);
        }
        return $fila;
    }

    /**
     * Sin columna "activo" en el esquema no existe el borrado logico de HU-011,
     * asi que solo se permite eliminar normas que no esten vinculadas a ningun control.
     */
    public function eliminar(int $id): void
    {
        $this->buscarPorId($id);

        $vinculos = (int) $this->run(
            'SELECT COUNT(*) FROM Controles_Normas WHERE norma_id = :id',
            ['id' => $id]
        )->fetchColumn();

        if ($vinculos > 0) {
            throw HttpException::conflicto(sprintf(
                'La norma esta vinculada a %d control(es). Desvincule los controles primero '
                . '(el esquema actual no tiene columna "activo" para desactivarla sin borrarla).',
                $vinculos
            ));
        }

        $this->run('DELETE FROM Normas WHERE id = :id', ['id' => $id]);
    }
}