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
ISBD = (IP + IM + IA) / 3
```

Con una escala 0–100 y estados: Óptimo, Saludable, Advertencia, Degradado,
Crítico. El documento del profesor proponía pesos 30/35/35; el equipo decidió
usar el promedio simple para que el número sea directamente legible. El sistema también debe generar alertas por componente y guardar
histórico para graficar evolución.

### Arquitectura del monitor (resuelto)

El documento del profesor esta redactado sobre vistas dinamicas de **Oracle**
(`V$PROCESS`, `V$SESSION`, `V$SGA`, `V$PGASTAT`, `V$DATAFILE`, `V$LOG`...),
pero el backend de CloudCR usa **PostgreSQL** y esta desplegado en Render,
mientras que la instancia Oracle de prueba corre en `localhost`. Render no
puede alcanzar `localhost`, asi que la conexion va al reves:

```
[Oracle XE local] <-- [collector/] --push--> [backend PHP] --> [PostgreSQL] --> [dashboard]
```

- `collector/` (Python + `oracledb` en modo thin) corre en la maquina de la
  base, ejecuta las consultas de salud y hace `POST /monitor/ingesta` con un
  secreto compartido (`X-Collector-Token`).
- El backend **no se conecta a Oracle**: recibe mediciones, calcula IP/IM/IA e
  ISBD con `Monitor/CalculadoraSalud.php` y las guarda en las tablas
  `Monitor_*` de PostgreSQL.
- Las credenciales de Oracle nunca salen de la maquina local.
- `agente_local/` es la pagina local para registrar la base y disparar el stress
  del demo. No se deploya.

**Media geometrica ponderada (IP/IM/IA).** El indice de cada componente es la
media geometrica de los puntajes de sus variables, ponderada por el peso de
cada una (`CalculadoraSalud::indiceComponente`). A diferencia de un promedio
aritmetico, la geometrica es parcialmente no-compensatoria: un puntaje bajo
castiga el indice en proporcion a su propio peso, sin que puntajes buenos en
otras variables lo tapen -- asi una alerta critica individual se refleja en el
indicador en vez de diluirse en el promedio, la regla del documento del
profesor, aplicada tambien al numero, no solo al panel de alertas. Mismo
criterio que uso el PNUD al pasar el IDH de media aritmetica a geometrica en
2010. El ISBD, en cambio, sigue siendo el promedio simple de los tres
componentes, sin este ajuste.

**Umbrales del semaforo configurables.** El color de los cuatro indices (ISBD,
IP, IM, IA) no usa cortes fijos: cada base guarda su par verde/rojo en
`Monitor_Umbrales_Indice` (migracion `0010`), editable desde el boton "Editar
parametros" del dashboard. Se lee igual que una variable `alto_bueno`: verde
desde el umbral verde hacia arriba, rojo desde el umbral rojo hacia abajo,
amarillo en medio. Por defecto 75 / 60. Solo afecta el color, nunca el valor
calculado.

**Estado "caida".** Cuando el collector no puede leer una instancia avisa por
`POST /monitor/estado-caida` y el dashboard la marca como caida (negro) en vez de
mostrar el ultimo ISBD viejo. Una ingesta exitosa limpia el flag. El agente local
tiene un boton para simular la caida en el demo.

**Bases simuladas.** Las 4 bases quemadas originales (ERP, CRM, CloudCR,
Analytics DW) se reinsertan con `php backend/scripts/seed_monitor_simuladas.php`,
que reusa el pipeline real (`registrarSnapshot`). Conviven con las bases reales.

**Ya no hay datos simulados en el modulo monitor.** Las 25 variables
(`p1..p8`, `m1..m9`, `a1..a8`) con sus umbrales viven en la tabla
`Monitor_Variables` (migraciones `backend/database/migrations/0004` y `0005`),
y sus valores los mide el collector. Runbook completo en `collector/README.md`;
pendientes conocidos en `backend/docs/Gaps.md`.

### Reparto de tareas por integrante

**Persona A — Modelo de datos del monitor (PostgreSQL)**  ✅ hecho
- Tablas reales: `Monitor_Bases_Datos`, `Monitor_Variables`,
  `Monitor_Snapshots`, `Monitor_Mediciones`, `Monitor_Alertas`
  (migracion `0003`). Se normalizo en variables + mediciones en vez de una
  tabla por componente: las tres tendrian las mismas columnas y asi se pueden
  agregar variables sin DDL.
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
- `MonitorRepository` (contra PostgreSQL) + `MonitorController` + rutas en
  `routes/routes.php`: `/monitor/bases-datos`, `/monitor/indice`,
  `/monitor/alertas`, `/monitor/historico`, `/monitor/variables` y
  `POST /monitor/ingesta`.

**Persona C — Dashboard (frontend)**
- Módulo nuevo `frontend/src/modules/monitor/`, calcado de `dashboard/`.
- Componentes: tarjeta de índice de salud con semáforo, tarjetas de
  Procesos/Memoria/Archivos, panel de alertas, gráfico de evolución histórica.
- Registrar ruta `monitor` en `router.jsx` y entrada en `Sidebar.jsx`.
- Puede maquetar todo contra datos simulados mientras Persona B expone el
  endpoint real.

**Persona D — Investigación Oracle y coordinación**  ✅ consultas implementadas
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