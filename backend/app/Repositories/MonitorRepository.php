<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

use CloudCR\Core\Database;
use CloudCR\Core\HttpException;
use CloudCR\Monitor\CalculadoraSalud;
use PDO;

/**
 * Fase 2 - Monitor de Salud de Base de Datos.
 *
 * Ya no devuelve fixtures: lee las tablas Monitor_* que llena el collector
 * local (collector/) por POST /monitor/ingesta. El collector es quien se
 * conecta a Oracle; aqui solo se reciben las mediciones ya tomadas, se
 * calculan los indicadores con CalculadoraSalud y se sirve el ultimo estado
 * al dashboard.
 *
 * Las marcas de tiempo se devuelven ya formateadas en la zona horaria de
 * Costa Rica, porque el backend corre en UTC (Render) y el dashboard muestra
 * el texto tal cual.
 */
final class MonitorRepository extends BaseRepository
{
    private const ZONA = 'America/Costa_Rica';

    /** Cuantos snapshots devuelve el historico por defecto. */
    private const HISTORICO_POR_DEFECTO = 30;
    private const HISTORICO_MAXIMO      = 500;

    /**
     * Tope de una medicion. Monitor_Mediciones.valor es NUMERIC(14,2), asi que
     * un valor mas grande hace fallar el INSERT con un 500 poco util; se
     * rechaza antes con un 422 que dice cual variable viene mal.
     */
    private const VALOR_MAXIMO = 1_000_000_000_000.0;

    private const FECHA = "to_char(%s AT TIME ZONE '" . self::ZONA . "', 'YYYY-MM-DD HH24:MI:SS')";

    // ---------------------------------------------------------------- lectura

    /** Listado para MonitorSelectorPage: una tarjeta por base monitoreada. */
    public function basesDatos(): array
    {
        $sql = sprintf(
            'SELECT b.id, b.nombre, b.motor, b.host, b.puerto, b.servicio,
                    b.caida, b.caida_motivo,
                    s.isbd, %s AS actualizado_en
             FROM Monitor_Bases_Datos b
             LEFT JOIN LATERAL (
                 SELECT isbd, capturado_en
                 FROM Monitor_Snapshots
                 WHERE base_datos_id = b.id
                 ORDER BY capturado_en DESC, id DESC
                 LIMIT 1
             ) s ON TRUE
             WHERE b.activa
             ORDER BY b.nombre',
            sprintf(self::FECHA, 's.capturado_en')
        );

        $filas = $this->run($sql)->fetchAll();

        return array_map(static function (array $fila): array {
            $isbd = $fila['isbd'] === null ? null : (float) $fila['isbd'];

            // Una base caida gana sobre su ultimo ISBD: ya no es de fiar.
            // Sin snapshot todavia = base recien registrada.
            $estado = match (true) {
                (bool) $fila['caida'] => ['nombre' => 'Caida', 'color' => 'caida'],
                $isbd === null        => ['nombre' => 'Sin datos', 'color' => 'gris'],
                default               => CalculadoraSalud::estadoDeIndice($isbd),
            };

            return [
                'id'             => (int) $fila['id'],
                'nombre'         => $fila['nombre'],
                'motor'          => $fila['motor'],
                'host'           => $fila['host'],
                'puerto'         => $fila['puerto'] === null ? null : (int) $fila['puerto'],
                'servicio'       => $fila['servicio'],
                'isbd'           => $isbd,
                'estado'         => $estado['nombre'],
                'color'          => $estado['color'],
                'caida'          => (bool) $fila['caida'],
                'caida_motivo'   => $fila['caida_motivo'],
                'actualizado_en' => $fila['actualizado_en'] ?? 'Sin datos aun',
            ];
        }, $filas);
    }

