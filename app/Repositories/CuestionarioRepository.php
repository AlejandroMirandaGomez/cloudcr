<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\HttpException;

/** HU-006, HU-016, HU-017. Tabla Cuestionarios_Control_Interno. */
final class CuestionarioRepository extends BaseRepository
{
    /**
     * HU-016: historial de cuestionarios, filtrable por organizacion, evaluador y rango de fechas.
     *
     * @param array{organizacion_id?:int|null,evaluador_id?:int|null,desde?:string|null,hasta?:string|null} $filtros
     * @return list<array<string,mixed>>
     */
    public function listar(array $filtros, int $limit, int $offset): array
    {
        [$where, $params] = $this->construirWhere($filtros);

        $sql = 'SELECT c.id,
                       c.fecha,
                       o.id     AS organizacion_id,
                       o.nombre AS organizacion,
                       e.id     AS evaluador_id,
                       e.nombre AS evaluador,
                       COUNT(rc.id) AS respuestas_registradas,
                       (SELECT COUNT(*) FROM Controles) AS controles_en_catalogo
                  FROM Cuestionarios_Control_Interno c
                  JOIN Organizaciones o ON o.id = c.organizacion_id
                  JOIN Evaluadores  e ON e.id = c.evaluador_id
                  LEFT JOIN Respuestas_Controles rc ON rc.cuestionario_id = c.id'
            . $where
            . ' GROUP BY c.id, c.fecha, o.id, o.nombre, e.id, e.nombre
                ORDER BY c.fecha DESC, c.id DESC
                LIMIT :limit OFFSET :offset';

        $params['limit']  = $limit;
        $params['offset'] = $offset;

        return array_map([$this, 'hidratar'], $this->run($sql, $params)->fetchAll());
    }

    /** @param array<string,mixed> $filtros */
    public function contar(array $filtros): int
    {
        [$where, $params] = $this->construirWhere($filtros);
        $sql = 'SELECT COUNT(*) FROM Cuestionarios_Control_Interno c' . $where;
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

        if (!empty($filtros['organizacion_id'])) {
            $condiciones[]             = 'c.organizacion_id = :organizacion_id';
            $params['organizacion_id'] = (int) $filtros['organizacion_id'];
        }
        if (!empty($filtros['evaluador_id'])) {
            $condiciones[]          = 'c.evaluador_id = :evaluador_id';
            $params['evaluador_id'] = (int) $filtros['evaluador_id'];
        }
        if (!empty($filtros['desde'])) {
            $condiciones[]   = 'c.fecha >= CAST(:desde AS date)';
            $params['desde'] = (string) $filtros['desde'];
        }
        if (!empty($filtros['hasta'])) {
            $condiciones[]   = 'c.fecha <= CAST(:hasta AS date)';
            $params['hasta'] = (string) $filtros['hasta'];
        }

        $where = $condiciones === [] ? '' : ' WHERE ' . implode(' AND ', $condiciones);
        return [$where, $params];
    }

    /** @return array<string,mixed> */
    public function buscarPorId(int $id): array
    {
        $fila = $this->run(
            'SELECT c.id,
                    c.fecha,
                    o.id     AS organizacion_id,
                    o.nombre AS organizacion,
                    e.id     AS evaluador_id,
                    e.nombre AS evaluador,
                    (SELECT COUNT(*) FROM Respuestas_Controles r WHERE r.cuestionario_id = c.id)
                        AS respuestas_registradas,
                    (SELECT COUNT(*) FROM Controles) AS controles_en_catalogo
               FROM Cuestionarios_Control_Interno c
               JOIN Organizaciones o ON o.id = c.organizacion_id
               JOIN Evaluadores  e ON e.id = c.evaluador_id
              WHERE c.id = :id',
            ['id' => $id]
        )->fetch();

        if ($fila === false) {
            throw HttpException::notFound('el cuestionario', $id);
        }

        return $this->hidratar($fila);
    }

