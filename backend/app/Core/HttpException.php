<?php

declare(strict_types=1);

namespace CloudCR\Core;

use RuntimeException;

/**
 * Excepcion que el front controller traduce a una respuesta JSON con codigo HTTP.
 */
class HttpException extends RuntimeException
{
    /** @param array<string,mixed> $details */
    public function __construct(
        private int $status,
        string $message,
        private array $details = []
    ) {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }

    /** @return array<string,mixed> */
    public function details(): array
    {
        return $this->details;
    }

    public static function notFound(string $recurso, int $id): self
    {
        return new self(404, sprintf('No existe %s con id %d.', $recurso, $id));
    }

    /** @param array<string,string> $errores */
    public static function validacion(array $errores): self
    {
        return new self(422, 'Los datos enviados no son validos.', ['errores' => $errores]);
    }

    public static function conflicto(string $mensaje): self
    {
        return new self(409, $mensaje);
    }

    public static function noAutorizado(string $mensaje = 'Credenciales invalidas.'): self
    {
        return new self(401, $mensaje);
    }
}