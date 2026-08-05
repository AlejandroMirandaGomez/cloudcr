<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\HttpException;
use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\EvaluadorRepository;
use CloudCR\Repositories\OrganizacionRepository;

/** Login por correo + contrasena para evaluadores y organizaciones (HU-007). */
final class AuthController
{
    public function __construct(
        private EvaluadorRepository $evaluadores = new EvaluadorRepository(),
        private OrganizacionRepository $organizaciones = new OrganizacionRepository()
    ) {
    }

    public function login(Request $r): void
    {
        $v = new Validator($r->body());
        $correo     = $v->requiredEmail('correo');
        $contrasena = $v->requiredString('contrasena', 72, 1);
        $tipo       = $v->enum('tipo', ['evaluador', 'organizacion']);
        $v->assert();

        $repo = $tipo === 'evaluador' ? $this->evaluadores : $this->organizaciones;

        $usuario = $repo->buscarPorCorreo((string) $correo);
        if ($usuario === null || !password_verify((string) $contrasena, $usuario['contrasena_hash'])) {
            throw HttpException::noAutorizado('Correo o contrasena incorrectos.');
        }

        unset($usuario['contrasena_hash']);
        Response::ok(['rol' => $tipo, ...$usuario]);
    }
}
