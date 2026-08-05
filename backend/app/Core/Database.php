<?php

declare(strict_types=1);

namespace CloudCR\Core;

use PDO;
use PDOException;

/**
 * Conexion unica (lazy) a PostgreSQL mediante PDO.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        if (!in_array('pgsql', PDO::getAvailableDrivers(), true)) {
            throw new HttpException(
                500,
                'El driver pdo_pgsql no esta habilitado en PHP.',
                ['ayuda' => 'Descomentar extension=pdo_pgsql en php.ini y reiniciar Apache.']
            );
        }

        $cfg = Config::db();
        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;options=--client_encoding=UTF8',
            $cfg['host'],
            $cfg['port'],
            $cfg['name']
        );

        try {
            self::$pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_STRINGIFY_FETCHES  => false,
            ]);
        } catch (PDOException $e) {
            file_put_contents(__DIR__ . '/../../../error.log', $e->getMessage() . PHP_EOL, FILE_APPEND);
            throw new HttpException(
                503,
                'No se pudo conectar a la base de datos.',
                Config::isDebug() ? ['detalle' => $e->getMessage()] : []
            );
        }

        return self::$pdo;
    }

    /**
     * Ejecuta $fn dentro de una transaccion. Hace rollback ante cualquier excepcion.
     *
     * @template T
     * @param callable(PDO):T $fn
     * @return T
     */
    public static function transaction(callable $fn): mixed
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $result = $fn($pdo);
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}