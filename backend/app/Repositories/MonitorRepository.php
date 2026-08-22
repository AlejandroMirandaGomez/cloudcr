<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

/**
 * Datos simulados para el Monitor de Salud de Base de Datos (Fase 2).
 *
 * Deliberadamente NO extiende BaseRepository ni toca Database: mientras no se
 * confirme si habra una conexion Oracle real (ver claude.md), esta clase solo
 * devuelve fixtures fijas para que Persona C pueda maquetar el dashboard sin
 * bloquear a nadie ni tocar el esquema de PostgreSQL.
 *
 * Cada una de las 4 bases monitoreadas tiene su propio perfil (componentes,
 * alertas e historico) coherente con su nivel de salud declarado, en vez de
 * reusar un unico set de datos ficticio para las 4 (ver claude2.md).
 */
final class MonitorRepository
{
    /** Pesos propuestos por el documento del profesor (30% / 35% / 35%). */
    private const PESOS = ['procesos' => 0.30, 'memoria' => 0.35, 'archivos' => 0.35];

    private const PERFILES = [
        1 => [
            'nombre'         => 'ERP - Produccion',
            'motor'          => 'Oracle',
            'actualizado_en' => '2026-08-21 08:40',
            'componentes'    => [
                'procesos' => ['indicador' => 'IP', 'valor' => 91.0],
                'memoria'  => ['indicador' => 'IM', 'valor' => 86.0],
                'archivos' => ['indicador' => 'IA', 'valor' => 87.0],
            ],
            'alertas'  => [],
            'historico' => [79.4, 80.1, 81.0, 81.8, 82.5, 83.0, 83.6, 84.2, 84.9, 85.5, 86.1, 86.8, 87.3, 87.9],
        ],
        2 => [
            'nombre'         => 'CRM - Produccion',
            'motor'          => 'Oracle',
            'actualizado_en' => '2026-08-21 08:35',
            'componentes'    => [
                'procesos' => ['indicador' => 'IP', 'valor' => 95.0],
                'memoria'  => ['indicador' => 'IM', 'valor' => 93.0],
                'archivos' => ['indicador' => 'IA', 'valor' => 94.0],
            ],
            'alertas'  => [],
            'historico' => [90.5, 91.0, 91.8, 92.0, 92.6, 93.0, 93.2, 93.5, 93.6, 93.8, 93.7, 93.9, 93.8, 94.0],
        ],
        3 => [
            'nombre'         => 'CloudCR',
            'motor'          => 'PostgreSQL',
            'actualizado_en' => '2026-08-21 08:10',
            'componentes'    => [
                'procesos' => ['indicador' => 'IP', 'valor' => 70.0],
                'memoria'  => ['indicador' => 'IM', 'valor' => 62.0],
                'archivos' => ['indicador' => 'IA', 'valor' => 68.0],
            ],
            'alertas'  => [
                [
                    'id'          => 301,
                    'componente'  => 'archivos',
                    'severidad'   => 'critica',
                    'mensaje'     => 'Datafile USERS01.DBF al 96% de uso (umbral critico: 95%).',
                    'generada_en' => '2026-08-21 08:10',
                ],
                [
                    'id'          => 302,
                    'componente'  => 'procesos',
                    'severidad'   => 'advertencia',
                    'mensaje'     => '2 procesos bloqueados detectados en la ultima media hora.',
                    'generada_en' => '2026-08-21 07:55',
                ],
                [
                    'id'          => 303,
                    'componente'  => 'memoria',
                    'severidad'   => 'advertencia',
                    'mensaje'     => 'Uso de SGA en 89% y PGA en 82%, cerca del limite operativo.',
                    'generada_en' => '2026-08-21 07:40',
                ],
            ],
            'historico' => [78.0, 77.0, 76.0, 75.0, 73.5, 72.0, 70.5, 69.5, 68.5, 68.0, 67.5, 67.0, 66.8, 66.5],
        ],
        4 => [
            'nombre'         => 'Analytics DW',
            'motor'          => 'PostgreSQL',
            'actualizado_en' => '2026-08-21 08:20',
            'componentes'    => [
                'procesos' => ['indicador' => 'IP', 'valor' => 48.0],
                'memoria'  => ['indicador' => 'IM', 'valor' => 38.0],
                'archivos' => ['indicador' => 'IA', 'valor' => 45.0],
            ],
            'alertas'  => [
                [
                    'id'          => 401,
                    'componente'  => 'memoria',
                    'severidad'   => 'critica',
                    'mensaje'     => 'Memoria casi agotada: SGA en 97% y PGA en 93% de uso.',
                    'generada_en' => '2026-08-21 08:20',
                ],
                [
                    'id'          => 402,
                    'componente'  => 'archivos',
                    'severidad'   => 'critica',
                    'mensaje'     => 'Datafile ANALYTICS01.DBF al 99% de uso (umbral critico: 95%).',
                    'generada_en' => '2026-08-21 08:05',
                ],
                [
                    'id'          => 403,
                    'componente'  => 'procesos',
                    'severidad'   => 'critica',
                    'mensaje'     => '6 procesos bloqueados, por encima del limite operativo (5).',
                    'generada_en' => '2026-08-21 07:50',
                ],
                [
                    'id'          => 404,
                    'componente'  => 'archivos',
                    'severidad'   => 'advertencia',
                    'mensaje'     => '4 redo logs pendientes de archivar (limite recomendado: 3).',
                    'generada_en' => '2026-08-21 07:30',
                ],
            ],
            'historico' => [68.0, 65.0, 62.0, 59.0, 56.0, 53.5, 51.0, 49.0, 47.5, 46.0, 45.2, 44.5, 44.0, 43.5],
        ],
    ];

