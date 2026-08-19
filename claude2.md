# Prompt para Claude Code — CloudCR, módulo Monitor de Salud

Contexto: ya existe un `CLAUDE.md` en la raíz del proyecto con la arquitectura
completa y el reparto de tareas. Este prompt es para dos ajustes puntuales
sobre el módulo `monitor` que ya está construido (dashboard con datos
simulados: índice de salud, tarjetas de Procesos/Memoria/Archivos, panel de
alertas e histórico).

---

## Tarea 1 — Restringir el acceso a solo evaluadores

El proyecto ya tiene un sistema de roles funcionando (`session.rol` puede ser
`'evaluador'` u `'organizacion'`), usado en otras rutas así:

```jsx
<Protected allowedRoles={['evaluador']}><InternalControlQuestionnairePage /></Protected>
```

Quiero que apliques exactamente ese mismo patrón a todas las rutas del
módulo `monitor` en `frontend/src/app/router.jsx`: envuélvelas con
`<Protected allowedRoles={['evaluador']}>`, igual que se hace con
`internal-control-questionnaire`.

También agrega la entrada del menú del monitor en
`frontend/src/common/components/sidebar/Sidebar.jsx` con la misma condición
que ya usan otros ítems solo para evaluador:

```js
show: (session) => session?.rol === 'evaluador',
```

En el backend, revisa `AuthController.php` y el middleware/validación que ya
exista para las rutas protegidas por rol, y aplícala igual a las rutas de
`/monitor/*` en `routes/routes.php`, para que un usuario tipo `organizacion`
no pueda llamar al endpoint aunque adivine la URL directamente por API.

## Tarea 2 — Pantalla selectora de bases de datos antes del dashboard

Hoy la ruta `monitor` va directo al dashboard de una sola base de datos. Lo
que necesito es una pantalla intermedia:

1. Nueva página `MonitorSelectorPage` en `frontend/src/modules/monitor/pages/`,
   que se muestra primero al entrar a `/monitor`.
2. Esa página lista **varias bases de datos monitoreadas** (por ahora con
   datos simulados/mock, igual que el resto del módulo — no hay conexión
   real todavía). Cada tarjeta/fila debe mostrar al menos: nombre de la base
   de datos, motor (ej. Oracle, PostgreSQL), un resumen de estado con
   semáforo de color (Óptimo/Saludable/Advertencia/Degradado/Crítico) y
   fecha de última actualización.
3. Al hacer clic en una base de datos, navega al dashboard que ya existe
   (el de índice de salud + componentes + alertas + histórico), pasando el
   identificador de esa base de datos por la URL, por ejemplo
   `/monitor/:baseDatosId`.
4. El dashboard actual debe seguir funcionando igual que ahora, solo que
   ahora recibe `baseDatosId` desde la ruta y lo usa para filtrar/etiquetar
   los datos simulados que ya genera (no hace falta que los datos cambien
   de verdad por base de datos todavía, solo que la navegación y el
   identificador queden correctamente conectados end-to-end).
5. Actualiza `router.jsx` así:
   - `monitor` → `MonitorSelectorPage` (protegida, solo evaluador)
   - `monitor/:baseDatosId` → el dashboard existente (protegida, solo evaluador)
6. Sigue el mismo patrón de módulos ya usado en el proyecto (carpetas
   `pages/`, `components/`, `services/` dentro de `modules/monitor/`, cliente
   HTTP centralizado en `common/lib/api.js`, componentes funcionales, textos
   en español).

## Qué no cambiar

- No toques la lógica de cálculo de indicadores (IP/IM/IA/ISBD) ni las
  tablas de base de datos ya definidas para este módulo.
- No conectes a Oracle real: seguimos con datos simulados hasta que se
  confirme con el profesor, según ya quedó anotado en `CLAUDE.md`.

## Entregable esperado

Muéstrame el diff antes de aplicar cambios, y al final una lista corta de
los archivos nuevos y modificados.