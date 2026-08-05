<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\Database;
use CloudCR\Core\HttpException;

final class ControlRepository extends BaseRepository
{
    private const DIMENSIONES = ['integridad', 'disponibilidad', 'confidencialidad'];

    private const ATRIBUTOS = [
        'tipos'              => ['Controles_Tipos', 'tipo_id', 'Tipos_Control'],
        'conceptos'          => ['Controles_Conceptos', 'concepto_id', 'Conceptos_Ciberseguridad'],
        'dominios_seguridad' => ['Controles_Dominios_Seguridad', 'dominio_seguridad_id', 'Dominios_Seguridad'],
        'capacidades'        => ['Controles_Capacidades', 'capacidad_id', 'Capacidades_Operativas'],
    ];

    private const COLUMNAS = [
        'norma_id', 'dominio_norma_id', 'codigo', 'nombre', 'proposito', 'descripcion',
        'peso', 'confidencialidad', 'integridad', 'disponibilidad', 'guia', 'otra_informacion',
    ];

    public function listar(array $filtros, int $limit, int $offset): array
    {
        [$where, $params] = $this->construirWhere($filtros);

        $params['limit']  = $limit;
        $params['offset'] = $offset;

        return array_map(
            [$this, 'hidratar'],
            $this->run(
                $this->seleccion() . $where
                . ' ORDER BY dn.clausula, LENGTH(c.codigo), c.codigo
                    LIMIT :limit OFFSET :offset',
                $params
            )->fetchAll()
        );
    }

    public function contar(array $filtros): int
    {
        [$where, $params] = $this->construirWhere($filtros);

        return (int) $this->run(
            'SELECT COUNT(*)
               FROM Controles c
               JOIN Normas n ON n.id = c.norma_id
               JOIN Dominios_Norma dn ON dn.id = c.dominio_norma_id' . $where,
            $params
        )->fetchColumn();
    }

    public function buscarPorId(int $id): array
    {
        $fila = $this->run($this->seleccion() . ' WHERE c.id = :id', ['id' => $id])->fetch();

        if ($fila === false) {
            throw HttpException::notFound('el control', $id);
        }

        return $this->hidratar($fila);
    }

    public function crear(array $datos, array $atributos, ?array $preguntas): array
    {
        return Database::transaction(function () use ($datos, $atributos, $preguntas): array {
            $columnas   = implode(', ', self::COLUMNAS);
            $marcadores = implode(', ', array_map([$this, 'marcador'], self::COLUMNAS));

            $id = (int) $this->run(
                "INSERT INTO Controles ($columnas) VALUES ($marcadores) RETURNING id",
                $datos
            )->fetchColumn();

            $this->reemplazarAtributos($id, $atributos);
            $this->sincronizarPreguntas($id, $preguntas);

            return $this->buscarPorId($id);
        });
    }

    public function actualizar(int $id, array $campos, array $atributos, ?array $preguntas): array
    {
        $this->assertExists('Controles', $id, 'el control');

        return Database::transaction(function () use ($id, $campos, $atributos, $preguntas): array {
            if ($campos !== []) {
                $asignaciones = [];
                foreach (array_keys($campos) as $columna) {
                    $asignaciones[] = $columna . ' = ' . $this->marcador($columna);
                }

                $this->run(
                    'UPDATE Controles SET ' . implode(', ', $asignaciones) . ' WHERE id = :id',
                    $campos + ['id' => $id]
                );
            }

            $this->reemplazarAtributos($id, $atributos);
            $this->sincronizarPreguntas($id, $preguntas);

            return $this->buscarPorId($id);
        });
    }

    public function eliminar(int $id): void
    {
        $this->assertExists('Controles', $id, 'el control');

        $usos = (int) $this->run(
            'SELECT COUNT(*)
               FROM Respuestas r
               JOIN Preguntas p ON p.id = r.pregunta_id
              WHERE p.control_id = :id',
            ['id' => $id]
        )->fetchColumn();

        if ($usos > 0) {
            throw HttpException::conflicto(sprintf(
                'El control tiene %d respuesta(s) registradas en cuestionarios y no puede eliminarse sin perder historial.',
                $usos
            ));
        }

        $this->run('DELETE FROM Controles WHERE id = :id', ['id' => $id]);
    }

