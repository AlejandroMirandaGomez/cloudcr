<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Repositories\ReporteRepository;

/** HU-018 y pantalla de Resultados. */
final class ReporteController extends BaseController
{
    public function __construct(private ReporteRepository $repo = new ReporteRepository())
    {
    }

    public function resumen(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->resumen($cuestionarioId));
    }

    /** HU-018. */
    public function mapaCalor(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->mapaCalor($cuestionarioId));
    }

    /** Controles con respuesta 'No': insumo de las recomendaciones de Persona 4. */
    public function hallazgos(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->hallazgos($cuestionarioId));
    }

    public function historialOrganizacion(Request $r, int $organizacionId): void
    {
        Response::ok($this->repo->historialOrganizacion($organizacionId));
    }
}