    /** Listado para MonitorSelectorPage: una tarjeta por base monitoreada. */
    public function basesDatos(): array
    {
        return array_map(function (int $id, array $perfil): array {
            $isbd   = $this->isbdDe($perfil['componentes']);
            $estado = $this->estadoDe($isbd);

            return [
                'id'             => $id,
                'nombre'         => $perfil['nombre'],
                'motor'          => $perfil['motor'],
                'isbd'           => $isbd,
                'estado'         => $estado['nombre'],
                'color'          => $estado['color'],
                'actualizado_en' => $perfil['actualizado_en'],
            ];
        }, array_keys(self::PERFILES), array_values(self::PERFILES));
    }

    /**
     * $baseDatosId viene de la ruta /monitor/:baseDatosId del frontend. Cada
     * base tiene su propio perfil simulado (ver PERFILES), coherente con el
     * nivel de salud mostrado en el selector.
     */
    public function indice(?string $baseDatosId = null): array
    {
        [$id, $perfil] = $this->perfilDe($baseDatosId);

        $componentes = [];
        foreach ($perfil['componentes'] as $clave => $comp) {
            $estado = $this->estadoDe($comp['valor']);
            $componentes[$clave] = [
                'indicador' => $comp['indicador'],
                'valor'     => $comp['valor'],
                'estado'    => $estado['nombre'],
                'color'     => $estado['color'],
            ];
        }

        $isbd = $this->isbdDe($perfil['componentes']);

        return [
            'base_datos' => ['id' => $id, 'nombre' => $perfil['nombre'], 'motor' => $perfil['motor']],
            'isbd' => [
                'valor'  => $isbd,
                'estado' => $this->estadoDe($isbd)['nombre'],
                'color'  => $this->estadoDe($isbd)['color'],
                'pesos'  => self::PESOS,
            ],
            'componentes'    => $componentes,
            'actualizado_en' => $perfil['actualizado_en'],
            'simulado'       => true,
        ];
    }

    public function alertas(?string $baseDatosId = null): array
    {
        [, $perfil] = $this->perfilDe($baseDatosId);

        return $perfil['alertas'];
    }

    public function historico(?string $baseDatosId = null): array
    {
        [, $perfil] = $this->perfilDe($baseDatosId);

        $valores = $perfil['historico'];
        $dias    = count($valores);

        return array_map(
            static fn(int $i, float $valor): array => [
                'fecha' => date('Y-m-d', strtotime(sprintf('2026-08-21 -%d days', $dias - 1 - $i))),
                'isbd'  => $valor,
            ],
            range(0, $dias - 1),
            $valores
        );
    }

    /** @return array{0:int,1:array} */
    private function perfilDe(?string $baseDatosId): array
    {
        $id = $baseDatosId !== null && isset(self::PERFILES[(int) $baseDatosId]) ? (int) $baseDatosId : 1;

        return [$id, self::PERFILES[$id]];
    }

    private function isbdDe(array $componentes): float
    {
        return round(
            self::PESOS['procesos'] * $componentes['procesos']['valor']
            + self::PESOS['memoria'] * $componentes['memoria']['valor']
            + self::PESOS['archivos'] * $componentes['archivos']['valor'],
            1
        );
    }

    /** Escala 0-100 propuesta en el documento del profesor. */
    private function estadoDe(float $valor): array
    {
        return match (true) {
            $valor >= 75 => ['nombre' => 'Verde', 'color' => 'verde'],
            $valor >= 60 => ['nombre' => 'Amarillo', 'color' => 'amarillo'],
            default      => ['nombre' => 'Rojo', 'color' => 'rojo'],
        };
    }
}
