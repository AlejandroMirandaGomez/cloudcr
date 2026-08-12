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
 */
final class MonitorRepository
{
    /** Pesos propuestos por el documento del profesor (30% / 35% / 35%). */
    private const PESOS = ['procesos' => 0.30, 'memoria' => 0.35, 'archivos' => 0.35];

    public function indice(): array
    {
        $componentes = [
            'procesos' => $this->componenteProcesos(),
            'memoria'  => $this->componenteMemoria(),
            'archivos' => $this->componenteArchivos(),
        ];

        $isbd = round(
            self::PESOS['procesos'] * $componentes['procesos']['valor']
            + self::PESOS['memoria'] * $componentes['memoria']['valor']
            + self::PESOS['archivos'] * $componentes['archivos']['valor'],
            1
        );

        return [
            'isbd' => [
                'valor'  => $isbd,
                'estado' => $this->estadoDe($isbd)['nombre'],
                'color'  => $this->estadoDe($isbd)['color'],
                'pesos'  => self::PESOS,
            ],
            'componentes'    => $componentes,
            'actualizado_en' => '2026-08-12 09:40',
            'simulado'       => true,
        ];
    }

    public function alertas(): array
    {
        return [
            [
                'id'           => 1,
                'componente'   => 'archivos',
                'severidad'    => 'critica',
                'mensaje'      => 'Datafile USERS01.DBF al 96% de uso (umbral critico: 95%).',
                'generada_en'  => '2026-08-12 09:12',
            ],
            [
                'id'           => 2,
                'componente'   => 'memoria',
                'severidad'    => 'advertencia',
                'mensaje'      => 'Buffer cache hit ratio en 91% (umbral recomendado: >= 95%).',
                'generada_en'  => '2026-08-12 08:47',
            ],
            [
                'id'           => 3,
                'componente'   => 'procesos',
                'severidad'    => 'advertencia',
                'mensaje'      => '1 proceso bloqueado detectado en la ultima media hora.',
                'generada_en'  => '2026-08-12 08:10',
            ],
        ];
    }

    public function historico(): array
    {
        $valores = [75.4, 76.1, 77.8, 79.0, 78.2, 80.5, 81.0, 79.8, 83.2, 84.0, 82.7, 81.5, 83.0, 82.1];
        $dias    = count($valores);

        return array_map(
            static fn(int $i, float $valor): array => [
                'fecha' => date('Y-m-d', strtotime(sprintf('2026-08-12 -%d days', $dias - 1 - $i))),
                'isbd'  => $valor,
            ],
            range(0, $dias - 1),
            $valores
        );
    }

    private function componenteProcesos(): array
    {
        $valor = 88.0;

        return [
            'indicador' => 'IP',
            'valor'     => $valor,
            'estado'    => $this->estadoDe($valor)['nombre'],
            'color'     => $this->estadoDe($valor)['color'],
            'metricas'  => [
                ['etiqueta' => 'Sesiones activas', 'valor' => 142, 'limite' => 300, 'unidad' => 'sesiones'],
                ['etiqueta' => 'Procesos bloqueados', 'valor' => 1, 'limite' => 5, 'unidad' => 'procesos'],
                ['etiqueta' => 'Uso del limite de procesos', 'valor' => 47, 'limite' => 100, 'unidad' => '%'],
            ],
        ];
    }

    private function componenteMemoria(): array
    {
        $valor = 74.0;

        return [
            'indicador' => 'IM',
            'valor'     => $valor,
            'estado'    => $this->estadoDe($valor)['nombre'],
            'color'     => $this->estadoDe($valor)['color'],
            'metricas'  => [
                ['etiqueta' => 'Uso de SGA', 'valor' => 81, 'limite' => 100, 'unidad' => '%'],
                ['etiqueta' => 'Uso de PGA', 'valor' => 63, 'limite' => 100, 'unidad' => '%'],
                ['etiqueta' => 'Buffer cache hit ratio', 'valor' => 91, 'limite' => 95, 'unidad' => '%'],
            ],
        ];
    }

    private function componenteArchivos(): array
    {
        $valor = 85.0;

        return [
            'indicador' => 'IA',
            'valor'     => $valor,
            'estado'    => $this->estadoDe($valor)['nombre'],
            'color'     => $this->estadoDe($valor)['color'],
            'metricas'  => [
                ['etiqueta' => 'Uso de datafiles', 'valor' => 62, 'limite' => 100, 'unidad' => '%'],
                ['etiqueta' => 'Datafile mas cargado (USERS01.DBF)', 'valor' => 96, 'limite' => 95, 'unidad' => '%'],
                ['etiqueta' => 'Redo logs pendientes de archivar', 'valor' => 0, 'limite' => 3, 'unidad' => 'logs'],
            ],
        ];
    }

    /** Escala 0-100 propuesta en el documento del profesor. */
    private function estadoDe(float $valor): array
    {
        return match (true) {
            $valor >= 90 => ['nombre' => 'Optimo', 'color' => 'verde'],
            $valor >= 75 => ['nombre' => 'Saludable', 'color' => 'verde'],
            $valor >= 60 => ['nombre' => 'Advertencia', 'color' => 'amarillo'],
            $valor >= 40 => ['nombre' => 'Degradado', 'color' => 'rojo'],
            default      => ['nombre' => 'Critico', 'color' => 'rojo'],
        };
    }
}
