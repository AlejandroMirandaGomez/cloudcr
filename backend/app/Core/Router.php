<?php

declare(strict_types=1);

namespace CloudCR\Core;

/**
 * Router minimo. Soporta parametros {id} y los pasa al handler ya convertidos a int
 * cuando son numericos.
 */
final class Router
{
    /** @var list<array{method:string,regex:string,params:list<string>,handler:callable}> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    private function add(string $method, string $path, callable $handler): void
    {
        $params = [];
        $regex = preg_replace_callback(
            '#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#',
            static function (array $m) use (&$params): string {
                $params[] = $m[1];
                return '([^/]+)';
            },
            $path
        );

        $this->routes[] = [
            'method'  => $method,
            'regex'   => '#^' . $regex . '$#',
            'params'  => $params,
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): void
    {
        $path   = $request->path();
        $method = $request->method();
        $pathMatchedOtherMethod = [];

        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $path, $matches) !== 1) {
                continue;
            }
            array_shift($matches);

            // Un parametro llamado id / algoId / algo_id debe ser numerico; si no,
            // la ruta no aplica (evita un TypeError con /cuestionarios/abc).
            $valido = true;
            foreach ($route['params'] as $i => $nombre) {
                $esId = $nombre === 'id'
                    || str_ends_with($nombre, 'Id')
                    || str_ends_with($nombre, '_id');

                if ($esId && !ctype_digit($matches[$i])) {
                    $valido = false;
                    break;
                }
            }
            if (!$valido) {
                continue;
            }

            if ($route['method'] !== $method) {
                $pathMatchedOtherMethod[] = $route['method'];
                continue;
            }

            $args = array_map(
                static fn(string $v): int|string => ctype_digit($v) ? (int) $v : urldecode($v),
                $matches
            );

            ($route['handler'])($request, ...$args);
            return;
        }

        if ($pathMatchedOtherMethod !== []) {
            $allow = implode(', ', array_unique($pathMatchedOtherMethod));
            header('Allow: ' . $allow);
            throw new HttpException(405, sprintf('El metodo %s no aplica a esta ruta.', $method), ['permitidos' => $allow]);
        }

        throw new HttpException(404, sprintf('La ruta %s no existe.', $path));
    }
}