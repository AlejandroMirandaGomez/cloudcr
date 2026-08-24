<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\HttpException;
use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Monitor\AutenticacionCollector;
use CloudCR\Repositories\MonitorRepository;

/**
 * Fase 2 - Monitor de Salud de Base de Datos.
 *
 * Los GET sirven al dashboard el ultimo estado guardado; el POST /ingesta es
 * por donde el collector local (collector/) empuja las mediciones que toma de
 * Oracle. El backend nunca se conecta a Oracle: solo recibe, calcula y sirve.
 */
final class MonitorController extends BaseController
{
    /** Motores aceptados al registrar una base monitoreada. */
    private const MOTORES = ['Oracle', 'PostgreSQL', 'MySQL', 'SQL Server'];

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
        Response::ok($this->repo->historico($r->query('baseDatosId'), $r->query('limite')));
    }

    public function variables(Request $r): void
    {
        Response::ok($this->repo->variables($r->query('baseDatosId'), $r->query('componente')));
    }

    /**
     * Guarda umbrales y pesos de un componente para una base concreta.
     *
     * Cuerpo esperado:
     *   {
     *     "baseDatosId": 1,
     *     "componente": "memoria",
     *     "variables": [{"codigo": "m2", "umbralVerde": 4, "umbralRojo": 2, "peso": 11.11}, ...]
     *   }
     */
    public function guardarAjustes(Request $r): void
    {
        $body = $r->body();

        $componente = $body['componente'] ?? null;
        $variables  = $body['variables'] ?? null;

        if (!is_string($componente) || $componente === '') {
            throw HttpException::validacion(['componente' => 'Es obligatorio.']);
        }
        if (!is_array($variables) || $variables === []) {
            throw HttpException::validacion(['variables' => 'Es obligatorio y debe traer al menos una variable.']);
        }

        $baseDatosId = $body['baseDatosId'] ?? null;
        $baseDatosId = $baseDatosId === null ? null : (string) $baseDatosId;

        Response::ok($this->repo->guardarAjustes($baseDatosId, $componente, array_values($variables)));
    }

    public function umbralesIndice(Request $r): void
    {
        Response::ok($this->repo->umbralesIndice($r->query('baseDatosId')));
    }

    /**
     * Guarda los umbrales del semaforo de los cuatro indices de una base.
     *
     * Cuerpo esperado:
     *   {
     *     "baseDatosId": 1,
     *     "umbrales": {
     *       "isbd": {"verde": 80, "rojo": 55},
     *       "ip":   {"verde": 75, "rojo": 60},
     *       "im":   {"verde": 75, "rojo": 60},
     *       "ia":   {"verde": 75, "rojo": 60}
     *     }
     *   }
     */
    public function guardarUmbralesIndice(Request $r): void
    {
        $body     = $r->body();
        $umbrales = $body['umbrales'] ?? null;

        if (!is_array($umbrales) || $umbrales === []) {
            throw HttpException::validacion(['umbrales' => 'Es obligatorio.']);
        }

        $baseDatosId = $body['baseDatosId'] ?? null;
        $baseDatosId = $baseDatosId === null ? null : (string) $baseDatosId;

        Response::ok($this->repo->guardarUmbralesIndice($baseDatosId, $umbrales));
    }

    /**
     * Recibe un snapshot del collector local. Protegido con el secreto
     * compartido X-Collector-Token (ver AutenticacionCollector).
     *
     * Cuerpo esperado:
     *   {
     *     "base_datos": {"nombre":"XE", "motor":"Oracle",
     *                    "host":"localhost", "puerto":1521, "servicio":"XEPDB1"},
     *     "mediciones": {"p1":210, "p2":500, ..., "a8":0}
     *   }
     */
    public function ingesta(Request $r): void
    {
        AutenticacionCollector::exigirToken();

        $body = $r->body();

        $baseDatos = $body['base_datos'] ?? null;
        if (!is_array($baseDatos)) {
            throw HttpException::validacion(['base_datos' => 'Es obligatorio y debe ser un objeto.']);
        }

        $v = new Validator($baseDatos);
        $nombre   = $v->requiredString('nombre', 100);
        $motor    = $v->optionalEnum('motor', self::MOTORES);
        $host     = $v->optionalText('host');
        $servicio = $v->optionalText('servicio');
        $puerto   = isset($baseDatos['puerto']) && $baseDatos['puerto'] !== ''
            ? $v->entero('puerto', 1, 65535)
            : null;
        $v->assert();

        $mediciones = $body['mediciones'] ?? null;
        if (!is_array($mediciones) || $mediciones === []) {
            throw HttpException::validacion(['mediciones' => 'Es obligatorio y debe traer al menos una variable.']);
        }

        $resultado = $this->repo->registrarSnapshot([
            'base_datos' => [
                'nombre'   => $nombre,
                'motor'    => $motor ?? 'Oracle',
                'host'     => $host !== null ? mb_substr($host, 0, 150) : null,
                'puerto'   => $puerto,
                'servicio' => $servicio !== null ? mb_substr($servicio, 0, 100) : null,
            ],
            'mediciones' => $mediciones,
        ]);

        Response::created($resultado, '/monitor/indice?baseDatosId=' . $resultado['base_datos_id']);
    }

    /**
     * Marca una base como caida (o la restaura). La usa el collector cuando no
     * puede leer la instancia. Protegido con el mismo token que la ingesta.
     *
     * Cuerpo: {"nombre": "...", "caida": true, "motivo": "..."}
     */
    public function estadoCaida(Request $r): void
    {
        AutenticacionCollector::exigirToken();

        $body   = $r->body();
        $nombre = $body['nombre'] ?? null;
        if (!is_string($nombre) || trim($nombre) === '') {
            throw HttpException::validacion(['nombre' => 'Es obligatorio.']);
        }

        $caida  = filter_var($body['caida'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $motivo = isset($body['motivo']) && is_string($body['motivo']) ? $body['motivo'] : null;

        Response::ok($this->repo->marcarCaida(trim($nombre), $caida, $motivo));
    }
}
