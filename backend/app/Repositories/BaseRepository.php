<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\Database;
use CloudCR\Core\HttpException;
use PDO;
use PDOException;
use PDOStatement;

abstract class BaseRepository
{
    protected function pdo(): PDO
    {
        return Database::pdo();
    }

    /**
     * Ejecuta una consulta preparada y traduce los errores de PostgreSQL a
     * codigos HTTP con sentido para el frontend.
     *
     * @param array<string,mixed> $params
     */
    protected function run(string $sql, array $params = []): PDOStatement
    {
        try {
            $stmt = $this->pdo()->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw $this->translate($e);
        }
    }

    private function translate(PDOException $e): HttpException
    {
        $sqlState = $e->errorInfo[0] ?? $e->getCode();
        $mensaje  = $e->getMessage();

        return match ($sqlState) {
            // unique_violation
            '23505' => HttpException::conflicto($this->mensajeDuplicado($mensaje)),
            // foreign_key_violation
            '23503' => new HttpException(
                422,
                'Se referencia un registro que no existe, o el registro esta en uso por otras tablas.',
                ['errores' => ['referencia' => $this->extraerRestriccion($mensaje)]]
            ),
            // not_null_violation
            '23502' => new HttpException(422, 'Falta un campo obligatorio.'),
            // invalid_text_representation (ej. valor fuera del ENUM)
            '22P02' => new HttpException(422, 'Un valor no corresponde al tipo esperado por la base de datos.'),
            // undefined_table
            '42P01' => new HttpException(
                500,
                'La tabla consultada no existe. Ejecute Script_V2.sql en la base de datos.'
            ),
            default => new HttpException(
                500,
                'Error al ejecutar la operacion en la base de datos.',
                \CloudCR\Core\Config::isDebug() ? ['detalle' => $mensaje] : []
            ),
        };
    }

    private function mensajeDuplicado(string $mensaje): string
    {
        $restriccion = $this->extraerRestriccion($mensaje);

        return match (true) {
            str_contains($restriccion, 'organizaciones_nombre') => 'Ya existe una organizacion con ese nombre.',
            str_contains($restriccion, 'organizaciones_correo') => 'Ya existe una organizacion con ese correo.',
            str_contains($restriccion, 'evaluadores_correo')    => 'Ya existe un evaluador con ese correo.',
            str_contains($restriccion, 'normas_nombre')         => 'Ya existe una norma con ese nombre.',
            str_contains($restriccion, 'nombre_control')        => 'Ya existe un control con ese nombre.',
            str_contains($restriccion, 'controles_normas')      => 'Ese control ya esta vinculado a esa norma.',
            str_contains($restriccion, 'respuestas_controles')  => 'Ese control ya tiene respuesta en este cuestionario.',
            default                                            => 'El registro ya existe (violacion de unicidad).',
        };
    }

    private function extraerRestriccion(string $mensaje): string
    {
        if (preg_match('/"([^"]+)"/', $mensaje, $m) === 1) {
            return $m[1];
        }
        return 'desconocida';
    }

    /** Verifica existencia antes de insertar/actualizar, para devolver 404 en vez de 500. */
    protected function assertExists(string $tabla, int $id, string $recurso): void
    {
        $permitidas = [
            'Organizaciones',
            'Evaluadores',
            'Normas',
            'Controles',
            'Cuestionarios_Control_Interno',
        ];
        if (!in_array($tabla, $permitidas, true)) {
            throw new HttpException(500, 'Tabla no permitida en la verificacion de existencia.');
        }

        $stmt = $this->run("SELECT 1 FROM {$tabla} WHERE id = :id", ['id' => $id]);
        if ($stmt->fetchColumn() === false) {
            throw HttpException::notFound($recurso, $id);
        }
    }

    /** @return array{limit:int,offset:int} */
    protected function paginacion(?string $limit, ?string $offset): array
    {
        $limit  = $limit === null ? 50 : (int) $limit;
        $offset = $offset === null ? 0 : (int) $offset;

        return [
            'limit'  => max(1, min($limit, 200)),
            'offset' => max(0, $offset),
        ];
    }
}