# cloudcr

Aplicación web para la evaluación del riesgo en la administración de bases de datos
basada en ISO/IEC 27002 — Proyecto Integrador, Administración de Bases de Datos (EIF402).

## Estructura

```
backend/     API REST en PHP 8.1 + PostgreSQL (ver backend/README.md)
frontend/    Aplicación web en React + Vite (ver frontend/README.md)
database/    Modelo_Relacional.sql (esquema) y Datos_Iniciales.sql (catálogo de controles)
docs/        Entregables del curso (pendiente)
```

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
