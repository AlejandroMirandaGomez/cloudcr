<?php

declare(strict_types=1);

/**
 * Front controller unico del API. Todas las peticiones entran por aqui.
 */

require __DIR__ . '/../app/Core/Bootstrap.php';

use CloudCR\Core\Config;
use CloudCR\Core\HttpException;
use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Router;

header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: ' . Config::get('CORS_ORIGIN', '*'));
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// El navegador manda un preflight antes de un PUT/DELETE con JSON.
if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    /** @var Router $router */
    $router = require __DIR__ . '/../routes/routes.php';
    $router->dispatch(new Request());
} catch (HttpException $e) {
    Response::error($e->status(), $e->getMessage(), $e->details());
} catch (Throwable $e) {
    error_log(sprintf('[cloud-cr] %s: %s en %s:%d', $e::class, $e->getMessage(), $e->getFile(), $e->getLine()));

    Response::error(
        500,
        'Error interno del servidor.',
        Config::isDebug()
            ? ['detalle' => $e->getMessage(), 'archivo' => $e->getFile(), 'linea' => $e->getLine()]
            : []
    );
}