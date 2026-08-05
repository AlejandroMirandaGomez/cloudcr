<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\OrganizacionRepository;

/** HU-001. */
final class OrganizacionController extends BaseController
{
    public function __construct(private OrganizacionRepository $repo = new OrganizacionRepository())
    {
    }

    public function index(Request $r): void
    {
        ['limit' => $limit, 'offset' => $offset] = $this->paginacionDesde($r);
        $buscar = $r->query('buscar');

        Response::ok(
            $this->repo->listar($buscar, $limit, $offset),
            ['total' => $this->repo->contar($buscar), 'limit' => $limit, 'offset' => $offset]
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

        $hash          = password_hash((string) $contrasena, PASSWORD_BCRYPT);
        $organizacion  = $this->repo->crear((string) $nombre, (string) $correo, $hash);
        Response::created($organizacion, '/organizaciones/' . $organizacion['id']);
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

    public function destroy(Request $r, int $id): void
    {
        $this->repo->eliminar($id);
        Response::noContent();
    }
}