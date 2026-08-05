<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\EvaluadorRepository;

/**
 * CRUD de evaluadores. Registro y edicion por correo + contrasena (HU-002, HU-003).
 * El login vive en AuthController (HU-007).
 */
final class EvaluadorController extends BaseController
{
    public function __construct(private EvaluadorRepository $repo = new EvaluadorRepository())
    {
    }

    public function index(Request $r): void
    {
        ['limit' => $limit, 'offset' => $offset] = $this->paginacionDesde($r);

        Response::ok(
            $this->repo->listar($limit, $offset),
            ['total' => $this->repo->contar(), 'limit' => $limit, 'offset' => $offset]
        );
    }

    public function show(Request $r, int $id): void
    {
        Response::ok($this->repo->buscarPorId($id));
    }

    public function store(Request $r): void
    {
        $v = new Validator($r->body());
        $nombre     = $v->requiredString('nombre', 150, 3);
        $correo     = $v->requiredEmail('correo');
        $contrasena = $v->requiredPassword('contrasena');
        $v->assert();

        $hash      = password_hash((string) $contrasena, PASSWORD_BCRYPT);
        $evaluador = $this->repo->crear((string) $nombre, (string) $correo, $hash);
        Response::created($evaluador, '/evaluadores/' . $evaluador['id']);
    }

    public function update(Request $r, int $id): void
    {
        $v = new Validator($r->body());
        $v->notEmptyBody();
        $nombre     = $v->requiredString('nombre', 150, 3);
        $correo     = $v->requiredEmail('correo');
        $contrasena = $v->optionalPassword('contrasena');
        $v->assert();

        $hash = $contrasena !== null ? password_hash($contrasena, PASSWORD_BCRYPT) : null;
        Response::ok($this->repo->actualizar($id, (string) $nombre, (string) $correo, $hash));
    }
}