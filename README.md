# cloudcr

Aplicación web para la evaluación del riesgo en la administración de bases de datos
basada en ISO/IEC 27002 — Proyecto Integrador, Administración de Bases de Datos (EIF402).

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
psql -U postgres -d cloud_cr -f database/Modelo_Relacional.sql
```

```bash
psql -U postgres -d cloud_cr -f database/Datos_Iniciales.sql
```

## Levantar el backend

```bash
composer dump-autoload -d backend
```

```bash
php -S localhost:8000 -t backend/public
```

La referencia de endpoints está en `backend/docs/Api.md`.

## Migraciones

Las tablas nuevas se agregan como archivos numerados en
`backend/database/migrations/`. Se aplican solas al arrancar el contenedor, o a
mano con:

```bash
php backend/scripts/migrate.php
```

Es idempotente: una migración ya registrada en `schema_migrations` no se vuelve
a ejecutar.
