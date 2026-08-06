# Manual Técnico — CloudCR

**Proyecto:** Evaluación del Riesgo en la Administración de Bases de Datos basada en ISO/IEC 27002
**Curso:** EIF402 — Administración de Bases de Datos, Universidad Nacional

---

## 1. Arquitectura general

```
┌─────────────────┐   HTTP/JSON    ┌──────────────────┐    PDO     ┌──────────────┐
│  Frontend SPA   │ ─────────────► │  API REST (PHP)  │ ─────────► │  PostgreSQL  │
│  React + Vite   │  proxy /api    │  sin framework   │  prepared  │   cloud_cr   │
│  Material UI    │ ◄───────────── │  PSR-4/Composer  │ ◄───────── │              │
└─────────────────┘                └──────────────────┘            └──────────────┘
```

- **Frontend:** SPA en React 19 + Vite, Material UI v9, `material-react-table` para tablas,
  `react-router-dom` v7. Carpeta `frontend/`.
- **Backend:** API REST en PHP 8.1+ **sin framework**, autoload PSR-4 vía Composer, front
  controller único. Carpeta `backend/`.
- **Base de datos:** PostgreSQL. Esquema en `database/Modelo_Relacional.sql`; catálogo inicial de
  controles y preguntas en `database/Datos_Iniciales.sql`.

## 2. Requisitos de software

| Componente | Versión mínima |
|---|---|
| PHP | 8.1 (extensiones `pdo`, `pdo_pgsql`) |
| Composer | 2.x |
| PostgreSQL | 14 |
| Node.js | 20 |
| npm | 10 |

## 3. Instalación y puesta en marcha (desarrollo)

### 3.1 Base de datos

```bash
createdb -U postgres cloud_cr
psql -U postgres -d cloud_cr -f database/Modelo_Relacional.sql
psql -U postgres -d cloud_cr -f database/Datos_Iniciales.sql
```

Sobre una base **ya creada** con una versión anterior del modelo, aplicar además la migración
que agrega la justificación obligatoria del `N/A` (en una base nueva no hace falta: el modelo ya
la incluye):

```bash
psql -U postgres -d cloud_cr -f database/Migracion_Justificacion_No_Aplica.sql
```

`Modelo_Relacional.sql` crea tipos, tablas y carga los catálogos cerrados de la norma (dominios,
tipos de control, conceptos, dominios de seguridad, capacidades operativas). `Datos_Iniciales.sql`
carga los 10 controles del instrumento con sus 43 preguntas y atributos N:M.

### 3.2 Backend

```bash
composer dump-autoload -d backend
cp backend/config/.env.example config/.env    # ajustar credenciales si difieren
php -S localhost:8000 -t backend/public
```

Variables de `config/.env` (las variables de entorno del sistema tienen prioridad):

| Variable | Por defecto | Descripción |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Servidor PostgreSQL |
| `DB_NAME` | `cloud_cr` | Base de datos |
| `DB_USER` / `DB_PASS` | `postgres` / `postgres` | Credenciales |
| `APP_DEBUG` | `true` | `true`: los errores incluyen detalle técnico. Poner `false` en producción |
| `CORS_ORIGIN` | `*` | Origen permitido; en producción fijar el origen exacto del frontend |

Verificación: `curl http://localhost:8000/salud` debe responder
`{"data":{"base_de_datos":"conectada", ...}}`.

