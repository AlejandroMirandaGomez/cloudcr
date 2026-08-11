<?php

declare(strict_types=1);

// Aplica las migraciones pendientes en database/migrations/*.sql, en orden por
// nombre de archivo. Se corre en cada arranque del contenedor (ver Dockerfile)
// asi que debe ser idempotente: una migracion ya registrada en schema_migrations
// no se vuelve a ejecutar.
//
// Uso manual: php backend/scripts/migrate.php
// Prueba de disparo automatico del workflow de deploy (paths: backend/**).

require __DIR__ . '/../vendor/autoload.php';

use CloudCR\Core\Config;

Config::load();
$cfg = Config::db();

$dsn = sprintf(
    'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s;options=--client_encoding=UTF8',
    $cfg['host'],
    $cfg['port'],
    $cfg['name'],
    $cfg['sslmode']
);

$pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre TEXT PRIMARY KEY,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )'
);

$aplicadas = $pdo->query('SELECT nombre FROM schema_migrations')
    ->fetchAll(PDO::FETCH_COLUMN);

$dir = __DIR__ . '/../database/migrations';
$archivos = glob($dir . '/*.sql') ?: [];
sort($archivos);

if ($archivos === []) {
    fwrite(STDOUT, "[migrate] No hay migraciones en $dir\n");
    exit(0);
}

foreach ($archivos as $ruta) {
    $nombre = basename($ruta);

    if (in_array($nombre, $aplicadas, true)) {
        fwrite(STDOUT, "[migrate] Ya aplicada: $nombre\n");
        continue;
    }

    fwrite(STDOUT, "[migrate] Aplicando: $nombre\n");
    $sql = file_get_contents($ruta);
    if ($sql === false) {
        fwrite(STDERR, "[migrate] No se pudo leer $ruta\n");
        exit(1);
    }

    try {
        $pdo->exec($sql);
        $stmt = $pdo->prepare('INSERT INTO schema_migrations (nombre) VALUES (:nombre)');
        $stmt->execute(['nombre' => $nombre]);
        fwrite(STDOUT, "[migrate] OK: $nombre\n");
    } catch (PDOException $e) {
        fwrite(STDERR, "[migrate] Fallo en $nombre: " . $e->getMessage() . "\n");
        exit(1);
    }
}

fwrite(STDOUT, "[migrate] Listo.\n");
