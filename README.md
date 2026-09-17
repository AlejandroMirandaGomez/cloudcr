# cloudcr

Aplicación web para la evaluación del riesgo en la administración de bases de datos
basada en ISO/IEC 27002 — Proyecto Integrador, Administración de Bases de Datos (EIF402).

> **¿Instalando el proyecto desde cero en una computadora nueva?** Ver
> [`AGENTS.md`](AGENTS.md): runbook paso a paso (PostgreSQL, backend, frontend
> y, opcional, Oracle + collector para el monitor en vivo), con los problemas
> comunes de Windows ya resueltos.

## Estructura

```
backend/     API REST en PHP 8.1 + PostgreSQL (ver backend/README.md)
frontend/    Aplicación web en React + Vite (ver frontend/README.md)
collector/   Collector local del Monitor de Salud: lee Oracle y empuja las
             métricas al backend (ver collector/README.md). No se deploya.
agente_local/ Página local para registrar la base y disparar el stress del
             demo. No se deploya.
database/    Modelo_Relacional.sql (esquema), Datos_Iniciales.sql (catálogo de controles,
             preguntas y descriptores de madurez) y las migraciones Migracion_*.sql
docs/        Entregables del curso (pendiente)
```

## Fase 2 — Monitor de Salud de Base de Datos

El dashboard del monitor muestra datos **en vivo** de una instancia Oracle. Como
el backend está desplegado y la base de prueba corre en `localhost`, la conexión
va al revés de lo habitual: un collector local lee Oracle y empuja las métricas
al API.

```
[Oracle XE local] <-- [collector/] --push--> [backend] --> [PostgreSQL] --> [dashboard]
```

El runbook completo (usuarios de Oracle, token compartido, cómo levantarlo y
cómo correr el demo con stress) está en **`collector/README.md`**.

## Arranque rápido (copiar y pegar)

Para instalar el proyecto **desde cero** en una máquina nueva, seguir
`AGENTS.md` paso a paso. Lo de acá abajo es para cuando **ya está instalado**
(Postgres con el esquema cargado, y si vas a usar el monitor en vivo, Oracle
con `monitor_user`/`cloudcr_stress` ya creados) y solo hace falta levantar
los procesos. PowerShell, desde la raíz del repo.

**1. Base de datos** — crear solo la primera vez; migrar siempre es seguro
(idempotente, no repite lo ya aplicado):

```powershell
& "C:\Program Files\PostgreSQL\<version>\bin\psql.exe" -U postgres -c "CREATE DATABASE cloud_cr;"
& "C:\Program Files\PostgreSQL\<version>\bin\psql.exe" -U postgres -d cloud_cr -f database/Modelo_Relacional.sql
& "C:\Program Files\PostgreSQL\<version>\bin\psql.exe" -U postgres -d cloud_cr -f database/Datos_Iniciales.sql
php backend/scripts/migrate.php
```

**2. Backend** (verificar credenciales en `backend/config/.env`, copiado de
`.env.example` la primera vez):

```powershell
php -S 0.0.0.0:8000 -t backend/public
```

`0.0.0.0` y no `localhost`: en Windows `localhost` resuelve solo a `::1`
(loopback IPv6) y el collector en Docker no puede alcanzarlo — el ciclo
lee Oracle bien pero falla al empujar el snapshot al backend
("Network is unreachable"). Sigue sirviendo igual en `http://localhost:8000`
desde el propio Windows.

**3. Frontend** (`npm install` solo la primera vez):

```powershell
npm run dev --prefix frontend
```

→ http://localhost:5173

**4. Monitor de Salud con Oracle en vivo** (opcional — sin esto, `/monitor`
muestra "sin datos" pero el resto de la app funciona igual):

```powershell
net start OracleServiceXE
net start OracleOraDB21Home1TNSListener
cd docker
cp .env.example .env   # completar MONITOR_COLLECTOR_TOKEN (mismo valor que en backend/config/.env), solo la primera vez
docker compose up -d
cd ..
```

`collector` (127.0.0.1:8100) y `agente_local` (127.0.0.1:8200) quedan
corriendo en contenedores Docker — necesario en Windows si Smart App Control
bloquea el driver `oracledb` en Python nativo (bloqueo silencioso: el proceso
corre bien la primera vez y falla después de que Windows termina de
"evaluarlo"). Si tu máquina no tiene ese problema, la alternativa nativa
(`python -m collector` / `python -m agente_local`) está en
`collector/README.md`.

Registrar la base (una sola vez por cada vez que se recrean los
contenedores, porque el registro vive en memoria):

```powershell
$registro = @{
  nombre = "Oracle XE Local"; motor = "Oracle"
  host = "host.docker.internal"; puerto = 1521; servicio = "XEPDB1"
  usuario = "monitor_user"; contrasena = "<password_monitor_user>"
  usuario_stress = "cloudcr_stress"; contrasena_stress = "<password_cloudcr_stress>"
} | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8200/registrar -Method Post -ContentType "application/json" -Body $registro
```

**5. Probar la prueba de estrés** (mueve variables reales de Oracle y se ve
reflejado en el dashboard en el siguiente ciclo, 5s):

```powershell
# Lock contention: bloquea sesiones (p6) — ISBD baja a Amarillo/Rojo
Invoke-RestMethod -Uri http://127.0.0.1:8200/stress/lock -Method Post -ContentType "application/json" -Body (@{duracion=40; intensidad=6} | ConvertTo-Json)

# Detener y limpiar los objetos CLOUDCR_STRESS_* cuando termines
Invoke-RestMethod -Uri http://127.0.0.1:8200/stress/detener -Method Post
Invoke-RestMethod -Uri http://127.0.0.1:8200/stress/limpiar -Method Post
```

Otros mecanismos: `tablespace`, `cpu`, `conexiones` (mismo endpoint, cambiando
el tipo). Detalle de qué mueve cada uno en `collector/README.md`.

**Verificación end-to-end:**

```powershell
Invoke-RestMethod http://localhost:8000/salud
Invoke-RestMethod http://localhost:8000/monitor/bases-datos
```

El segundo debe traer la base registrada con un `isbd` numérico — ahí
`/monitor` en el frontend ya muestra datos reales en vez de "sin datos".
