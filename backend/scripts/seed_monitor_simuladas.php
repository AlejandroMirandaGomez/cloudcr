<?php

declare(strict_types=1);

/**
 * Siembra las 4 bases "quemadas" del Monitor de Salud (Fase 2).
 *
 * Antes vivian como fixtures en MonitorRepository.php y en variablesMonitor.js.
 * Al pasar el monitor a datos reales quedaron fuera; este script las reinserta
 * como bases simuladas para poder mostrarlas junto a la instancia Oracle real.
 *
 * Reusa MonitorRepository::registrarSnapshot(), o sea el mismo pipeline que el
 * collector: el backend calcula IP/IM/IA, ISBD y las alertas. No son snapshots
 * escritos a mano.
 *
 * Idempotente: borra estas 4 bases por nombre y las vuelve a crear. No toca la
 * instancia Oracle real ni ninguna otra base.
 *
 * Uso:  php backend/scripts/seed_monitor_simuladas.php
 */

require __DIR__ . '/../vendor/autoload.php';

use CloudCR\Core\Config;
use CloudCR\Core\Database;
use CloudCR\Repositories\MonitorRepository;

Config::load();

/**
 * Valor de cada variable (p1..p8, m1..m9, a1..a8) por base, tal como estaban en
 * variablesMonitor.js (valoresPorBase 1..4). El orden de las claves no importa.
 */
$BASES = [
    [
        'base_datos' => ['nombre' => 'ERP - Produccion', 'motor' => 'Oracle'],
        'mediciones' => [
            'p1' => 210, 'p2' => 500, 'p3' => 140, 'p4' => 55, 'p5' => 83, 'p6' => 0, 'p7' => 0, 'p8' => 42,
            'm1' => 16, 'm2' => 28, 'm3' => 55, 'm4' => 60, 'm5' => 4, 'm6' => 58, 'm7' => 70, 'm8' => 0, 'm9' => 96,
            'a1' => 24, 'a2' => 0, 'a3' => 55, 'a4' => 35, 'a5' => 50, 'a6' => 0, 'a7' => 0, 'a8' => 0,
        ],
    ],
    [
        'base_datos' => ['nombre' => 'CRM - Produccion', 'motor' => 'Oracle'],
        'mediciones' => [
            'p1' => 180, 'p2' => 500, 'p3' => 95, 'p4' => 30, 'p5' => 64, 'p6' => 0, 'p7' => 0, 'p8' => 30,
            'm1' => 32, 'm2' => 35, 'm3' => 40, 'm4' => 48, 'm5' => 6, 'm6' => 45, 'm7' => 60, 'm8' => 0, 'm9' => 98,
            'a1' => 40, 'a2' => 0, 'a3' => 40, 'a4' => 48, 'a5' => 35, 'a6' => 0, 'a7' => 0, 'a8' => 0,
        ],
    ],
    [
        'base_datos' => ['nombre' => 'CloudCR', 'motor' => 'PostgreSQL'],
        'mediciones' => [
            'p1' => 410, 'p2' => 500, 'p3' => 255, 'p4' => 190, 'p5' => 60, 'p6' => 3, 'p7' => 4, 'p8' => 78,
            'm1' => 8, 'm2' => 12, 'm3' => 82, 'm4' => 85, 'm5' => 3, 'm6' => 80, 'm7' => 90, 'm8' => 2, 'm9' => 88,
            'a1' => 18, 'a2' => 1, 'a3' => 82, 'a4' => 15, 'a5' => 80, 'a6' => 2, 'a7' => 1, 'a8' => 0,
        ],
    ],
    [
        'base_datos' => ['nombre' => 'Analytics DW', 'motor' => 'PostgreSQL'],
        'mediciones' => [
            'p1' => 485, 'p2' => 500, 'p3' => 298, 'p4' => 270, 'p5' => 20, 'p6' => 7, 'p7' => 11, 'p8' => 96,
            'm1' => 24, 'm2' => 3, 'm3' => 97, 'm4' => 95, 'm5' => 5, 'm6' => 94, 'm7' => 99, 'm8' => 6, 'm9' => 70,
            'a1' => 30, 'a2' => 4, 'a3' => 96, 'a4' => 5, 'a5' => 93, 'a6' => 6, 'a7' => 3, 'a8' => 2,
        ],
    ],
];

$pdo  = Database::pdo();
$repo = new MonitorRepository();

$nombres = array_map(static fn(array $b): string => $b['base_datos']['nombre'], $BASES);

// Idempotencia: borra las 4 simuladas (cascade limpia snapshots/mediciones/alertas).
$marcadores = implode(',', array_fill(0, count($nombres), '?'));
$borradas   = $pdo->prepare("DELETE FROM Monitor_Bases_Datos WHERE nombre IN ($marcadores)");
$borradas->execute($nombres);
fwrite(STDOUT, sprintf("[seed] Borradas %d bases simuladas previas.\n", $borradas->rowCount()));

foreach ($BASES as $base) {
    $r = $repo->registrarSnapshot($base);
    fwrite(STDOUT, sprintf(
        "[seed] %-18s ISBD=%.2f  IP=%.1f IM=%.1f IA=%.1f  %d alertas\n",
        $base['base_datos']['nombre'],
        $r['isbd'],
        $r['componentes']['procesos'],
        $r['componentes']['memoria'],
        $r['componentes']['archivos'],
        $r['alertas']
    ));
}

fwrite(STDOUT, "[seed] Listo.\n");
