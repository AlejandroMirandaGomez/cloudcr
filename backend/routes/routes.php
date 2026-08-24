<?php

declare(strict_types=1);

use CloudCR\Controllers\AuthController;
use CloudCR\Controllers\CatalogoController;
use CloudCR\Controllers\ControlController;
use CloudCR\Controllers\CuestionarioController;
use CloudCR\Controllers\EvaluadorController;
use CloudCR\Controllers\MadurezController;
use CloudCR\Controllers\MonitorController;
use CloudCR\Controllers\NormaController;
use CloudCR\Controllers\OrganizacionController;
use CloudCR\Controllers\ReporteController;
use CloudCR\Controllers\RespuestaController;
use CloudCR\Core\Response;
use CloudCR\Core\Router;

$router = new Router();

$auth           = new AuthController();
$organizaciones = new OrganizacionController();
$evaluadores    = new EvaluadorController();
$normas         = new NormaController();
$catalogos      = new CatalogoController();
$controles      = new ControlController();
$cuestionarios  = new CuestionarioController();
$respuestas     = new RespuestaController();
$madurez        = new MadurezController();
$reportes       = new ReporteController();
$monitor        = new MonitorController();

// ---------------------------------------------------------------- salud del API
$router->get('/', static function (): void {
    Response::ok([
        'api'     => 'Cloud CR - Cuestionario de Control Interno',
        'version' => '1.0',
        'estado'  => 'ok',
    ]);
});

$router->get('/salud', static function (): void {
    $version = \CloudCR\Core\Database::pdo()->query('SELECT version()')?->fetchColumn();
    Response::ok(['base_de_datos' => 'conectada', 'postgres' => $version]);
});

// ------------------------------------------------------------ HU-007 Autenticacion
$router->post('/auth/login', [$auth, 'login']);

// -------------------------------------------------------- HU-001 Organizaciones
$router->get('/organizaciones', [$organizaciones, 'index']);
$router->post('/organizaciones', [$organizaciones, 'store']);
$router->get('/organizaciones/{id}', [$organizaciones, 'show']);
$router->put('/organizaciones/{id}', [$organizaciones, 'update']);
$router->delete('/organizaciones/{id}', [$organizaciones, 'destroy']);
$router->get('/organizaciones/{id}/historial', [$reportes, 'historialOrganizacion']);

// ------------------------------------------------------------------ Evaluadores
$router->get('/evaluadores', [$evaluadores, 'index']);
$router->post('/evaluadores', [$evaluadores, 'store']);
$router->get('/evaluadores/{id}', [$evaluadores, 'show']);
$router->put('/evaluadores/{id}', [$evaluadores, 'update']);

// ------------------------------------------------- HU-004, HU-009 Normas
$router->get('/normas', [$normas, 'index']);
$router->post('/normas', [$normas, 'store']);
$router->get('/normas/{id}', [$normas, 'show']);
$router->put('/normas/{id}', [$normas, 'update']);
$router->delete('/normas/{id}', [$normas, 'destroy']);

// ------------------------------- Catalogos fijos de la norma (ISO/IEC 27002)
$router->get('/catalogos', [$catalogos, 'index']);

// ------------------------------------ HU-005, HU-010, HU-012 Controles
$router->get('/controles', [$controles, 'index']);
$router->post('/controles', [$controles, 'store']);
$router->get('/controles/{id}', [$controles, 'show']);
$router->put('/controles/{id}', [$controles, 'update']);
$router->delete('/controles/{id}', [$controles, 'destroy']);

// ------------------------------ HU-006, HU-016, HU-017 Cuestionarios
$router->get('/cuestionarios', [$cuestionarios, 'index']);
$router->post('/cuestionarios', [$cuestionarios, 'store']);
$router->get('/cuestionarios/{id}', [$cuestionarios, 'show']);
$router->put('/cuestionarios/{id}', [$cuestionarios, 'update']);
$router->delete('/cuestionarios/{id}', [$cuestionarios, 'destroy']);

// ------------------------------------- HU-013, HU-014 Respuestas
$router->get('/cuestionarios/{id}/respuestas/pendientes', [$respuestas, 'pendientes']);
$router->post('/cuestionarios/{id}/respuestas', [$respuestas, 'guardarLote']);
$router->get('/cuestionarios/{id}/respuestas/{preguntaId}', [$respuestas, 'show']);
$router->put('/cuestionarios/{id}/respuestas/{preguntaId}', [$respuestas, 'guardar']);
$router->delete('/cuestionarios/{id}/respuestas/{preguntaId}', [$respuestas, 'destroy']);

// ------------------------------- Nivel de madurez declarado por control
$router->get('/cuestionarios/{id}/niveles-madurez', [$madurez, 'index']);
$router->put('/cuestionarios/{id}/niveles-madurez/{controlId}', [$madurez, 'guardar']);

// -------------------------------------------- HU-018 Reportes
$router->get('/cuestionarios/{id}/resumen', [$reportes, 'resumen']);
$router->get('/cuestionarios/{id}/mapa-calor', [$reportes, 'mapaCalor']);
$router->get('/cuestionarios/{id}/hallazgos', [$reportes, 'hallazgos']);
$router->get('/cuestionarios/{id}/no-aplicables', [$reportes, 'noAplicables']);
$router->get('/cuestionarios/{id}/madurez', [$reportes, 'madurez']);
$router->get('/cuestionarios/{id}/riesgo', [$reportes, 'riesgo']);

// ------------------------------------------- Fase 2 - Monitor de Salud
// Lectura: restringido a 'evaluador' solo en frontend (ProtectedRoute); el
// backend todavia no valida sesion/rol en ningun endpoint (ver docs/Gaps.md).
$router->get('/monitor/bases-datos', [$monitor, 'basesDatos']);
$router->get('/monitor/indice', [$monitor, 'indice']);
$router->get('/monitor/alertas', [$monitor, 'alertas']);
$router->get('/monitor/historico', [$monitor, 'historico']);
$router->get('/monitor/variables', [$monitor, 'variables']);
$router->put('/monitor/ajustes', [$monitor, 'guardarAjustes']);
$router->get('/monitor/umbrales-indice', [$monitor, 'umbralesIndice']);
$router->put('/monitor/umbrales-indice', [$monitor, 'guardarUmbralesIndice']);

// Escritura: la usa el collector local, autenticado con el secreto compartido
// X-Collector-Token. Es el unico endpoint del API que exige credencial propia.
$router->post('/monitor/ingesta', [$monitor, 'ingesta']);
$router->post('/monitor/estado-caida', [$monitor, 'estadoCaida']);

return $router;