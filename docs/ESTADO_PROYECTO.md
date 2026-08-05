# Estado del proyecto CloudCR — resumen para continuar el trabajo

> **Qué es este documento:** un corte de estado del proyecto (EIF402 — Administración de Bases de
> Datos, "Evaluación del Riesgo en Administración de Bases de Datos basada en ISO/IEC 27002")
> pensado para que lo peguen en una conversación con una IA (Claude, ChatGPT, etc.) y puedan seguir
> trabajando sin perder el contexto de lo que ya existe, cómo está construido y qué falta.
>
> Última actualización: **2026-08-05**, rama `Dev/Luis`.

---

## 1. Stack y arquitectura

- **Backend**: PHP 8.1+ puro (sin framework), PSR-4 vía Composer, PDO sobre **PostgreSQL**.
  Ubicado en `backend/`. Front controller único en `backend/public/index.php`.
  - `app/Core/` — Router, Request, Response, Validator, HttpException, Config, Database (PDO singleton).
  - `app/Controllers/` — validan entrada y delegan al repositorio.
  - `app/Repositories/` — todo el SQL vive aquí, una clase por tabla/agregado.
  - `routes/routes.php` — tabla de rutas.
  - `docs/Api.md` y `docs/Gaps.md` (dentro de `backend/`) documentan endpoints y limitaciones conocidas del esquema.
- **Frontend**: React + Vite, Material UI (`material-react-table` para tablas). Ubicado en `frontend/`.
  - Organización por *feature modules* en `src/modules/<feature>/{pages,components,services,hooks}`.
  - Código compartido en `src/common/{context,lib,components,styles}`.
  - Rutas centralizadas en `src/app/router.jsx`.
- **Base de datos**: PostgreSQL. Script de esquema en `database/Script_V2.sql`. Base local se llama
  `cloud_cr` (host `localhost:5432`, usuario/clave `postgres`/`postgres` por defecto, ver
  `backend/config/.env`).

**Importante para quien continúe:** editar `database/Script_V2.sql` **no** altera la base de datos ya
creada. Cualquier cambio de esquema (agregar columnas, tablas nuevas) necesita aplicarse también con
`ALTER TABLE`/migraciones contra la base real, o recrearla desde cero.

---

## 2. Lo que YA está construido y funcionando

### 2.1 Autenticación real (evaluador y organización)
- Registro, login y edición de perfil por **correo + contraseña** (bcrypt vía `password_hash`),
  para dos tipos de usuario: `evaluador` y `organizacion`.
- Backend: `AuthController::login()` (`POST /auth/login`), más `POST`/`PUT` en
  `/evaluadores` y `/organizaciones` para registro y edición.
- Tablas `Evaluadores` y `Organizaciones` tienen `correo UNIQUE` y `contrasena_hash`.
- Frontend: `LoginPage`, `RegisterPage`, `ProfilePage` (módulo `modules/auth`), sesión persistida en
  `localStorage` vía `AuthContext` (sin JWT ni expiración — ver limitaciones más abajo).
- Rutas protegidas por rol (`ProtectedRoute` con prop `allowedRoles`), sidebar dinámico que oculta
  ítems según si hay sesión y según el rol (`session.rol === 'evaluador' | 'organizacion'`).

### 2.2 Dashboards por rol (`/panel`)
- `DashboardPage` decide qué mostrar según `session.rol`.
- **`EvaluadorDashboard`**: estadísticas (cuestionarios realizados, organizaciones evaluadas,
  cuestionarios del mes), tabla de cuestionarios recientes, accesos rápidos.
- **`OrganizacionDashboard`**: historial de evaluaciones recibidas, mapa de calor de la última
  evaluación por dimensión (C/I/D), resumen de cumplimiento, principales hallazgos (controles en
  "No"). Todo esto consume endpoints de reportes que el backend ya tenía pero que **no se usaban
  desde ningún lado del frontend** hasta ahora.
- Tras login/registro, se redirige directo a `/panel` (ya no cae en la landing pública).

### 2.3 Catálogo de controles (`/control-list`)
- CRUD parcial funcionando de verdad contra el backend (antes usaba un JSON mock local que nunca
  tocaba la base de datos):
  - **Ver detalle**: corregido — antes buscaba por código ISO (ej. "8.2") en un JSON local y fallaba
    con "control no encontrado"; ahora trae el control real por `id` desde `GET /controles/{id}`.
  - **Editar detalle**: implementado de cero (`ControlEditPage`, `PUT /controles/{id}`) — nombre,
    tipo, descripción, y las 3 propiedades de seguridad (C/I/D).
  - Visibilidad por rol: la opción **"Editar"** del menú de acciones solo aparece si
    `session?.rol === 'evaluador'`. Organizaciones y usuarios sin sesión (o en la vista pública) solo
    ven **"Ver detalle"**.
