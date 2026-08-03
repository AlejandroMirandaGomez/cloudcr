<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\HttpException;
use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\RespuestaRepository;

/** HU-013, HU-014. */
final class RespuestaController extends BaseController
{
    public function __construct(private RespuestaRepository $repo = new RespuestaRepository())
    {
    }

    /**
     * HU-013 y HU-014: PUT /cuestionarios/{id}/respuestas/{controlId}
     * Idempotente: crea la respuesta o la actualiza si ya existia.
     */
    public function guardar(Request $r, int $cuestionarioId, int $controlId): void
    {
        $datos = $this->validarFila($r->body());
        $resultado = $this->repo->guardar($cuestionarioId, $controlId, $datos);

        if ($resultado['creado']) {
            Response::created(
                $resultado['respuesta'],
                sprintf('/cuestionarios/%d/respuestas/%d', $cuestionarioId, $controlId)
            );
            return;
        }

        Response::ok($resultado['respuesta']);
    }

    /**
     * Guardado por lotes del cuestionario completo, en una sola transaccion.
     * POST /cuestionarios/{id}/respuestas  con { "respuestas": [ {...}, {...} ] }
     */
    public function guardarLote(Request $r, int $cuestionarioId): void
    {
        $body = $r->body();
        $filas = $body['respuestas'] ?? null;

        if (!is_array($filas) || $filas === [] || !array_is_list($filas)) {
            throw HttpException::validacion([
                'respuestas' => 'Se espera un arreglo no vacio de respuestas.',
            ]);
        }

        $errores    = [];
        $validadas  = [];

        foreach ($filas as $i => $fila) {
            if (!is_array($fila)) {
                $errores["respuestas.$i"] = 'Cada elemento debe ser un objeto.';
                continue;
            }

            $v         = new Validator($fila);
            $controlId = $v->requiredId('control_id');
            $datos     = [
                'respuesta'   => $v->enum('respuesta', Validator::RESPUESTAS),
                'documentado' => $v->enum('documentado', Validator::SI_NO),
                'repetible'   => $v->enum('repetible', Validator::SI_NO),
                'evidencia'   => $v->enum('evidencia', Validator::SI_NO),
            ];

            if ($v->fails()) {
                $errores["respuestas.$i"] = 'Fila invalida: revise control_id, respuesta, documentado, repetible y evidencia.';
                continue;
            }

            $validadas[] = ['control_id' => (int) $controlId] + $datos;
        }

        if ($errores !== []) {
            throw HttpException::validacion($errores);
        }

        // Un mismo control no puede venir dos veces en el mismo lote.
        $ids = array_column($validadas, 'control_id');
        if (count($ids) !== count(array_unique($ids))) {
            throw HttpException::validacion([
                'respuestas' => 'Hay control_id repetidos en el lote.',
            ]);
        }

        /** @var list<array{control_id:int,respuesta:string,documentado:string,repetible:string,evidencia:string}> $validadas */
        Response::ok($this->repo->guardarLote($cuestionarioId, $validadas));
    }

    public function show(Request $r, int $cuestionarioId, int $controlId): void
    {
        Response::ok($this->repo->buscar($cuestionarioId, $controlId));
    }

    /** Controles del catalogo aun sin responder en este cuestionario. */
    public function pendientes(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->pendientes($cuestionarioId));
    }

    public function destroy(Request $r, int $cuestionarioId, int $controlId): void
    {
        $this->repo->eliminar($cuestionarioId, $controlId);
        Response::noContent();
    }

    /**
     * @param array<string,mixed> $body
     * @return array{respuesta:string,documentado:string,repetible:string,evidencia:string}
     */
    private function validarFila(array $body): array
    {
        $v = new Validator($body);
        $datos = [
            'respuesta'   => $v->enum('respuesta', Validator::RESPUESTAS),
            'documentado' => $v->enum('documentado', Validator::SI_NO),
            'repetible'   => $v->enum('repetible', Validator::SI_NO),
            'evidencia'   => $v->enum('evidencia', Validator::SI_NO),
        ];
        $v->assert();

        /** @var array{respuesta:string,documentado:string,repetible:string,evidencia:string} $datos */
        return $datos;
    }
}