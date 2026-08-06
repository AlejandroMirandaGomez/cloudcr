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

    /** Preguntas marcadas 'N/A' con la justificacion registrada por el evaluador. */
    public function noAplicables(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->noAplicables($cuestionarioId));
    }

    /** Nivel de madurez 0-5 por control, dominio y global (docs/Metodologia_Madurez.md). */
    public function madurez(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->madurez($cuestionarioId));
    }

    /** Exposicion al riesgo C/I/D e indice general (docs/Metodologia_Riesgo.md). */
    public function riesgo(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->riesgo($cuestionarioId));
    }

    public function historialOrganizacion(Request $r, int $organizacionId): void
    {
        Response::ok($this->repo->historialOrganizacion($organizacionId));
    }
}