### 3.3 Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxy /api → http://localhost:8000
```

Build de producción: `npm run build` (salida en `frontend/dist/`).

## 4. Estructura del backend

```
backend/
├── public/index.php          Front controller único (toda petición entra aquí)
├── routes/routes.php         Tabla de rutas → controlador
├── app/
│   ├── Core/                 Infraestructura
│   │   ├── Router.php        Enrutamiento con parámetros {id}
│   │   ├── Request.php       Lectura de JSON, query params
│   │   ├── Response.php      Envoltura {data}/{error}, códigos HTTP
│   │   ├── Validator.php     Validación declarativa de entrada
│   │   ├── HttpException.php Errores HTTP tipados
│   │   ├── Config.php        Lectura de config/.env
│   │   ├── Database.php      PDO singleton + transacciones
│   │   └── Bootstrap.php     Arranque, manejo global de errores
│   ├── Controllers/          Validan entrada y delegan al repositorio (uno por recurso)
│   └── Repositories/         TODO el SQL vive aquí (una clase por tabla/agregado)
├── config/.env.example
├── docs/Api.md               Referencia completa de endpoints con ejemplos curl
├── docs/Gaps.md              Limitaciones conocidas del esquema, con DDL sugerido
└── scripts/Pruebas.sh        Pruebas de humo de la API
```

**Convenciones del API** (detalle completo en `backend/docs/Api.md`):

- Respuestas JSON envueltas en `data` (y `meta` en listados paginados) o `error`.
- Códigos: 200/201/204 éxito; 400 JSON malformado; 404 no existe; 405 método no permitido;
  **409** conflicto (duplicados o borrados que destruirían historial); 422 validación;
  500/503 error interno / BD inaccesible.
- Paginación con `?limit=` (1–200, defecto 50) y `?offset=`; `meta.total` sin paginar.
- Enums espejo de PostgreSQL, sensibles a mayúsculas y tildes: `Sí`, `No`, `N/A`;
  `Primario`, `Secundario`.
- Los errores de PostgreSQL se traducen a HTTP con sentido; ningún `DELETE` destruye historial
  (se responde 409 con el conteo de registros dependientes).

**Endpoints principales:**

| Recurso | Rutas |
|---|---|
| Autenticación | `POST /auth/login` |
| Organizaciones | CRUD en `/organizaciones` + `GET /organizaciones/{id}/historial` |
| Evaluadores | CRUD (sin delete) en `/evaluadores` |
| Normas | CRUD en `/normas` |
| Catálogos fijos | `GET /catalogos` |
| Controles | CRUD en `/controles` (filtros: `norma_id`, `dominio_norma_id`, `tipo`, `dimension`, `nivel`, `buscar`) |
| Cuestionarios | CRUD en `/cuestionarios` |
| Respuestas | `PUT/GET/DELETE /cuestionarios/{id}/respuestas/{preguntaId}` (upsert idempotente), `POST /cuestionarios/{id}/respuestas` (lote transaccional), `GET .../respuestas/pendientes` |
| Reportes | `GET /cuestionarios/{id}/resumen`, `/mapa-calor`, `/hallazgos`, `/no-aplicables`, `/madurez`, `/riesgo` |

## 5. Estructura del frontend

```
frontend/src/
├── main.jsx / App.jsx        Arranque de la SPA
├── app/
│   ├── router.jsx            Rutas centralizadas (React Router, lazy loading)
│   ├── theme.js              Tema MUI: paleta morado #7e14ff / azul #47bfff, botones píldora
│   └── layout/RootLayout.jsx Sidebar + contenido + footer
├── common/
│   ├── context/AuthContext.jsx   Sesión (persistida en localStorage)
│   ├── components/               ProtectedRoute, tabla base, sidebar, footer, detalle de control
│   ├── lib/api.js                Cliente HTTP (fetch sobre /api, desenvuelve {data}/{error})
│   └── styles/hero.js            Hero reutilizable con degradado
└── modules/<feature>/{pages,components,services,hooks}
    ├── auth/                     Login, registro, perfil
    ├── home/                     Landing pública
    ├── dashboard/                Panel por rol (evaluador / organización)
    ├── control-list/             Catálogo de controles (lista, detalle, edición)
    ├── internal-control-questionnaire/   Flujo de auditoría (auditorías → controles → preguntas)
    └── reporte/                  Reporte ejecutivo imprimible (madurez, riesgo, mapa de calor)
