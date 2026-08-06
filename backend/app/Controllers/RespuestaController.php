<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\HttpException;
use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Core\Validator;
use CloudCR\Repositories\RespuestaRepository;

final class RespuestaController extends BaseController
{
    public function __construct(private RespuestaRepository $repo = new RespuestaRepository())
    {
    }

    public function guardar(Request $r, int $cuestionarioId, int $preguntaId): void
    {
        $datos     = $this->validarFila($r->body());
        $resultado = $this->repo->guardar($cuestionarioId, $preguntaId, $datos);

        if ($resultado['creado']) {
            Response::created(
                $resultado['respuesta'],
                sprintf('/cuestionarios/%d/respuestas/%d', $cuestionarioId, $preguntaId)
            );
            return;
        }

        Response::ok($resultado['respuesta']);
    }

    public function guardarLote(Request $r, int $cuestionarioId): void
    {
        $body  = $r->body();
        $filas = $body['respuestas'] ?? null;

        if (!is_array($filas) || $filas === [] || !array_is_list($filas)) {
            throw HttpException::validacion([
                'respuestas' => 'Se espera un arreglo no vacio de respuestas.',
            ]);
        }

        $errores   = [];
        $validadas = [];

        foreach ($filas as $i => $fila) {
            if (!is_array($fila)) {
                $errores["respuestas.$i"] = 'Cada elemento debe ser un objeto.';
                continue;
            }

            $v          = new Validator($fila);
            $preguntaId = $v->requiredId('pregunta_id');
            $datos      = $this->campos($v);

            if ($v->fails()) {
                $errores["respuestas.$i"] = 'Fila invalida: revise pregunta_id, cumple, documentado, '
                    . 'repetible, evidencia y la justificacion cuando la respuesta es N/A.';
                continue;
            }

            $validadas[] = ['pregunta_id' => (int) $preguntaId] + $datos;
        }

        if ($errores !== []) {
            throw HttpException::validacion($errores);
        }

        $ids = array_column($validadas, 'pregunta_id');
        if (count($ids) !== count(array_unique($ids))) {
            throw HttpException::validacion([
                'respuestas' => 'Hay pregunta_id repetidos en el lote.',
            ]);
        }

        Response::ok($this->repo->guardarLote($cuestionarioId, $validadas));
    }

    public function show(Request $r, int $cuestionarioId, int $preguntaId): void
    {
        Response::ok($this->repo->buscar($cuestionarioId, $preguntaId));
    }

    public function pendientes(Request $r, int $cuestionarioId): void
    {
        Response::ok($this->repo->pendientes($cuestionarioId));
    }

    public function destroy(Request $r, int $cuestionarioId, int $preguntaId): void
    {
        $this->repo->eliminar($cuestionarioId, $preguntaId);
        Response::noContent();
    }

    private function validarFila(array $body): array
    {
        $v     = new Validator($body);
        $datos = $this->campos($v);
        $v->assert();

        return $datos;
    }

    /**
     * La justificacion solo tiene sentido cuando la pregunta no aplica: es
     * obligatoria con 'N/A' y se descarta en cualquier otro caso, igual que el
     * CHECK de la tabla Respuestas.
     */
    private function campos(Validator $v): array
    {
        $cumple = $v->enum('cumple', Validator::RESPUESTAS);

        $justificacion = $cumple === 'N/A'
            ? $v->requiredString('justificacion_no_aplica', 500, 10)
            : null;

        return [
            'cumple'                  => $cumple,
            'documentado'             => $v->enum('documentado', Validator::RESPUESTAS),
            'repetible'               => $v->enum('repetible', Validator::RESPUESTAS),
            'evidencia'               => $v->enum('evidencia', Validator::RESPUESTAS),
            'justificacion_no_aplica' => $justificacion,
        ];
    }
}
