<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\HttpException;
use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\ControlRepository;

final class ControlController extends BaseController
{
    private const ATRIBUTOS = ['tipos', 'conceptos', 'dominios_seguridad', 'capacidades'];

    public function __construct(private ?ControlRepository $repo = null)
    {
        $this->repo ??= new ControlRepository();
    }

    public function index(Request $r): void
    {
        ['limit' => $limit, 'offset' => $offset] = $this->paginacionDesde($r);

        $filtros = [
            'norma_id'         => $r->query('norma_id') !== null ? (int) $r->query('norma_id') : null,
            'dominio_norma_id' => $r->query('dominio_norma_id') !== null ? (int) $r->query('dominio_norma_id') : null,
            'tipo'             => $r->query('tipo'),
            'dimension'        => $r->query('dimension'),
            'nivel'            => $r->query('nivel'),
            'buscar'           => $r->query('buscar'),
        ];

        if ($filtros['nivel'] !== null && !in_array($filtros['nivel'], Validator::NIVELES, true)) {
            throw HttpException::validacion([
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

    public function store(Request $r): void
    {
        $v = new Validator($r->body());

        $datos = [
            'norma_id'         => $v->requiredId('norma_id'),
            'dominio_norma_id' => $v->requiredId('dominio_norma_id'),
            'codigo'           => $v->requiredString('codigo', 10),
            'nombre'           => $v->requiredString('nombre', 255, 3),
            'proposito'        => $v->requiredString('proposito', 1000, 3),
            'descripcion'      => $v->requiredString('descripcion', 1000, 3),
            'peso'             => $v->entero('peso', 1, 10),
            'confidencialidad' => $v->optionalEnum('confidencialidad', Validator::NIVELES),
            'integridad'       => $v->optionalEnum('integridad', Validator::NIVELES),
            'disponibilidad'   => $v->optionalEnum('disponibilidad', Validator::NIVELES),
            'guia'             => $v->optionalText('guia'),
            'otra_informacion' => $v->optionalText('otra_informacion'),
        ];

        $atributos = [
            'tipos'              => $v->idList('tipos'),
            'conceptos'          => $v->idList('conceptos', false),
            'dominios_seguridad' => $v->idList('dominios_seguridad', false),
            'capacidades'        => $v->idList('capacidades', false),
        ];

        $preguntas = $v->textList('preguntas', false);
        $v->assert();

        $control = $this->repo->crear($datos, $atributos, $preguntas);
        Response::created($control, '/controles/' . $control['id']);
    }

    public function update(Request $r, int $id): void
    {
        $body = $r->body();
        $v    = new Validator($body);
        $v->notEmptyBody();

        $campos = [];

        if (array_key_exists('norma_id', $body)) {
            $campos['norma_id'] = $v->requiredId('norma_id');
        }
        if (array_key_exists('dominio_norma_id', $body)) {
            $campos['dominio_norma_id'] = $v->requiredId('dominio_norma_id');
        }
        if (array_key_exists('codigo', $body)) {
            $campos['codigo'] = $v->requiredString('codigo', 10);
        }
        if (array_key_exists('nombre', $body)) {
            $campos['nombre'] = $v->requiredString('nombre', 255, 3);
        }
        if (array_key_exists('proposito', $body)) {
            $campos['proposito'] = $v->requiredString('proposito', 1000, 3);
        }
        if (array_key_exists('descripcion', $body)) {
            $campos['descripcion'] = $v->requiredString('descripcion', 1000, 3);
        }
        if (array_key_exists('peso', $body)) {
            $campos['peso'] = $v->entero('peso', 1, 10);
        }
        foreach (['confidencialidad', 'integridad', 'disponibilidad'] as $dimension) {
            if (array_key_exists($dimension, $body)) {
                $campos[$dimension] = $v->optionalEnum($dimension, Validator::NIVELES);
            }
        }
        foreach (['guia', 'otra_informacion'] as $texto) {
            if (array_key_exists($texto, $body)) {
                $campos[$texto] = $v->optionalText($texto);
            }
        }

        $atributos = [];
        foreach (self::ATRIBUTOS as $clave) {
            if (array_key_exists($clave, $body)) {
                $atributos[$clave] = $v->idList($clave, false);
            }
        }

        $preguntas = array_key_exists('preguntas', $body) ? $v->textList('preguntas', false) : null;
        $v->assert();

        Response::ok($this->repo->actualizar($id, $campos, $atributos, $preguntas));
    }

    public function destroy(Request $r, int $id): void
    {
        $this->repo->eliminar($id);
        Response::noContent();
    }
}