    /**
     * HU-017: detalle completo con todas las respuestas registradas.
     *
     * @return array<string,mixed>
     */
    public function detalle(int $id): array
    {
        $cuestionario = $this->buscarPorId($id);

        $cuestionario['respuestas'] = array_map(
            static function (array $f): array {
                $f['id']         = (int) $f['id'];
                $f['control_id'] = (int) $f['control_id'];
                return $f;
            },
            $this->run(
                'SELECT rc.id,
                        ct.id  AS control_id,
                        ct.tipo_control,
                        ct.nombre_control,
                        ct.detalle,
                        ct.integridad,
                        ct.disponibilidad,
                        ct.confidencialidad,
                        rc.respuesta,
                        rc.documentado,
                        rc.repetible,
                        rc.evidencia
                   FROM Respuestas_Controles rc
                   JOIN Controles ct ON ct.id = rc.control_id
                  WHERE rc.cuestionario_id = :id
                  ORDER BY ct.tipo_control, ct.nombre_control',
                ['id' => $id]
            )->fetchAll()
        );

        return $cuestionario;
    }

    /**
     * HU-006. El evaluador viene del cuerpo porque el login (HU-007) es
     * implementacion futura; cuando exista, se toma de la sesion activa.
     *
     * @return array<string,mixed>
     */
    public function crear(int $organizacionId, int $evaluadorId, string $fecha): array
    {
        $this->assertExists('Organizaciones', $organizacionId, 'la organizacion');
        $this->assertExists('Evaluadores', $evaluadorId, 'el evaluador');

        $id = (int) $this->run(
            'INSERT INTO Cuestionarios_Control_Interno (organizacion_id, evaluador_id, fecha)
             VALUES (:organizacion_id, :evaluador_id, CAST(:fecha AS date))
             RETURNING id',
            [
                'organizacion_id' => $organizacionId,
                'evaluador_id'    => $evaluadorId,
                'fecha'           => $fecha,
            ]
        )->fetchColumn();

        return $this->buscarPorId($id);
    }

    /** @param array<string,mixed> $campos */
    public function actualizar(int $id, array $campos): array
    {
        $this->assertExists('Cuestionarios_Control_Interno', $id, 'el cuestionario');

        if (isset($campos['organizacion_id'])) {
            $this->assertExists('Organizaciones', (int) $campos['organizacion_id'], 'la organizacion');
        }
        if (isset($campos['evaluador_id'])) {
            $this->assertExists('Evaluadores', (int) $campos['evaluador_id'], 'el evaluador');
        }

        if ($campos !== []) {
            $asignaciones = [];
            foreach (array_keys($campos) as $columna) {
                $asignaciones[] = $columna === 'fecha'
                    ? 'fecha = CAST(:fecha AS date)'
                    : sprintf('%s = :%s', $columna, $columna);
            }

            $this->run(
                'UPDATE Cuestionarios_Control_Interno SET ' . implode(', ', $asignaciones) . ' WHERE id = :id',
                $campos + ['id' => $id]
            );
        }

        return $this->buscarPorId($id);
    }

    public function eliminar(int $id): void
    {
        $this->assertExists('Cuestionarios_Control_Interno', $id, 'el cuestionario');

        \CloudCR\Core\Database::transaction(function () use ($id): void {
            $this->run('DELETE FROM Respuestas_Controles WHERE cuestionario_id = :id', ['id' => $id]);
            $this->run('DELETE FROM Cuestionarios_Control_Interno WHERE id = :id', ['id' => $id]);
        });
    }

    /**
     * @param array<string,mixed> $fila
     * @return array<string,mixed>
     */
    private function hidratar(array $fila): array
    {
        $fila['id']                     = (int) $fila['id'];
        $fila['organizacion_id']        = (int) $fila['organizacion_id'];
        $fila['evaluador_id']           = (int) $fila['evaluador_id'];
        $fila['respuestas_registradas'] = (int) $fila['respuestas_registradas'];
        $fila['controles_en_catalogo']  = (int) $fila['controles_en_catalogo'];

        // El esquema no tiene columna "estado" (ver docs/GAPS.md), asi que el avance
        // se expone como conteo y no como estado persistido.
        $fila['avance'] = $fila['controles_en_catalogo'] > 0
            ? round($fila['respuestas_registradas'] / $fila['controles_en_catalogo'], 4)
            : 0.0;

        return $fila;
    }
}