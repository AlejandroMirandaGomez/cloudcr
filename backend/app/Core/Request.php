<?php

declare(strict_types=1);

namespace CloudCR\Core;

/**
 * Acceso a la peticion entrante: metodo, ruta, query string y cuerpo JSON.
 */
final class Request
{
    /** @var array<string,mixed> */
    private array $body;

    public function __construct()
    {
        $this->body = $this->parseBody();
    }

    public function method(): string
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        // Permite ?_method=PUT para clientes que no envian verbos completos.
        $override = strtoupper((string) ($_GET['_method'] ?? ''));
        if ($method === 'POST' && in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) {
            return $override;
        }
        return $method;
    }

    public function path(): string
    {
        $uri  = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';

        // Quita el subdirectorio donde este montado el proyecto
        // (ej. /cloud-cr/public/index.php/organizaciones -> /organizaciones).
        $script = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
        $base   = rtrim(str_replace('\\', '/', dirname($script)), '/');

        if ($base !== '' && str_starts_with($path, $base)) {
            $path = substr($path, strlen($base));
        }
        if (str_starts_with($path, '/index.php')) {
            $path = substr($path, strlen('/index.php'));
        }

        $path = '/' . trim($path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    }

    /** @return array<string,mixed> */
    public function body(): array
    {
        return $this->body;
    }

    public function query(string $key, ?string $default = null): ?string
    {
        $value = $_GET[$key] ?? null;
        if ($value === null || !is_string($value) || trim($value) === '') {
            return $default;
        }
        return trim($value);
    }

    /** @return array<string,mixed> */
    private function parseBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));

        if (str_contains($contentType, 'application/x-www-form-urlencoded')) {
            $parsed = [];
            parse_str($raw, $parsed);
            return $parsed;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new HttpException(400, 'El cuerpo de la peticion no es un JSON valido.');
        }
        return $decoded;
    }
}