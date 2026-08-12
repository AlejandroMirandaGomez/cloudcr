# CloudCR — contexto del proyecto

## Qué es CloudCR

Aplicación web de consultoría basada en la norma ISO/IEC 27002. Ya existe una
Fase 1 completa: un cuestionario de control interno (evaluación de madurez y
riesgo) con backend PHP y frontend React.

## Arquitectura

### Backend (`backend/`)
- PHP puro, sin framework, con un mini-framework propio en `app/Core/`:
  `Router`, `Request`, `Response`, `Validator`, `HttpException`, `Config`,
  `Database` (conexión PDO a **PostgreSQL**, lazy singleton).
- Patrón por feature: `Controller` (recibe `Request`, valida con `Validator`,
  llama al `Repository`, responde con `Response::ok/created`) +
  `Repository` (SQL directo contra Postgres, extiende `BaseRepository`).
- Las rutas se registran todas en `backend/routes/routes.php`, agrupadas por
  HU (historia de usuario) con comentarios `// ---- HU-XXX Nombre`.
- Ejemplo de controlador simple a seguir como modelo:
  `app/Controllers/MadurezController.php` (CRUD corto, delega todo al repo).
- Ejemplo de controlador de solo lectura/reportes:
  `app/Controllers/ReporteController.php`.

### Frontend (`frontend/`)
- React + Vite + React Router. Un módulo por feature en `src/modules/<nombre>/`
  con subcarpetas `pages/`, `components/`, `services/`, `hooks/`.
- `services/*.js` llama al cliente HTTP compartido `src/common/lib/api.js`
  (`api.get/post/put/delete`, base URL `VITE_API_URL` o `/api`).
- Las páginas se registran en `src/app/router.jsx` con `lazy()` y, si
  requieren sesión, envueltas en `<Protected>`.
- El módulo `dashboard/` es el mejor ejemplo a copiar para pantallas de
  indicadores con tarjetas y datos agregados.

### Base de datos (`database/`)
- PostgreSQL. El esquema principal vive en `Modelo_Relacional.sql`
  (SERIAL PRIMARY KEY, tipos `ENUM`, `FOREIGN KEY` explícitas, `CHECK`).
- Los scripts de migración van sueltos por nombre (`Migracion_*.sql`).

## Fase 2 — Monitor de Salud de una Base de Datos

Nuevo servicio que se agrega a la página de CloudCR, basado en el documento
del profesor "Monitor de Salud de una Base de Datos Oracle" (propuesta
conceptual, no implementación final). Divide el monitoreo en tres
componentes — Procesos, Memoria, Archivos — cada uno con su propio
indicador (IP, IM, IA), combinados en un índice único:

```
ISBD = Wp·IP + Wm·IM + Wa·IA      (pesos iniciales propuestos: 30% / 35% / 35%)
```

Con una escala 0–100 y estados: Óptimo, Saludable, Advertencia, Degradado,
Crítico. El sistema también debe generar alertas por componente y guardar
histórico para graficar evolución.

### ⚠️ Punto importante de arquitectura
El documento del profesor está redactado en términos de vistas dinámicas de
**Oracle** (`V$PROCESS`, `V$SESSION`, `V$SGA`, `V$SGASTAT`, `V$PGASTAT`,
`V$DATAFILE`, `V$LOG`, `V$LOGFILE`, etc.), pero el backend real de CloudCR
usa **PostgreSQL**. Hasta que no se confirme si habrá una conexión Oracle
real, todo el desarrollo debe trabajar con **datos simulados** (mock/fixtures)
para que nadie del equipo quede bloqueado.

### Pendiente de confirmar con el profesor (bloquea solo lo relacionado con Oracle real)
- Si se trabajará contra una instancia Oracle real o se simulará con datos de prueba.
- Pesos definitivos de Wp, Wm, Wa (propuesta actual: 30/35/35).
- Umbrales oficiales por variable (p1...pn, m1...mn, a1...an).
- Alcance exacto de la versión 1 (qué variables son obligatorias).
- Formato y rúbrica de entrega de esta fase.

### Reparto de tareas por integrante

**Persona A — Modelo de datos del monitor (PostgreSQL)**
- Diseñar tablas `Monitor_Instancia`, `Monitor_Procesos`, `Monitor_Memoria`,
  `Monitor_Archivos`, `Monitor_Indices`, `Monitor_Alertas`.
- Definir llaves, relaciones y tipos de dato de cada tabla.
- Escribir el DDL en `database/`, siguiendo el estilo de `Modelo_Relacional.sql`.
- Documentar el diccionario de datos de las tablas nuevas.

**Persona B — Lógica de indicadores (backend PHP)**
- Clase pura de cálculo (sin acceso a datos) para IP, IM, IA e ISBD con
  pesos configurables.
- Clasificación por umbrales (Normal/Advertencia/Alto/Crítico).
- Regla explícita del documento: una alerta crítica individual **no** debe
  quedar oculta por un promedio ponderado alto — el sistema debe reportar
  ambos niveles (índice global + alertas por componente).
- `MonitorRepository` (con datos simulados por ahora) + `MonitorController`
  + rutas nuevas en `routes/routes.php` (`/monitor/indice`, `/monitor/alertas`,
  `/monitor/historico`).

**Persona C — Dashboard (frontend)**
- Módulo nuevo `frontend/src/modules/monitor/`, calcado de `dashboard/`.
- Componentes: tarjeta de índice de salud con semáforo, tarjetas de
  Procesos/Memoria/Archivos, panel de alertas, gráfico de evolución histórica.
- Registrar ruta `monitor` en `router.jsx` y entrada en `Sidebar.jsx`.
- Puede maquetar todo contra datos simulados mientras Persona B expone el
  endpoint real.

**Persona D — Investigación Oracle y coordinación**
- Documentar las vistas `V$PROCESS`, `V$SESSION`, `V$RESOURCE_LIMIT`,
  `V$SGA`, `V$SGASTAT`, `V$PGASTAT`, `V$DATAFILE`, `V$TEMPFILE`, `V$LOG`,
  `V$LOGFILE`.
- Redactar consultas SQL de ejemplo para cada variable propuesta (para el
  día en que se confirme una conexión Oracle real).
- Mantener la lista de preguntas pendientes para el profesor.
- Redactar la documentación de esta fase para el informe del proyecto.

## Convenciones a respetar en todo código nuevo

- PHP: `declare(strict_types=1);`, namespace `CloudCR\...`, clases `final`,
  comentarios y nombres de tabla/variable en español (coherente con el resto
  del código).
- SQL: nombres de tabla en `PascalCase` en singular/plural como en el
  esquema existente, `SERIAL PRIMARY KEY`, `ENUM` para estados fijos.
- React: componentes funcionales, un `service` por módulo que solo llama a
  `api.js`, sin lógica de negocio en los componentes de página.
- Todo texto visible para el usuario final (labels, mensajes) en español.