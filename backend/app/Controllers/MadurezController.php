<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\MadurezRepository;

final class MadurezController extends BaseController
{
    public function __construct(private MadurezRepository $repo = new MadurezRepository())
    {
    }

    public function index(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->listar($cuestionarioId), ['escala' => $this->repo->escala()]);
    }

    public function guardar(Request $r, int $cuestionarioId, int $controlId): void
    {
        $v     = new Validator($r->body());
        $nivel = $v->entero('nivel', MadurezRepository::NIVEL_MINIMO, MadurezRepository::NIVEL_MAXIMO);
        $v->assert();

        $resultado = $this->repo->guardar($cuestionarioId, $controlId, (int) $nivel);

        if ($resultado['creado']) {
            Response::created(
                $resultado['madurez'],
                sprintf('/cuestionarios/%d/niveles-madurez/%d', $cuestionarioId, $controlId)
            );
            return;
        }

        Response::ok($resultado['madurez']);
    }
}