- Base de datos sembrada con **10 controles de ejemplo** de ISO/IEC 27002 (los mismos que estaban
  hardcodeados en `frontend/src/common/data/controles-iso27002.json`), vinculados a una norma
  "ISO/IEC 27002" — **son datos de prueba, no el catálogo final justificado del proyecto**.

### 2.4 Estilo visual
- Paleta de marca: morado `#7e14ff` / azul `#47bfff` (`frontend/src/app/theme.js`).
- Botones tipo píldora en toda la app (`MuiButton` override global).
- Fondo general (`background.default`) cambiado de blanco casi puro a un gris-lavanda suave
  (`#ece8f7`) para que sea menos "pesado" a la vista.
- Hero reutilizable con degradado + círculos suaves (`common/styles/hero.js`), aplicado en la
  landing pública y en ambos dashboards.

### 2.5 Backend — funcionalidad de base (ya existía antes de hoy, sigue vigente)
- CRUD de Organizaciones, Normas, Controles, Cuestionarios.
- Registro de respuestas Sí/No/N-A por control (guardado parcial e idempotente, guardado por lotes
  transaccional).
- Reportes: `GET /cuestionarios/{id}/resumen`, `/mapa-calor`, `/hallazgos`,
  `GET /organizaciones/{id}/historial`.
- Errores de PostgreSQL traducidos a respuestas HTTP con sentido (409 duplicados, 422 validación,
  etc.). Ningún borrado destruye historial (protegido con 409 si el registro está en uso).

---

## 3. Lo que FALTA (en orden de impacto sobre la nota)

### 🔴 Crítico — pide el enunciado explícitamente y no existe

1. **Nivel de madurez 0–5 por control.** El enunciado exige esta escala exacta (página 6 del PDF).
   Hoy el backend solo expone insumos (`documentado`, `repetible`, `evidencia`) en
   `GET /cuestionarios/{id}/resumen`, pero **nadie calcula el nivel 0-5**. Hay que:
   - Diseñar y justificar la metodología (cómo las respuestas Sí/No/N-A + documentado/repetible/
     evidencia se traducen a un número 0-5 por control).
   - Implementarla, probablemente como cálculo en `ReporteRepository` o en una nueva capa de
     servicio, y mostrarla en los dashboards/reportes.

2. **Exposición al riesgo (Confidencialidad / Integridad / Disponibilidad).** Bloqueada porque falta
   el **peso o importancia del control** (columna `peso` no existe en `Controles`). El enunciado pide
   este campo explícitamente. Sin peso no hay cómo ponderar el riesgo.
   - DDL sugerido: `ALTER TABLE Controles ADD COLUMN peso SMALLINT CHECK (peso BETWEEN 1 AND 10);`
   - Después: diseñar la fórmula de riesgo (nivel de madurez × peso × algo de impacto/probabilidad),
     justificarla, implementarla.

3. **Preguntas por control.** El enunciado pide "cada control estará conformado por una o varias
   preguntas" con respuesta Sí/No/N-A **por pregunta**. Hoy se responde a nivel de control completo
   (`Respuestas_Controles` tiene una fila por control, no por pregunta). Esto es un cambio de modelo
   de datos (tabla `Preguntas` nueva, `Respuestas_Preguntas` en vez de `Respuestas_Controles`) que
   afecta bastante el backend.

4. **El flujo de "responder cuestionario" no está conectado al backend.** Esto es importante:
   `internal-control-questionnaire/pages/ControlQuestionnairePage.jsx` y sus componentes
   (`ControlQuestionnaire.jsx`, `data/answersStore.js`, `data/auditoria.js`) todavía funcionan con
   **datos mock en memoria/localStorage**, no llaman a `POST /cuestionarios`,
   `PUT /cuestionarios/{id}/respuestas/{controlId}` ni `POST /cuestionarios/{id}/respuestas` (guardado
   por lotes) — aunque esos endpoints del backend **sí existen y funcionan**. Por eso los dashboards
   de hoy muestran "sin datos": no hay ningún cuestionario real guardado en la base.
   - Esta es probablemente la tarea de mayor impacto inmediato: conectar ese flujo es lo que hace que
     todo lo demás (dashboards, mapa de calor, hallazgos) empiece a mostrar datos reales en vez de
     estados vacíos.

