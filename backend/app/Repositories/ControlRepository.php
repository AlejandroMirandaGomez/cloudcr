<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\Database;
use CloudCR\Core\HttpException;
use PDO;

/** HU-005, HU-010, HU-012. Tablas Controles y Controles_Normas. */
final class ControlRepository extends BaseRepository
{
    /** Columnas de dimension permitidas en los filtros (evita inyeccion por nombre de columna). */
    private const DIMENSIONES = ['integridad', 'disponibilidad', 'confidencialidad'];

    /**
     * HU-012: catalogo con filtros opcionales por norma, tipo y dimension.
     *
     * @param array{norma_id?:int|null,tipo?:string|null,dimension?:string|null,nivel?:string|null,buscar?:string|null} $filtros
     * @return list<array<string,mixed>>
     */
    public function listar(array $filtros, int $limit, int $offset): array
    {
        [$where, $params] = $this->construirWhere($filtros);

        $sql = 'SELECT c.id,
                       c.tipo_control,
                       c.nombre_control,
                       c.detalle,
                       c.integridad,
                       c.disponibilidad,
                       c.confidencialidad,
                       COALESCE(
                           JSON_AGG(JSON_BUILD_OBJECT(\'id\', n.id, \'nombre\', n.nombre) ORDER BY n.nombre)
                           FILTER (WHERE n.id IS NOT NULL),
                           \'[]\'
                       ) AS normas
                  FROM Controles c
                  LEFT JOIN Controles_Normas cn ON cn.control_id = c.id
                  LEFT JOIN Normas n ON n.id = cn.norma_id'
            . $where
            . ' GROUP BY c.id
                ORDER BY c.nombre_control
                LIMIT :limit OFFSET :offset';

        $params['limit']  = $limit;
        $params['offset'] = $offset;

        return array_map([$this, 'hidratar'], $this->run($sql, $params)->fetchAll());
    }

    /** @param array<string,mixed> $filtros */
    public function contar(array $filtros): int
    {
        [$where, $params] = $this->construirWhere($filtros);

        $sql = 'SELECT COUNT(DISTINCT c.id)
                  FROM Controles c
                  LEFT JOIN Controles_Normas cn ON cn.control_id = c.id
                  LEFT JOIN Normas n ON n.id = cn.norma_id' . $where;

        return (int) $this->run($sql, $params)->fetchColumn();
    }

    /**
     * @param array<string,mixed> $filtros
     * @return array{0:string,1:array<string,mixed>}
     */
    private function construirWhere(array $filtros): array
    {
        $condiciones = [];
        $params      = [];

        if (!empty($filtros['norma_id'])) {
            // EXISTS y no un JOIN filtrado, para que el control siga mostrando todas sus normas.
            $condiciones[] = 'EXISTS (SELECT 1 FROM Controles_Normas x
                                       WHERE x.control_id = c.id AND x.norma_id = :norma_id)';
            $params['norma_id'] = (int) $filtros['norma_id'];
        }

        if (!empty($filtros['tipo'])) {
            $condiciones[]  = 'c.tipo_control ILIKE :tipo';
            $params['tipo'] = (string) $filtros['tipo'];
        }

        if (!empty($filtros['buscar'])) {
            // Un solo placeholder: PDO con prepares nativas no admite repetir :buscar
            // dos veces en la misma consulta.
            $condiciones[]    = "(c.nombre_control || ' ' || COALESCE(c.detalle, '')) ILIKE :buscar";
            $params['buscar'] = '%' . $filtros['buscar'] . '%';
        }

        if (!empty($filtros['dimension'])) {
            $dimension = strtolower((string) $filtros['dimension']);
            if (!in_array($dimension, self::DIMENSIONES, true)) {
                throw HttpException::validacion([
                    'dimension' => 'Valor no permitido. Use: ' . implode(', ', self::DIMENSIONES) . '.',
                ]);
            }

            // Sin nivel explicito se interpreta "el control aplica a esta dimension".
            if (!empty($filtros['nivel'])) {
                $condiciones[]   = sprintf('c.%s = CAST(:nivel AS nivel_control)', $dimension);
                $params['nivel'] = (string) $filtros['nivel'];
            } else {
                $condiciones[] = sprintf("c.%s <> 'N-A'", $dimension);
            }
        }

        $where = $condiciones === [] ? '' : ' WHERE ' . implode(' AND ', $condiciones);
        return [$where, $params];
    }

    /** @return array<string,mixed> */
    public function buscarPorId(int $id): array
    {
        $fila = $this->run(
            'SELECT c.id,
                    c.tipo_control,
                    c.nombre_control,
                    c.detalle,
                    c.integridad,
                    c.disponibilidad,
                    c.confidencialidad,
                    COALESCE(
                        JSON_AGG(JSON_BUILD_OBJECT(\'id\', n.id, \'nombre\', n.nombre) ORDER BY n.nombre)
                        FILTER (WHERE n.id IS NOT NULL),
                        \'[]\'
                    ) AS normas
               FROM Controles c
               LEFT JOIN Controles_Normas cn ON cn.control_id = c.id
               LEFT JOIN Normas n ON n.id = cn.norma_id
              WHERE c.id = :id
              GROUP BY c.id',
            ['id' => $id]
        )->fetch();

        if ($fila === false) {
            throw HttpException::notFound('el control', $id);
        }

        return $this->hidratar($fila);
    }

    /**
     * HU-005: crea el control y sus vinculos a normas en un solo paso.
     * Si una norma no existe, la transaccion completa se revierte.
     *
     * @param array{tipo_control:string,nombre_control:string,detalle:?string,integridad:string,disponibilidad:string,confidencialidad:string} $datos
     * @param list<int> $normaIds
     * @return array<string,mixed>
     */
    public function crear(array $datos, array $normaIds): array
    {
        return Database::transaction(function (PDO $pdo) use ($datos, $normaIds): array {
            $id = (int) $this->run(
                'INSERT INTO Controles
                     (tipo_control, nombre_control, detalle, integridad, disponibilidad, confidencialidad)
                 VALUES
                     (:tipo_control,
                      :nombre_control,
                      :detalle,
                      CAST(:integridad AS nivel_control),
                      CAST(:disponibilidad AS nivel_control),
                      CAST(:confidencialidad AS nivel_control))
                 RETURNING id',
                $datos
            )->fetchColumn();

            $this->vincularNormas($id, $normaIds);

            return $this->buscarPorId($id);
        });
    }

    /**
     * HU-010. Actualizacion parcial: solo se tocan los campos enviados.
     * Las respuestas ya registradas en Respuestas_Controles no se modifican.
     *
     * @param array<string,mixed> $campos
     * @param list<int>|null $normaIds null = no cambiar los vinculos
     * @return array<string,mixed>
     */
    public function actualizar(int $id, array $campos, ?array $normaIds): array
    {
        $this->assertExists('Controles', $id, 'el control');

        return Database::transaction(function (PDO $pdo) use ($id, $campos, $normaIds): array {
            if ($campos !== []) {
                $asignaciones = [];
                foreach (array_keys($campos) as $columna) {
                    $asignaciones[] = in_array($columna, self::DIMENSIONES, true)
                        ? sprintf('%s = CAST(:%s AS nivel_control)', $columna, $columna)
                        : sprintf('%s = :%s', $columna, $columna);
                }

                $this->run(
                    'UPDATE Controles SET ' . implode(', ', $asignaciones) . ' WHERE id = :id',
                    $campos + ['id' => $id]
                );
            }

            if ($normaIds !== null) {
                $this->run('DELETE FROM Controles_Normas WHERE control_id = :id', ['id' => $id]);
                $this->vincularNormas($id, $normaIds);
            }

            return $this->buscarPorId($id);
        });
    }

    /** @param list<int> $normaIds */
    private function vincularNormas(int $controlId, array $normaIds): void
    {
        foreach ($normaIds as $normaId) {
            $existe = $this->run('SELECT 1 FROM Normas WHERE id = :id', ['id' => $normaId])->fetchColumn();
            if ($existe === false) {
                throw HttpException::validacion([
                    'normas' => sprintf('La norma con id %d no existe.', $normaId),
                ]);
            }

            $this->run(
                'INSERT INTO Controles_Normas (control_id, norma_id)
                 VALUES (:control_id, :norma_id)
                 ON CONFLICT (control_id, norma_id) DO NOTHING',
                ['control_id' => $controlId, 'norma_id' => $normaId]
            );
        }
    }

    /**
     * Solo se permite borrar un control que nunca haya sido respondido, para no
     * romper el historial. El borrado logico de HU-011 requiere columna "activo".
     */
    public function eliminar(int $id): void
    {
        $this->assertExists('Controles', $id, 'el control');

        $usos = (int) $this->run(
            'SELECT COUNT(*) FROM Respuestas_Controles WHERE control_id = :id',
            ['id' => $id]
        )->fetchColumn();

        if ($usos > 0) {
            throw HttpException::conflicto(sprintf(
                'El control tiene %d respuesta(s) en cuestionarios y no puede eliminarse sin perder historial. '
                . 'Para retirarlo del catalogo se necesita la columna "activo" (ver docs/GAPS.md).',
                $usos
            ));
        }

        Database::transaction(function (PDO $pdo) use ($id): void {
            $this->run('DELETE FROM Controles_Normas WHERE control_id = :id', ['id' => $id]);
            $this->run('DELETE FROM Controles WHERE id = :id', ['id' => $id]);
        });
    }

    /** @return list<string> */
    public function tiposDeControl(): array
    {
        return array_map(
            static fn(array $f): string => (string) $f['tipo_control'],
            $this->run('SELECT DISTINCT tipo_control FROM Controles ORDER BY tipo_control')->fetchAll()
        );
    }

    /**
     * @param array<string,mixed> $fila
     * @return array<string,mixed>
     */
    private function hidratar(array $fila): array
    {
        $fila['id']     = (int) $fila['id'];
        $fila['normas'] = json_decode((string) $fila['normas'], true) ?: [];
        foreach ($fila['normas'] as $i => $norma) {
            $fila['normas'][$i]['id'] = (int) $norma['id'];
        }
        return $fila;
    }
}