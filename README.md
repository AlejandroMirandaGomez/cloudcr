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

## Crear la base de datos

```bash
psql -U postgres -c "CREATE DATABASE cloud_cr;"
psql -U postgres -d cloud_cr -f database/Modelo_Relacional.sql
psql -U postgres -d cloud_cr -f database/Datos_Iniciales.sql
```

## Levantar el backend

```bash
cp backend/config/.env.example backend/config/.env
```

Ajustar `DB_USER` / `DB_PASS` en `backend/config/.env` si no son
`postgres`/`postgres`. Si el archivo no existe se usan esos valores por
defecto (`app/Core/Config.php`).

```bash
composer dump-autoload -d backend
php -S localhost:8000 -t backend/public
```

Verificar con `curl http://localhost:8000/salud`. La referencia de endpoints
está en `backend/docs/Api.md`; detalle de instalación (WAMP, virtual host,
troubleshooting) en `backend/README.md`.

## Levantar el frontend

```bash
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

`VITE_API_URL` en `frontend/.env` debe apuntar al backend
(`http://localhost:8000` en local).

## Migraciones

Las tablas nuevas se agregan como archivos numerados en
`backend/database/migrations/`. Se aplican solas al arrancar el contenedor, o a
mano con:

```bash
php backend/scripts/migrate.php
```

Es idempotente: una migración ya registrada en `schema_migrations` no se vuelve
a ejecutar.
