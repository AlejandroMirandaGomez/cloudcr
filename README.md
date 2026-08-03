# cloudcr

Aplicación web para la evaluación del riesgo en la administración de bases de datos
basada en ISO/IEC 27002 — Proyecto Integrador, Administración de Bases de Datos (EIF402).

## Estructura

```
backend/     API REST en PHP 8.1 + PostgreSQL (ver backend/README.md)
frontend/    Aplicación web (pendiente)
database/    Script SQL, modelo ER, modelo relacional, diccionario de datos (pendiente)
docs/        Entregables del curso (pendiente)
```

## Levantar el backend

```bash
composer dump-autoload -d backend
```

```bash
php -S localhost:8000 -t backend/public
```

La referencia de endpoints está en `backend/docs/Api.md`.