    /**
     * Marca (o limpia) el estado de caida de una base. Lo llama el collector
     * cuando no puede leer la instancia. Devuelve la base afectada.
     */
    public function marcarCaida(string $nombre, bool $caida, ?string $motivo = null): array
    {
        $sql = $caida
            ? 'UPDATE Monitor_Bases_Datos
                   SET caida = TRUE,
                       caida_desde = COALESCE(caida_desde, now()),
                       caida_motivo = :motivo
                 WHERE nombre = :nombre
                 RETURNING id, nombre, caida'
            : 'UPDATE Monitor_Bases_Datos
                   SET caida = FALSE, caida_desde = NULL, caida_motivo = NULL
                 WHERE nombre = :nombre
                 RETURNING id, nombre, caida';

        $params = ['nombre' => $nombre];
        if ($caida) {
            $params['motivo'] = $motivo !== null ? mb_substr($motivo, 0, 500) : 'Sin detalle.';
        }

        $fila = $this->run($sql, $params)->fetch();

        if ($fila === false) {
            throw new HttpException(404, sprintf('No hay una base monitoreada llamada "%s".', $nombre));
        }

        return [
            'id'     => (int) $fila['id'],
            'nombre' => $fila['nombre'],
            'caida'  => (bool) $fila['caida'],
        ];
    }

    /** Indice de salud (ISBD + IP/IM/IA) del ultimo snapshot de la base. */
    public function indice(?string $baseDatosId = null): array
    {
        $base     = $this->baseDatos($baseDatosId);
        $snapshot = $this->ultimoSnapshot($base['id']);

        if ($snapshot === null) {
            throw new HttpException(
                404,
                sprintf('La base "%s" todavia no tiene mediciones. Ejecute el collector local.', $base['nombre'])
            );
        }

        $componentes = [];
        foreach (CalculadoraSalud::COMPONENTES as $componente) {
            $valor  = (float) $snapshot[self::columnaIndice($componente)];
            $estado = CalculadoraSalud::estadoDeIndice($valor);

            $componentes[$componente] = [
                'indicador' => CalculadoraSalud::INDICADORES[$componente],
                'valor'     => $valor,
                'estado'    => $estado['nombre'],
                'color'     => $estado['color'],
            ];
        }

        $isbd   = (float) $snapshot['isbd'];
        $estado = CalculadoraSalud::estadoDeIndice($isbd);

        return [
            'base_datos' => [
                'id'           => $base['id'],
                'nombre'       => $base['nombre'],
                'motor'        => $base['motor'],
                'caida'        => $base['caida'],
                'caida_motivo' => $base['caida_motivo'],
            ],
            'isbd' => [
                'valor'  => $isbd,
                'estado' => $estado['nombre'],
                'color'  => $estado['color'],
                'pesos'  => [
                    'procesos' => (float) $snapshot['peso_procesos'],
                    'memoria'  => (float) $snapshot['peso_memoria'],
                    'archivos' => (float) $snapshot['peso_archivos'],
                ],
            ],
            'componentes'    => $componentes,
            'actualizado_en' => $snapshot['capturado_en'],
            'simulado'       => false,
        ];
    }

    /** Alertas del ultimo snapshot, mas severas primero. */
    public function alertas(?string $baseDatosId = null): array
    {
        $base     = $this->baseDatos($baseDatosId);
        $snapshot = $this->ultimoSnapshot($base['id']);

        if ($snapshot === null) {
            return [];
        }

        $sql = sprintf(
            "SELECT id, componente, variable_codigo, severidad, mensaje, %s AS generada_en
             FROM Monitor_Alertas
             WHERE snapshot_id = :snapshot
             ORDER BY CASE severidad WHEN 'critica' THEN 0 ELSE 1 END, variable_codigo",
            sprintf(self::FECHA, 'generada_en')
        );

        return array_map(
            static fn(array $f): array => [
                'id'          => (int) $f['id'],
                'componente'  => $f['componente'],
                'variable'    => $f['variable_codigo'],
                'severidad'   => $f['severidad'],
                'mensaje'     => $f['mensaje'],
                'generada_en' => $f['generada_en'],
            ],
            $this->run($sql, ['snapshot' => $snapshot['id']])->fetchAll()
        );
    }

