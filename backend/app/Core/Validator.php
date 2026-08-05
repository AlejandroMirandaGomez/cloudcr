<?php

declare(strict_types=1);

namespace CloudCR\Core;

/**
 * Validaciones basicas (entregable de Persona 2). Acumula errores por campo y
 * lanza un 422 con todos juntos, en lugar de fallar campo por campo.
 *
 * Los valores permitidos replican exactamente los ENUM del script de Persona 1:
 *   nivel_control      -> P, S, N-A
 *   respuesta_control  -> Si, No, N-A
 *   si_no              -> si, no
 */
final class Validator
{
    public const NIVELES    = ['P', 'S', 'N-A'];
    public const RESPUESTAS = ['Si', 'No', 'N-A'];
    public const SI_NO      = ['si', 'no'];

    /** @var array<string,string> */
    private array $errores = [];

    /** @param array<string,mixed> $data */
    public function __construct(private array $data)
    {
    }

    public function requiredString(string $campo, int $max, int $min = 1): ?string
    {
        $valor = $this->data[$campo] ?? null;

        if ($valor === null || (is_string($valor) && trim($valor) === '')) {
            $this->errores[$campo] = 'Es obligatorio.';
            return null;
        }
        if (!is_string($valor)) {
            $this->errores[$campo] = 'Debe ser texto.';
            return null;
        }

        $valor = trim(preg_replace('/\s+/u', ' ', $valor) ?? $valor);
        $largo = mb_strlen($valor);

        if ($largo < $min) {
            $this->errores[$campo] = sprintf('Debe tener al menos %d caracteres.', $min);
            return null;
        }
        if ($largo > $max) {
            $this->errores[$campo] = sprintf('No debe exceder %d caracteres.', $max);
            return null;
        }

        return $valor;
    }

    public function requiredEmail(string $campo, int $max = 150): ?string
    {
        $valor = $this->data[$campo] ?? null;

        if ($valor === null || (is_string($valor) && trim($valor) === '')) {
            $this->errores[$campo] = 'Es obligatorio.';
            return null;
        }
        if (!is_string($valor)) {
            $this->errores[$campo] = 'Debe ser texto.';
            return null;
        }

        $valor = trim($valor);
        if (mb_strlen($valor) > $max) {
            $this->errores[$campo] = sprintf('No debe exceder %d caracteres.', $max);
            return null;
        }
        if (filter_var($valor, FILTER_VALIDATE_EMAIL) === false) {
            $this->errores[$campo] = 'Debe ser un correo valido.';
            return null;
        }

        return mb_strtolower($valor);
    }

    public function requiredPassword(string $campo, int $min = 8, int $max = 72): ?string
    {
        $valor = $this->data[$campo] ?? null;

        if ($valor === null || $valor === '') {
            $this->errores[$campo] = 'Es obligatoria.';
            return null;
        }
        if (!is_string($valor)) {
            $this->errores[$campo] = 'Debe ser texto.';
            return null;
        }
        if (mb_strlen($valor) < $min) {
            $this->errores[$campo] = sprintf('Debe tener al menos %d caracteres.', $min);
            return null;
        }
        if (mb_strlen($valor) > $max) {
            $this->errores[$campo] = sprintf('No debe exceder %d caracteres.', $max);
            return null;
        }

        return $valor;
    }

    /** Igual que requiredPassword, pero permite omitir el campo (para PUT sin cambio de clave). */
    public function optionalPassword(string $campo, int $min = 8, int $max = 72): ?string
    {
        $valor = $this->data[$campo] ?? null;
        if ($valor === null || $valor === '') {
            return null;
        }
        return $this->requiredPassword($campo, $min, $max);
    }

    public function optionalText(string $campo): ?string
    {
        $valor = $this->data[$campo] ?? null;
        if ($valor === null || (is_string($valor) && trim($valor) === '')) {
            return null;
        }
        if (!is_string($valor)) {
            $this->errores[$campo] = 'Debe ser texto.';
            return null;
        }
        return trim($valor);
    }

    /** @param list<string> $permitidos */
    public function enum(string $campo, array $permitidos): ?string
    {
        $valor = $this->data[$campo] ?? null;

        if ($valor === null || $valor === '') {
            $this->errores[$campo] = 'Es obligatorio.';
            return null;
        }
        if (!is_string($valor) || !in_array($valor, $permitidos, true)) {
            $this->errores[$campo] = 'Valor no permitido. Use: ' . implode(', ', $permitidos) . '.';
            return null;
        }

        return $valor;
    }

    public function requiredId(string $campo): ?int
    {
        $valor = $this->data[$campo] ?? null;

        if ($valor === null || $valor === '') {
            $this->errores[$campo] = 'Es obligatorio.';
            return null;
        }
        if (!is_numeric($valor) || (int) $valor <= 0 || (float) $valor != (int) $valor) {
            $this->errores[$campo] = 'Debe ser un id entero positivo.';
            return null;
        }

        return (int) $valor;
    }

    /** Fecha en formato ISO (YYYY-MM-DD). Si no viene, usa la de hoy. */
    public function fecha(string $campo, bool $obligatoria = false): ?string
    {
        $valor = $this->data[$campo] ?? null;

        if ($valor === null || $valor === '') {
            if ($obligatoria) {
                $this->errores[$campo] = 'Es obligatoria.';
                return null;
            }
            return date('Y-m-d');
        }
        if (!is_string($valor)) {
            $this->errores[$campo] = 'Debe ser texto en formato YYYY-MM-DD.';
            return null;
        }

        $fecha = \DateTimeImmutable::createFromFormat('!Y-m-d', $valor);
        if ($fecha === false || $fecha->format('Y-m-d') !== $valor) {
            $this->errores[$campo] = 'Formato invalido, se espera YYYY-MM-DD.';
            return null;
        }
        if ($fecha > new \DateTimeImmutable('today')) {
            $this->errores[$campo] = 'No puede ser una fecha futura.';
            return null;
        }

        return $valor;
    }

    /**
     * Lista de ids (para vincular normas a un control). Elimina duplicados.
     *
     * @return list<int>|null
     */
    public function idList(string $campo, bool $obligatoria = true): ?array
    {
        $valor = $this->data[$campo] ?? null;

        if ($valor === null || $valor === []) {
            if ($obligatoria) {
                $this->errores[$campo] = 'Debe indicar al menos un id.';
                return null;
            }
            return [];
        }
        if (!is_array($valor) || array_is_list($valor) === false) {
            $this->errores[$campo] = 'Debe ser un arreglo de ids.';
            return null;
        }

        $ids = [];
        foreach ($valor as $item) {
            if (!is_numeric($item) || (int) $item <= 0) {
                $this->errores[$campo] = 'Todos los elementos deben ser ids enteros positivos.';
                return null;
            }
            $ids[] = (int) $item;
        }

        return array_values(array_unique($ids));
    }

    /** Rechaza el cuerpo vacio en un PUT, para no hacer un UPDATE sin cambios. */
    public function notEmptyBody(): void
    {
        if ($this->data === []) {
            $this->errores['_body'] = 'No se enviaron datos.';
        }
    }

    public function fails(): bool
    {
        return $this->errores !== [];
    }

    /** Lanza el 422 acumulado si hubo errores. */
    public function assert(): void
    {
        if ($this->fails()) {
            throw HttpException::validacion($this->errores);
        }
    }
}