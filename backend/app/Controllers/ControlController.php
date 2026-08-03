<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\ControlRepository;

/** HU-005, HU-010, HU-012. */
final class ControlController extends BaseController
{
    public function __construct(private ?ControlRepository $repo = null)
    {
        $this->repo ??= new ControlRepository();
    }

    /** HU-012: GET /controles?norma_id=&tipo=&dimension=&nivel=&buscar= */
    public function index(Request $r): void
    {
        ['limit' => $limit, 'offset' => $offset] = $this->paginacionDesde($r);

        $filtros = [
            'norma_id'  => $r->query('norma_id') !== null ? (int) $r->query('norma_id') : null,
            'tipo'      => $r->query('tipo'),
            'dimension' => $r->query('dimension'),
            'nivel'     => $r->query('nivel'),
            'buscar'    => $r->query('buscar'),
        ];

        if ($filtros['nivel'] !== null && !in_array($filtros['nivel'], Validator::NIVELES, true)) {
            throw \CloudCR\Core\HttpException::validacion([
                'nivel' => 'Valor no permitido. Use: ' . implode(', ', Validator::NIVELES) . '.',
            ]);
        }

        Response::ok(
            $this->repo->listar($filtros, $limit, $offset),
            ['total' => $this->repo->contar($filtros), 'limit' => $limit, 'offset' => $offset]
        );
    }

    public function show(Request $r, int $id): void
    {
        Response::ok($this->repo->buscarPorId($id));
    }

    /** Utilidad para poblar el combo de filtros del frontend. */
    public function tipos(Request $r): void
    {
        Response::ok($this->repo->tiposDeControl());
    }

    /** HU-005: control + vinculo a norma(s) en un solo paso. */
    public function store(Request $r): void
    {
        $v = new Validator($r->body());

        $datos = [
            'tipo_control'     => $v->requiredString('tipo_control', 100, 3),
            'nombre_control'   => $v->requiredString('nombre_control', 255, 3),
            'detalle'          => $v->optionalText('detalle'),
            'integridad'       => $v->enum('integridad', Validator::NIVELES),
            'disponibilidad'   => $v->enum('disponibilidad', Validator::NIVELES),
            'confidencialidad' => $v->enum('confidencialidad', Validator::NIVELES),
        ];
        $normaIds = $v->idList('normas', true);
        $v->assert();

        /** @var array{tipo_control:string,nombre_control:string,detalle:?string,integridad:string,disponibilidad:string,confidencialidad:string} $datos */
        $control = $this->repo->crear($datos, (array) $normaIds);
        Response::created($control, '/controles/' . $control['id']);
    }

    /** HU-010: actualizacion parcial; las respuestas historicas no se alteran. */
    public function update(Request $r, int $id): void
    {
        $body = $r->body();
        $v    = new Validator($body);
        $v->notEmptyBody();

        $campos = [];

        if (array_key_exists('tipo_control', $body)) {
            $campos['tipo_control'] = $v->requiredString('tipo_control', 100, 3);
        }
        if (array_key_exists('nombre_control', $body)) {
            $campos['nombre_control'] = $v->requiredString('nombre_control', 255, 3);
        }
        if (array_key_exists('detalle', $body)) {
            $campos['detalle'] = $v->optionalText('detalle');
        }
        foreach (['integridad', 'disponibilidad', 'confidencialidad'] as $dimension) {
            if (array_key_exists($dimension, $body)) {
                $campos[$dimension] = $v->enum($dimension, Validator::NIVELES);
            }
        }

        $normaIds = array_key_exists('normas', $body) ? $v->idList('normas', false) : null;
        $v->assert();

        Response::ok($this->repo->actualizar($id, $campos, $normaIds));
    }

    public function destroy(Request $r, int $id): void
    {
        $this->repo->eliminar($id);
        Response::noContent();
    }
}