<?php

declare(strict_types=1);

namespace CloudCR\Core;

/**
 * Carga la configuracion desde config/.env (formato CLAVE=valor).
 * Si el archivo no existe se usan los valores por defecto de abajo,
 * asi el proyecto arranca en cualquier XAMPP/Laragon recien instalado.
 */
final class Config
{
    /** @var array<string,string>|null */
    private static ?array $values = null;

    private const DEFAULTS = [
        'DB_HOST'   => 'localhost',
        'DB_PORT'   => '5432',
        'DB_NAME'   => 'cloud_cr',
        'DB_USER'   => 'postgres',
        'DB_PASS'   => 'postgres',
        'APP_DEBUG' => 'true',
        'CORS_ORIGIN' => '*',
    ];

    public static function load(?string $envPath = null): void
    {
        if (self::$values !== null) {
            return;
        }

        $values = self::DEFAULTS;
        $envPath ??= __DIR__ . '/../../config/.env';

        if (is_readable($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                    continue;
                }
                [$key, $value] = explode('=', $line, 2);
                $values[trim($key)] = trim($value, " \t\"'");
            }
        }

        // Las variables de entorno reales ganan sobre el archivo (util en Docker).
        foreach (array_keys($values) as $key) {
            $fromEnv = getenv($key);
            if ($fromEnv !== false && $fromEnv !== '') {
                $values[$key] = $fromEnv;
            }
        }

        self::$values = $values;
    }

    public static function get(string $key, string $default = ''): string
    {
        self::load();
        return self::$values[$key] ?? $default;
    }

    public static function isDebug(): bool
    {
        return in_array(strtolower(self::get('APP_DEBUG')), ['1', 'true', 'yes'], true);
    }

    /** @return array{host:string,port:int,name:string,user:string,pass:string} */
    public static function db(): array
    {
        return [
            'host' => self::get('DB_HOST'),
            'port' => (int) self::get('DB_PORT', '5432'),
            'name' => self::get('DB_NAME'),
            'user' => self::get('DB_USER'),
            'pass' => self::get('DB_PASS'),
        ];
    }
}