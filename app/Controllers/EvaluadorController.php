<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\EvaluadorRepository;

/**
 * CRUD basico de evaluadores. El flujo de solicitud/aprobacion (HU-002, HU-003)
 * y el login (HU-007) requieren columnas que el esquema actual no tiene.
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
        $nombre = $v->requiredString('nombre', 150, 3);
        $v->assert();

        $evaluador = $this->repo->crear((string) $nombre);
        Response::created($evaluador, '/evaluadores/' . $evaluador['id']);
    }

    public function update(Request $r, int $id): void
    {
        $v = new Validator($r->body());
        $v->notEmptyBody();
        $nombre = $v->requiredString('nombre', 150, 3);
        $v->assert();

        Response::ok($this->repo->actualizar($id, (string) $nombre));
    }
}