    /** Evolucion del ISBD, del snapshot mas viejo al mas reciente. */
    public function historico(?string $baseDatosId = null, ?string $limite = null): array
    {
        $base   = $this->baseDatos($baseDatosId);
        $cuantos = $limite === null ? self::HISTORICO_POR_DEFECTO : (int) $limite;
        $cuantos = max(2, min($cuantos, self::HISTORICO_MAXIMO));

        // La subconsulta toma los N mas recientes; el ORDER BY externo los
        // devuelve en orden cronologico, que es como los dibuja el grafico.
        $sql = sprintf(
            'SELECT * FROM (
                 SELECT id, isbd, ip, im, ia, capturado_en,
                        %s AS fecha,
                        %s AS etiqueta
                 FROM Monitor_Snapshots
                 WHERE base_datos_id = :base
                 ORDER BY capturado_en DESC, id DESC
                 LIMIT %d
             ) ultimos
             ORDER BY capturado_en ASC, id ASC',
            sprintf(self::FECHA, 'capturado_en'),
            sprintf("to_char(capturado_en AT TIME ZONE '%s', 'HH24:MI:SS')", self::ZONA),
            $cuantos
        );

        return array_map(
            static fn(array $f): array => [
                'id'       => (int) $f['id'],
                'fecha'    => $f['fecha'],
                'etiqueta' => $f['etiqueta'],
                'isbd'     => (float) $f['isbd'],
                'ip'       => (float) $f['ip'],
                'im'       => (float) $f['im'],
                'ia'       => (float) $f['ia'],
            ],
            $this->run($sql, ['base' => $base['id']])->fetchAll()
        );
    }

    /**
     * Catalogo de variables de un componente con el valor medido en el ultimo
     * snapshot. Es lo que alimenta las tablas de detalle del frontend, que
     * antes leian el arreglo simulado de variablesMonitor.js.
     */
    public function variables(?string $baseDatosId = null, ?string $componente = null): array
    {
        if ($componente !== null && !in_array($componente, CalculadoraSalud::COMPONENTES, true)) {
            throw HttpException::validacion(['componente' => 'Debe ser procesos, memoria o archivos.']);
        }

        $base     = $this->baseDatos($baseDatosId);
        $snapshot = $this->ultimoSnapshot($base['id']);

        $params = ['snapshot' => $snapshot['id'] ?? null];
        $filtro = '';
        if ($componente !== null) {
            $filtro = ' WHERE v.componente = :componente';
            $params['componente'] = $componente;
        }

        $sql = 'SELECT v.codigo, v.componente, v.orden, v.variable, v.descripcion, v.fuente,
                       v.unidad, v.sentido, v.limite_advertencia, v.limite_critico, v.peso,
                       v.justificacion, m.valor
                FROM Monitor_Variables v
                LEFT JOIN Monitor_Mediciones m
                       ON m.variable_codigo = v.codigo AND m.snapshot_id = :snapshot'
            . $filtro
            . ' ORDER BY v.componente, v.orden';

        return array_map(static function (array $f): array {
            $definicion = [
                'sentido'            => $f['sentido'],
                'limite_advertencia' => $f['limite_advertencia'] === null ? null : (float) $f['limite_advertencia'],
                'limite_critico'     => $f['limite_critico'] === null ? null : (float) $f['limite_critico'],
            ];

            $valor   = $f['valor'] === null ? null : (float) $f['valor'];
            $color   = $valor === null ? null : CalculadoraSalud::colorDeVariable($definicion, $valor);
            $puntaje = $valor === null ? null : CalculadoraSalud::puntajeDeVariable($definicion, $valor);

            return [
                'id'                 => $f['codigo'],
                'codigo'             => $f['codigo'],
                'componente'         => $f['componente'],
                'variable'           => $f['variable'],
                'descripcion'        => $f['descripcion'],
                'fuente'             => $f['fuente'],
                'unidad'             => $f['unidad'],
                'sentido'            => $f['sentido'],
                'limite_advertencia' => $definicion['limite_advertencia'],
                'limite_critico'     => $definicion['limite_critico'],
                'peso'               => (float) $f['peso'],
                'justificacion'      => $f['justificacion'],
                'valor'              => $valor,
                'puntaje'            => $puntaje,
                'color'              => $color,
                'estado'             => $color === null ? null : ucfirst($color),
            ];
        }, $this->run($sql, $params)->fetchAll());
    }

    // ---------------------------------------------------------------- ingesta

    /**
     * Guarda un snapshot empujado por el collector local: registra la base si
     * es nueva, calcula IP/IM/IA e ISBD y deja las alertas por variable fuera
     * de umbral.
     *
     * La marca de tiempo es la de llegada al API (now() del servidor) y no una
     * enviada por el collector, para que el orden del historico no dependa del
     * reloj de la maquina local.
     *
     * @param array{base_datos:array<string,mixed>,mediciones:array<string,mixed>} $payload
     */
    public function registrarSnapshot(array $payload): array
    {
        $catalogo = $this->catalogo();
        $medidas  = $this->normalizarMediciones($payload['mediciones'], $catalogo);

        [$indices, $alertas] = $this->evaluar($medidas, $catalogo);
        $isbd = CalculadoraSalud::isbd($indices);

        return Database::transaction(function (PDO $pdo) use ($payload, $medidas, $indices, $isbd, $alertas): array {
            $baseId = $this->registrarBaseDatos($payload['base_datos']);

            $snapshotId = (int) $this->run(
                'INSERT INTO Monitor_Snapshots
                     (base_datos_id, ip, im, ia, isbd, peso_procesos, peso_memoria, peso_archivos)
                 VALUES (:base, :ip, :im, :ia, :isbd, :wp, :wm, :wa)
                 RETURNING id',
                [
                    'base' => $baseId,
                    'ip'   => $indices['procesos'],
                    'im'   => $indices['memoria'],
                    'ia'   => $indices['archivos'],
                    'isbd' => $isbd,
                    'wp'   => CalculadoraSalud::PESOS_COMPONENTES['procesos'],
                    'wm'   => CalculadoraSalud::PESOS_COMPONENTES['memoria'],
                    'wa'   => CalculadoraSalud::PESOS_COMPONENTES['archivos'],
                ]
            )->fetchColumn();

            $this->insertarMediciones($snapshotId, $medidas);
            $this->insertarAlertas($snapshotId, $alertas);

            return [
                'snapshot_id'  => $snapshotId,
                'base_datos_id' => $baseId,
                'isbd'         => $isbd,
                'componentes'  => $indices,
                'alertas'      => count($alertas),
                'mediciones'   => count($medidas),
            ];
        });
    }

    // ----------------------------------------------------------------- ayuda

    /** @return array<string,array<string,mixed>> codigo => definicion */
    private function catalogo(): array
    {
        $filas = $this->run(
            'SELECT codigo, componente, variable, unidad, sentido,
                    limite_advertencia, limite_critico, peso, penaliza
             FROM Monitor_Variables'
        )->fetchAll();

        if ($filas === []) {
            throw new HttpException(
                500,
                'El catalogo Monitor_Variables esta vacio. Aplique las migraciones del monitor.'
            );
        }

        $catalogo = [];
        foreach ($filas as $f) {
            $catalogo[$f['codigo']] = [
                'codigo'             => $f['codigo'],
                'componente'         => $f['componente'],
                'variable'           => $f['variable'],
                'unidad'             => $f['unidad'],
                'sentido'            => $f['sentido'],
                'limite_advertencia' => $f['limite_advertencia'] === null ? null : (float) $f['limite_advertencia'],
                'limite_critico'     => $f['limite_critico'] === null ? null : (float) $f['limite_critico'],
                'peso'               => (float) $f['peso'],
                'penaliza'           => (bool) $f['penaliza'],
            ];
        }

        return $catalogo;
    }

    /**
     * Valida los codigos y valores enviados por el collector.
     *
     * @param array<string,mixed> $mediciones
     * @param array<string,array<string,mixed>> $catalogo
     * @return array<string,float> codigo => valor
     */
    private function normalizarMediciones(array $mediciones, array $catalogo): array
    {
        $errores = [];
        $medidas = [];

        foreach ($mediciones as $codigo => $valor) {
            if (!is_string($codigo) || !isset($catalogo[$codigo])) {
                $errores["mediciones.$codigo"] = 'No existe esa variable en Monitor_Variables.';
                continue;
            }
            if (!is_numeric($valor)) {
                $errores["mediciones.$codigo"] = 'El valor debe ser numerico.';
                continue;
            }

            $numero = (float) $valor;
            if (!is_finite($numero) || abs($numero) >= self::VALOR_MAXIMO) {
                $errores["mediciones.$codigo"] = sprintf(
                    'El valor esta fuera del rango admitido (menor a %s en valor absoluto).',
                    number_format(self::VALOR_MAXIMO, 0, '.', ' ')
                );
                continue;
            }

            $medidas[$codigo] = round($numero, 2);
        }

        // Cada componente necesita al menos una variable con umbrales para que
        // su indicador (IP/IM/IA) tenga sentido; si no, el ISBD saldria sesgado.
        foreach (CalculadoraSalud::COMPONENTES as $componente) {
            $medibles = array_filter(
                array_keys($medidas),
                static fn(string $c): bool => $catalogo[$c]['componente'] === $componente
                    && $catalogo[$c]['sentido'] !== 'fijo'
            );

            if ($medibles === []) {
                $errores["mediciones.$componente"] =
                    'Falta al menos una variable con umbrales de este componente.';
            }
        }

        if ($errores !== []) {
            throw HttpException::validacion($errores);
        }

        return $medidas;
    }

    /**
     * Calcula IP/IM/IA y arma las alertas de las variables fuera de umbral.
     *
     * @param array<string,float> $medidas
     * @param array<string,array<string,mixed>> $catalogo
     * @return array{0:array<string,float>,1:list<array<string,mixed>>}
     */
    private function evaluar(array $medidas, array $catalogo): array
    {
        $porComponente = array_fill_keys(CalculadoraSalud::COMPONENTES, []);
        $alertas       = [];

        foreach ($medidas as $codigo => $valor) {
            $definicion = $catalogo[$codigo];
            $puntaje    = CalculadoraSalud::puntajeDeVariable($definicion, $valor);
            $penaliza   = $definicion['penaliza'];

            $porComponente[$definicion['componente']][] = [
                'peso'     => $definicion['peso'],
                'puntaje'  => $puntaje,
                'penaliza' => $penaliza,
            ];

            $color     = CalculadoraSalud::colorDeVariable($definicion, $valor);
            $severidad = $color === null ? null : CalculadoraSalud::severidadDeColor($color);

            // Las variables acumulativas (m7/m8) no generan alerta: su color es
            // un pico historico, no un problema en curso que se pueda atender.
            if ($severidad !== null && $penaliza) {
                $alertas[] = [
                    'componente' => $definicion['componente'],
                    'codigo'     => $codigo,
                    'severidad'  => $severidad,
                    'mensaje'    => CalculadoraSalud::mensajeDeAlerta($definicion, $valor, $color),
                ];
            }
        }

        $indices = [];
        foreach ($porComponente as $componente => $variables) {
            $indice = CalculadoraSalud::indiceComponente($variables);
            if ($indice === null) {
                // normalizarMediciones() ya garantiza que esto no pase.
                throw new HttpException(500, sprintf('No se pudo calcular el indicador de %s.', $componente));
            }
            $indices[$componente] = $indice;
        }

        return [$indices, $alertas];
    }

    /** @param array<string,mixed> $datos */
    private function registrarBaseDatos(array $datos): int
    {
        return (int) $this->run(
            'INSERT INTO Monitor_Bases_Datos (nombre, motor, host, puerto, servicio)
             VALUES (:nombre, :motor, :host, :puerto, :servicio)
             ON CONFLICT (nombre) DO UPDATE SET
                 motor    = EXCLUDED.motor,
                 host     = EXCLUDED.host,
                 puerto   = EXCLUDED.puerto,
                 servicio = EXCLUDED.servicio,
                 activa   = TRUE,
                 -- Llego un snapshot: la base respondio, ya no esta caida.
                 caida        = FALSE,
                 caida_desde  = NULL,
                 caida_motivo = NULL
             RETURNING id',
            [
                'nombre'   => $datos['nombre'],
                'motor'    => $datos['motor'] ?? 'Oracle',
                'host'     => $datos['host'] ?? null,
                'puerto'   => isset($datos['puerto']) ? (int) $datos['puerto'] : null,
                'servicio' => $datos['servicio'] ?? null,
            ]
        )->fetchColumn();
    }

    /** @param array<string,float> $medidas */
    private function insertarMediciones(int $snapshotId, array $medidas): void
    {
        $valores = [];
        $params  = ['snapshot' => $snapshotId];
        $i       = 0;

        foreach ($medidas as $codigo => $valor) {
            $valores[]              = sprintf('(:snapshot, :codigo%d, :valor%d)', $i, $i);
            $params["codigo$i"]     = $codigo;
            $params["valor$i"]      = $valor;
            $i++;
        }

        $this->run(
            'INSERT INTO Monitor_Mediciones (snapshot_id, variable_codigo, valor) VALUES '
            . implode(', ', $valores),
            $params
        );
    }

    /** @param list<array<string,mixed>> $alertas */
    private function insertarAlertas(int $snapshotId, array $alertas): void
    {
        if ($alertas === []) {
            return;
        }

        $valores = [];
        $params  = ['snapshot' => $snapshotId];

        foreach ($alertas as $i => $alerta) {
            $valores[]               = sprintf('(:snapshot, :comp%d, :cod%d, :sev%d, :msg%d)', $i, $i, $i, $i);
            $params["comp$i"]        = $alerta['componente'];
            $params["cod$i"]         = $alerta['codigo'];
            $params["sev$i"]         = $alerta['severidad'];
            $params["msg$i"]         = $alerta['mensaje'];
        }

        $this->run(
            'INSERT INTO Monitor_Alertas (snapshot_id, componente, variable_codigo, severidad, mensaje) VALUES '
            . implode(', ', $valores),
            $params
        );
    }

    /**
     * Resuelve la base pedida. Sin parametro devuelve la primera activa, para
     * que el API siga siendo util sin baseDatosId (como antes de la ingesta).
     *
     * @return array{id:int,nombre:string,motor:string,caida:bool,caida_motivo:?string}
     */
    private function baseDatos(?string $baseDatosId): array
    {
        if ($baseDatosId !== null && !ctype_digit($baseDatosId)) {
            throw HttpException::validacion(['baseDatosId' => 'Debe ser un numero entero.']);
        }

        $sql = 'SELECT id, nombre, motor, caida, caida_motivo FROM Monitor_Bases_Datos WHERE activa';
        $params = [];

        if ($baseDatosId !== null) {
            $sql .= ' AND id = :id';
            $params['id'] = (int) $baseDatosId;
        }

        $fila = $this->run($sql . ' ORDER BY id LIMIT 1', $params)->fetch();

        if ($fila === false) {
            throw new HttpException(
                404,
                $baseDatosId === null
                    ? 'No hay bases de datos monitoreadas. Registre una desde el collector local.'
                    : sprintf('No existe una base de datos monitoreada con id %d.', (int) $baseDatosId)
            );
        }

        return [
            'id'           => (int) $fila['id'],
            'nombre'       => $fila['nombre'],
            'motor'        => $fila['motor'],
            'caida'        => (bool) $fila['caida'],
            'caida_motivo' => $fila['caida_motivo'],
        ];
    }

    /** @return array<string,mixed>|null */
    private function ultimoSnapshot(int $baseDatosId): ?array
    {
        $sql = sprintf(
            'SELECT id, ip, im, ia, isbd, peso_procesos, peso_memoria, peso_archivos,
                    %s AS capturado_en
             FROM Monitor_Snapshots
             WHERE base_datos_id = :base
             ORDER BY capturado_en DESC, id DESC
             LIMIT 1',
            sprintf(self::FECHA, 'capturado_en')
        );

        $fila = $this->run($sql, ['base' => $baseDatosId])->fetch();

        return $fila === false ? null : $fila;
    }

    private static function columnaIndice(string $componente): string
    {
        return match ($componente) {
            'procesos' => 'ip',
            'memoria'  => 'im',
            'archivos' => 'ia',
        };
    }
}
