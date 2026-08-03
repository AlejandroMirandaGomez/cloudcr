<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\NormaRepository;

/** HU-004, HU-009. */
final class NormaController extends BaseController
{
    public function __construct(private NormaRepository $repo = new NormaRepository())
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
        $nombre = $v->requiredString('nombre', 150, 2);
        $v->assert();

        $norma = $this->repo->crear((string) $nombre);
        Response::created($norma, '/normas/' . $norma['id']);
    }

    public function update(Request $r, int $id): void
    {
        $v = new Validator($r->body());
        $v->notEmptyBody();
        $nombre = $v->requiredString('nombre', 150, 2);
        $v->assert();

        Response::ok($this->repo->actualizar($id, (string) $nombre));
    }

    public function destroy(Request $r, int $id): void
    {
        $this->repo->eliminar($id);
        Response::noContent();
    }
}