5. **Campos faltantes en `Controles`** que el enunciado pide como mínimo: `peso` (ver punto 2),
   `dominio de la norma`, `objetivo del control` (hoy solo hay `detalle`, que se usa como
   descripción general).

6. **Frontend de reportes/indicadores/gráficos.** El enunciado pide gráficos, mapas de calor,
   indicadores estadísticos y "reporte ejecutivo". Hoy existe una versión básica dentro de
   `OrganizacionDashboard` (mapa de calor en tarjetas, no en gráfico visual), pero:
   - No hay librería de gráficos instalada (nada de Recharts/Chart.js/Nivo).
   - No hay una vista de "reporte ejecutivo" imprimible/exportable.
   - No hay indicadores comparativos entre auditorías más allá del historial simple.

### 🟡 Parcial / mejorable

- **Área evaluada y Administrador de Bases de Datos**: el enunciado pide capturarlos por auditoría
  (`Cuestionarios_Control_Interno` solo tiene `organizacion_id`, `evaluador_id`, `fecha`).
- **Estado del cuestionario** (en progreso / finalizado): no existe columna `estado`; documentado
  como bloqueado en `backend/docs/Gaps.md` con el DDL sugerido.
- **Desactivar (soft-delete) normas/controles**: no existe columna `activo`; hoy solo se puede borrar
  si el registro nunca fue usado (409 si ya tiene historial).
- **Catálogo de controles real**: los 10 controles cargados son de prueba (ver sección 2.3). Falta
  la selección y justificación formal de los controles ISO 27002 aplicables a administración de
  bases de datos, que es un entregable del proyecto (10% de la nota) y además insumo para el
  catálogo real que debe cargarse.
- **Datos de contacto de la organización**: la tabla solo tiene `nombre`/`correo`; no hay teléfono ni
  persona de contacto adicional si el enunciado lo llegara a pedir en la parte 2.

### ⚪ Fuera del código (no verificable desde el repo)

Estos son entregables del curso que probablemente existen como documentos aparte, no en este
repositorio, así que no se pueden evaluar desde aquí:

1. Documento de análisis del problema.
2. Marco teórico.
3. Documento de diseño de la solución.
4. Justificación de los controles seleccionados de ISO/IEC 27002.
5. Diseño del instrumento de evaluación (documentado, no solo implementado).
6. Justificación de la metodología de nivel de madurez.
7. Justificación de la metodología de cálculo de riesgo.
8. Modelo Entidad-Relación (diagrama).
9. Diccionario de datos.
10. Manual de usuario / Manual técnico.
11. Presentación y video demostrativo.
12. **Valor agregado** (mínimo 3 funcionalidades no contempladas en el enunciado): buenos candidatos
    ya construidos que se pueden **justificar** como valor agregado:
    - Sistema de autenticación con dos tipos de usuario y roles diferenciados (no lo pedía el
      enunciado con ese detalle).
    - Dashboards personalizados por rol con indicadores en tiempo real.
    - Edición en línea del catálogo de controles con control de permisos por rol.

---

## 4. Prioridad sugerida para la próxima sesión

1. **Conectar el flujo de "responder cuestionario" al backend real** (punto 4 arriba) — sin esto,
   nada de lo demás tiene datos reales con los que probarse.
2. **Agregar columna `peso` a `Controles`** + diseñar/justificar/implementar el cálculo de riesgo.
3. **Diseñar/justificar/implementar el nivel de madurez 0-5.**
4. Decidir si el modelo de "preguntas por control" se implementa de verdad (cambio de esquema
   grande) o si se justifica formalmente por qué se evalúa a nivel de control — esto es una decisión
   de equipo, no solo técnica, revisen el enunciado con el profesor si hay dudas.
5. Cargar el catálogo real de controles (reemplazando los 10 de prueba) una vez esté justificado.
6. Construir la vista de reportes/gráficos que falta (puede reusar los endpoints de `ReporteRepository`
   que ya existen).

---

## 5. Cómo verificar que algo "ya funciona" antes de tocarlo

- Backend: `php -S localhost:8000 -t backend/public` y `curl http://localhost:8000/salud`.
- Frontend: `npm run dev` dentro de `frontend/` (proxy `/api` → `http://localhost:8000`).
- Base de datos local: Postgres en `localhost:5432`, base `cloud_cr`, usuario/clave `postgres`/`postgres`.
- `backend/docs/Api.md` tiene ejemplos de cada endpoint con `curl`.
- `backend/docs/Gaps.md` documenta, con DDL incluido, todo lo que el esquema actual no permite
  implementar todavía — léanlo antes de asumir que algo es un bug del código y no una limitación del
  modelo de datos.
