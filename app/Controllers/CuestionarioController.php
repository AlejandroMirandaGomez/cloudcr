<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\CuestionarioRepository;

/** HU-006, HU-016, HU-017. */
final class CuestionarioController extends BaseController
{
    public function __construct(private CuestionarioRepository $repo = new CuestionarioRepository())
    {
    }

    /** HU-016: GET /cuestionarios?organizacion_id=&evaluador_id=&desde=&hasta= */
    public function index(Request $r): void
    {
        ['limit' => $limit, 'offset' => $offset] = $this->paginacionDesde($r);

        $filtros = [
            'organizacion_id' => $r->query('organizacion_id') !== null ? (int) $r->query('organizacion_id') : null,
            'evaluador_id'    => $r->query('evaluador_id') !== null ? (int) $r->query('evaluador_id') : null,
            'desde'           => $this->fechaValida($r->query('desde'), 'desde'),
            'hasta'           => $this->fechaValida($r->query('hasta'), 'hasta'),
        ];

        Response::ok(
            $this->repo->listar($filtros, $limit, $offset),
            ['total' => $this->repo->contar($filtros), 'limit' => $limit, 'offset' => $offset]
        );
    }

    /** HU-017: detalle con todas las respuestas. */
    public function show(Request $r, int $id): void
    {
        Response::ok($this->repo->detalle($id));
    }

    /** HU-006. */
    public function store(Request $r): void
    {
        $v = new Validator($r->body());
        $organizacionId = $v->requiredId('organizacion_id');
        $evaluadorId    = $v->requiredId('evaluador_id');
        $fecha          = $v->fecha('fecha');
        $v->assert();

        $cuestionario = $this->repo->crear((int) $organizacionId, (int) $evaluadorId, (string) $fecha);
        Response::created($cuestionario, '/cuestionarios/' . $cuestionario['id']);
    }

    public function update(Request $r, int $id): void
    {
        $body = $r->body();
        $v    = new Validator($body);
        $v->notEmptyBody();

        $campos = [];
        if (array_key_exists('organizacion_id', $body)) {
            $campos['organizacion_id'] = $v->requiredId('organizacion_id');
        }
        if (array_key_exists('evaluador_id', $body)) {
            $campos['evaluador_id'] = $v->requiredId('evaluador_id');
        }
        if (array_key_exists('fecha', $body)) {
            $campos['fecha'] = $v->fecha('fecha', true);
        }
        $v->assert();

        Response::ok($this->repo->actualizar($id, $campos));
    }

    public function destroy(Request $r, int $id): void
    {
        $this->repo->eliminar($id);
        Response::noContent();
    }

    private function fechaValida(?string $valor, string $campo): ?string
    {
        if ($valor === null) {
            return null;
        }
        $fecha = \DateTimeImmutable::createFromFormat('!Y-m-d', $valor);
        if ($fecha === false || $fecha->format('Y-m-d') !== $valor) {
            throw \CloudCR\Core\HttpException::validacion([$campo => 'Formato invalido, se espera YYYY-MM-DD.']);
        }
        return $valor;
    }
}