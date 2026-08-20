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

    /**
     * Bases de datos monitoreadas (mock para la pantalla selectora). El ISBD
     * de esta lista es independiente del que arma indice(): todavia no hay
     * datos reales por base, solo se usa para pintar el semaforo de cada
     * tarjeta en el selector.
     */
    private const BASES_DATOS = [
        ['id' => 1, 'nombre' => 'ERP - Produccion', 'motor' => 'Oracle', 'isbd' => 82.1, 'actualizado_en' => '2026-08-12 09:40'],
        ['id' => 2, 'nombre' => 'CRM - Produccion', 'motor' => 'Oracle', 'isbd' => 93.5, 'actualizado_en' => '2026-08-12 09:35'],
        ['id' => 3, 'nombre' => 'CloudCR', 'motor' => 'PostgreSQL', 'isbd' => 67.4, 'actualizado_en' => '2026-08-12 09:28'],
        ['id' => 4, 'nombre' => 'Analytics DW', 'motor' => 'PostgreSQL', 'isbd' => 46.0, 'actualizado_en' => '2026-08-12 08:55'],
    ];

    /** Listado para MonitorSelectorPage: una tarjeta por base monitoreada. */
    public function basesDatos(): array
    {
        return array_map(function (array $b): array {
            $estado = $this->estadoDe($b['isbd']);

            return [
                'id'             => $b['id'],
                'nombre'         => $b['nombre'],
                'motor'          => $b['motor'],
                'isbd'           => $b['isbd'],
                'estado'         => $estado['nombre'],
                'color'          => $estado['color'],
                'actualizado_en' => $b['actualizado_en'],
            ];
        }, self::BASES_DATOS);
    }

    /**
     * $baseDatosId viene de la ruta /monitor/:baseDatosId del frontend. Los
     * valores simulados de componentes/ISBD todavia no cambian por base (ver
     * claude2.md), pero la respuesta si identifica cual base los pidio.
     */
    public function indice(?string $baseDatosId = null): array
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
            'base_datos' => $this->baseDatosDe($baseDatosId),
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

    /** Resuelve el nombre/motor de la base para el header del dashboard. */
    private function baseDatosDe(?string $baseDatosId): ?array
    {
        if ($baseDatosId === null) {
            return null;
        }

        foreach (self::BASES_DATOS as $b) {
            if ((string) $b['id'] === $baseDatosId) {
                return ['id' => $b['id'], 'nombre' => $b['nombre'], 'motor' => $b['motor']];
            }
        }

        return ['id' => $baseDatosId, 'nombre' => null, 'motor' => null];
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