    private function seleccion(): string
    {
        $agregados = [];
        foreach (self::ATRIBUTOS as $clave => [$puente, $columna, $catalogo]) {
            $agregados[] = sprintf(
                "COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id', x.id, 'nombre', x.nombre) ORDER BY x.id)
                             FROM %s pu JOIN %s x ON x.id = pu.%s
                            WHERE pu.control_id = c.id), '[]') AS %s",
                $puente,
                $catalogo,
                $columna,
                $clave
            );
        }

        return 'SELECT c.id,
                       c.codigo,
                       c.nombre,
                       c.proposito,
                       c.descripcion,
                       c.peso,
                       c.confidencialidad,
                       c.integridad,
                       c.disponibilidad,
                       c.guia,
                       c.otra_informacion,
                       c.norma_id,
                       n.nombre AS norma,
                       c.dominio_norma_id,
                       dn.clausula,
                       dn.nombre AS dominio_norma,
                       ' . implode(",\n                       ", $agregados) . ",
                       COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id', p.id, 'orden', p.orden, 'texto', p.texto)
                                                 ORDER BY p.orden)
                                   FROM Preguntas p
                                  WHERE p.control_id = c.id), '[]') AS preguntas
                  FROM Controles c
                  JOIN Normas n ON n.id = c.norma_id
                  JOIN Dominios_Norma dn ON dn.id = c.dominio_norma_id";
    }

    private function construirWhere(array $filtros): array
    {
        $condiciones = [];
        $params      = [];

        if (!empty($filtros['norma_id'])) {
            $condiciones[]      = 'c.norma_id = :norma_id';
            $params['norma_id'] = (int) $filtros['norma_id'];
        }

        if (!empty($filtros['dominio_norma_id'])) {
            $condiciones[]              = 'c.dominio_norma_id = :dominio_norma_id';
            $params['dominio_norma_id'] = (int) $filtros['dominio_norma_id'];
        }

        if (!empty($filtros['tipo'])) {
            $condiciones[]  = 'EXISTS (SELECT 1
                                         FROM Controles_Tipos ct
                                         JOIN Tipos_Control t ON t.id = ct.tipo_id
                                        WHERE ct.control_id = c.id AND t.nombre ILIKE :tipo)';
            $params['tipo'] = (string) $filtros['tipo'];
        }

        if (!empty($filtros['buscar'])) {
            $condiciones[]    = "(c.codigo || ' ' || c.nombre || ' ' || c.descripcion || ' ' || c.proposito) ILIKE :buscar";
            $params['buscar'] = '%' . $filtros['buscar'] . '%';
        }

        if (!empty($filtros['dimension'])) {
            $dimension = strtolower((string) $filtros['dimension']);
            if (!in_array($dimension, self::DIMENSIONES, true)) {
                throw HttpException::validacion([
                    'dimension' => 'Valor no permitido. Use: ' . implode(', ', self::DIMENSIONES) . '.',
                ]);
            }

            if (!empty($filtros['nivel'])) {
                $condiciones[]   = sprintf('c.%s = CAST(:nivel AS nivel_relacion)', $dimension);
                $params['nivel'] = (string) $filtros['nivel'];
            } else {
                $condiciones[] = sprintf('c.%s IS NOT NULL', $dimension);
            }
        }

        $where = $condiciones === [] ? '' : ' WHERE ' . implode(' AND ', $condiciones);
        return [$where, $params];
    }

    private function marcador(string $columna): string
    {
        return in_array($columna, self::DIMENSIONES, true)
            ? sprintf('CAST(:%s AS nivel_relacion)', $columna)
            : ':' . $columna;
    }

    private function reemplazarAtributos(int $controlId, array $atributos): void
    {
        foreach (self::ATRIBUTOS as $clave => [$puente, $columna, $catalogo]) {
            $ids = $atributos[$clave] ?? null;
            if ($ids === null) {
                continue;
            }

            $this->run("DELETE FROM $puente WHERE control_id = :id", ['id' => $controlId]);

            foreach ($ids as $valorId) {
                $existe = $this->run("SELECT 1 FROM $catalogo WHERE id = :id", ['id' => $valorId])->fetchColumn();
                if ($existe === false) {
                    throw HttpException::validacion([
                        $clave => sprintf('El id %d no existe en el catalogo.', $valorId),
                    ]);
                }

                $this->run(
                    "INSERT INTO $puente (control_id, $columna) VALUES (:control_id, :valor_id)",
                    ['control_id' => $controlId, 'valor_id' => $valorId]
                );
            }
        }
    }

    private function sincronizarPreguntas(int $controlId, ?array $textos): void
    {
        if ($textos === null) {
            return;
        }

        $porOrden = [];
        foreach ($this->run('SELECT id, orden FROM Preguntas WHERE control_id = :id', ['id' => $controlId])->fetchAll() as $p) {
            $porOrden[(int) $p['orden']] = (int) $p['id'];
        }

        foreach ($textos as $i => $texto) {
            $orden = $i + 1;

            if (isset($porOrden[$orden])) {
                $this->run(
                    'UPDATE Preguntas SET texto = :texto WHERE id = :id',
                    ['texto' => $texto, 'id' => $porOrden[$orden]]
                );
                continue;
            }

            $this->run(
                'INSERT INTO Preguntas (control_id, orden, texto) VALUES (:control_id, :orden, :texto)',
                ['control_id' => $controlId, 'orden' => $orden, 'texto' => $texto]
            );
        }

        foreach ($porOrden as $orden => $preguntaId) {
            if ($orden <= count($textos)) {
                continue;
            }

            $usos = (int) $this->run(
                'SELECT COUNT(*) FROM Respuestas WHERE pregunta_id = :id',
                ['id' => $preguntaId]
            )->fetchColumn();

            if ($usos > 0) {
                throw HttpException::conflicto(sprintf(
                    'La pregunta %d del control ya tiene %d respuesta(s) y no puede eliminarse sin perder historial.',
                    $orden,
                    $usos
                ));
            }

            $this->run('DELETE FROM Preguntas WHERE id = :id', ['id' => $preguntaId]);
        }
    }

    private function hidratar(array $fila): array
    {
        $fila['id']               = (int) $fila['id'];
        $fila['peso']             = (int) $fila['peso'];
        $fila['norma_id']         = (int) $fila['norma_id'];
        $fila['dominio_norma_id'] = (int) $fila['dominio_norma_id'];
        $fila['clausula']         = (int) $fila['clausula'];

        foreach (array_keys(self::ATRIBUTOS) as $clave) {
            $fila[$clave] = array_map(
                static function (array $x): array {
                    $x['id'] = (int) $x['id'];
                    return $x;
                },
                json_decode((string) $fila[$clave], true) ?: []
            );
        }

        $fila['preguntas'] = array_map(
            static function (array $p): array {
                $p['id']    = (int) $p['id'];
                $p['orden'] = (int) $p['orden'];
                return $p;
            },
            json_decode((string) $fila['preguntas'], true) ?: []
        );

        return $fila;
    }
}