```

**Control de acceso en el cliente:** `ProtectedRoute` exige sesión y opcionalmente un rol
(`allowedRoles={['evaluador']}`); el sidebar filtra opciones según `session.rol`. Rutas de edición
de controles y del cuestionario son exclusivas del rol `evaluador`.

## 6. Modelo de datos (resumen)

Esquema completo: `database/Modelo_Relacional.sql`. Diagrama E-R y diccionario de datos: ver
entregables correspondientes.

| Tabla | Propósito |
|---|---|
| `Normas` | Normas registradas (ISO/IEC 27002) |
| `Dominios_Norma` | Cláusulas 5–8 de la norma |
| `Tipos_Control`, `Conceptos_Ciberseguridad`, `Dominios_Seguridad`, `Capacidades_Operativas` | Catálogos cerrados de atributos de la norma (+ 4 tablas puente N:M con `Controles`) |
| `Controles` | Ficha del control: código, nombre, propósito, descripción, **peso 1–10 (CHECK)**, relación C/I/D (`ENUM nivel_relacion`), guía |
| `Preguntas` | 1:N con `Controles`; `UNIQUE (control_id, orden)` |
| `Organizaciones`, `Evaluadores` | Usuarios; `correo UNIQUE`, `contrasena_hash` (bcrypt) |
| `Cuestionarios_Control_Interno` | Auditoría: organización + evaluador + fecha |
| `Respuestas` | Una fila por (cuestionario, pregunta) — `UNIQUE`; 4 atributos `ENUM respuesta_pregunta`: `cumple`, `documentado`, `repetible`, `evidencia`; más `justificacion_no_aplica` (texto, obligatorio por `CHECK` cuando `cumple = 'N/A'` y `NULL` en cualquier otro caso) |

Integridad clave: FKs en todas las relaciones; `ON DELETE CASCADE` solo de `Controles` hacia sus
dependientes de catálogo (`Preguntas`, tablas puente); las respuestas nunca se borran en cascada.

## 7. Seguridad

- **Contraseñas** con `password_hash()` (bcrypt) y `password_verify()`; nunca en texto plano.
- **SQL** exclusivamente con sentencias preparadas de PDO (sin concatenación de entrada).
- **Validación** de toda entrada en los controladores (`Validator`), con 422 detallado.
- **CORS** configurable por entorno (`CORS_ORIGIN`).
- **Sesión del frontend** en `localStorage` sin token firmado ni expiración — limitación conocida
  aceptada para el alcance del curso; la autorización real de datos se refuerza en el backend en
  la siguiente iteración (ver sección 9).

## 8. Metodologías implementadas

- Instrumento de evaluación: `docs/Instrumento_Evaluacion.md`.
- Nivel de madurez 0–5: `docs/Metodologia_Madurez.md` (tasas de atributos → índice continuo →
  nivel con topes cualitativos). Implementada en `ReporteRepository::madurez()`
  (`GET /cuestionarios/{id}/madurez`).
- Exposición al riesgo C/I/D: `docs/Metodologia_Riesgo.md`
  (`E(X) = Σ peso·r·(1−IM/5) / Σ peso·r`, con `r` = 1.0 Primario / 0.5 Secundario).
  Implementada en `ReporteRepository::riesgo()` (`GET /cuestionarios/{id}/riesgo`).

Ambas metodologías se calculan íntegramente a partir de columnas existentes
(`Respuestas.cumple/documentado/repetible/evidencia`, `Controles.peso`, relación C/I/D): **no
requirieron cambios de DDL**. El reporte ejecutivo (`/reportes/{cuestionarioId}` en el frontend)
las visualiza con barras de madurez por control, semáforo de riesgo por dimensión, mapa de calor,
ranking de controles por exposición y hallazgos, y es imprimible/exportable a PDF con el botón
"Imprimir / PDF" (CSS `@media print`).

## 9. Limitaciones conocidas y hoja de ruta

Detalle con DDL sugerido en `backend/docs/Gaps.md`. Resumen:

| Pendiente | Estado |
|---|---|
| Flujo de responder cuestionario conectado al backend | ✅ Hecho (auditorías → controles → preguntas, guardado parcial por lotes) |
| Endpoints de madurez y riesgo según las metodologías de `docs/` | ✅ Hecho (`/madurez`, `/riesgo`) |
| Gráficos y reporte ejecutivo exportable | ✅ Hecho (`/reportes/{id}`, imprimible a PDF) |
| Columna `estado` del cuestionario (en progreso / finalizado) | Bloqueado por DDL |
| `area_evaluada` y `administrador_bd` en la auditoría | Bloqueado por DDL |
| Observaciones y evidencias en texto libre por respuesta | Bloqueado por DDL |
| Soft-delete (`activo`) de normas/controles | Bloqueado por DDL |
| Autorización por datos en el backend (hoy el control de acceso es solo del cliente) | Pendiente |

## 10. Pruebas y verificación

- Salud del API: `curl http://localhost:8000/salud`.
- Pruebas de humo: `backend/scripts/Pruebas.sh`.
- Ejemplos `curl` de cada endpoint: `backend/docs/Api.md`.
- Lint del frontend: `npm run lint` en `frontend/`.
