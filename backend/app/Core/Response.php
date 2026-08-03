<?php

declare(strict_types=1);

namespace CloudCR\Core;

/**
 * Salida JSON. Toda respuesta del API pasa por aqui.
 */
final class Response
{
    private const FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, self::FLAGS);
    }

    public static function ok(mixed $data, array $meta = []): void
    {
        $payload = ['data' => $data];
        if ($meta !== []) {
            $payload['meta'] = $meta;
        }
        self::json($payload, 200);
    }

    /** 201 con cabecera Location, como corresponde a un POST que crea un recurso. */
    public static function created(mixed $data, string $location): void
    {
        header('Location: ' . $location);
        self::json(['data' => $data], 201);
    }

    public static function noContent(): void
    {
        http_response_code(204);
    }

    /** @param array<string,mixed> $details */
    public static function error(int $status, string $message, array $details = []): void
    {
        $payload = ['error' => ['status' => $status, 'mensaje' => $message]];
        if ($details !== []) {
            $payload['error'] += $details;
        }
        self::json($payload, $status);
    }
}