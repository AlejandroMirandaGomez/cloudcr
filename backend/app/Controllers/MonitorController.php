<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Repositories\MonitorRepository;

/**
 * Fase 2 - Monitor de Salud de Base de Datos. Responde con datos simulados
 * (ver MonitorRepository) mientras se confirma la conexion Oracle real.
 */
final class MonitorController extends BaseController
{
    public function __construct(private MonitorRepository $repo = new MonitorRepository())
    {
    }

    public function basesDatos(Request $r): void
    {
        Response::ok($this->repo->basesDatos());
    }

    public function indice(Request $r): void
    {
        Response::ok($this->repo->indice($r->query('baseDatosId')));
    }

    public function alertas(Request $r): void
    {
        Response::ok($this->repo->alertas($r->query('baseDatosId')));
    }

    public function historico(Request $r): void
    {
        Response::ok($this->repo->historico($r->query('baseDatosId')));
    }
}
