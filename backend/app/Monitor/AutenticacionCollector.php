<?php

declare(strict_types=1);

namespace CloudCR\Monitor;

use CloudCR\Core\Config;
use CloudCR\Core\HttpException;

/**
 * Secreto compartido entre el collector local y POST /monitor/ingesta.
 *
 * No es un esquema de autenticacion general del API (eso sigue pendiente, ver
 * backend/docs/Gaps.md): es solo para que un tercero no pueda inyectar
 * mediciones falsas en el monitor. El collector manda el token en la cabecera
 * X-Collector-Token y aqui se compara en tiempo constante.
 *
 * Falla cerrado: si MONITOR_COLLECTOR_TOKEN no esta configurado en el
 * servidor, la ingesta se rechaza en vez de quedar abierta a cualquiera.
 */
final class AutenticacionCollector
{
    public const CABECERA = 'X-Collector-Token';

    /** Longitud minima para que el token no sea adivinable a mano. */
    private const LARGO_MINIMO = 16;

    public static function exigirToken(): void
    {
        $esperado = Config::get('MONITOR_COLLECTOR_TOKEN');

        if ($esperado === '') {
            throw new HttpException(
                503,
                'La ingesta del monitor esta deshabilitada: falta configurar MONITOR_COLLECTOR_TOKEN en el servidor.'
            );
        }

        if (strlen($esperado) < self::LARGO_MINIMO) {
            throw new HttpException(
                503,
                sprintf('MONITOR_COLLECTOR_TOKEN debe tener al menos %d caracteres.', self::LARGO_MINIMO)
            );
        }

        $recibido = self::tokenRecibido();

        if ($recibido === null || !hash_equals($esperado, $recibido)) {
            throw HttpException::noAutorizado('Token del collector invalido o ausente.');
        }
    }

    private static function tokenRecibido(): ?string
    {
        // php -S y Apache exponen las cabeceras arbitrarias con el prefijo HTTP_
        // y los guiones convertidos a guion bajo.
        $valor = $_SERVER['HTTP_X_COLLECTOR_TOKEN'] ?? null;

        if (!is_string($valor)) {
            return null;
        }

        $valor = trim($valor);

        return $valor === '' ? null : $valor;
    }
}
