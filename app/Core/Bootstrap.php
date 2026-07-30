<?php

declare(strict_types=1);

require __DIR__ . '/../../vendor/autoload.php';

\CloudCR\Core\Config::load();

mb_internal_encoding('UTF-8');
date_default_timezone_set('America/Costa_Rica');

// En desarrollo los errores se ven en el log, nunca en el cuerpo de la respuesta JSON.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);