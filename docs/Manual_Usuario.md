# Manual de Usuario — CloudCR

**Proyecto:** Evaluación del Riesgo en la Administración de Bases de Datos basada en ISO/IEC 27002
**Curso:** EIF402 — Administración de Bases de Datos, Universidad Nacional

---

## 1. ¿Qué es CloudCR?

CloudCR es una aplicación web que automatiza la evaluación de los controles de seguridad de la
norma ISO/IEC 27002 aplicables a la administración de bases de datos. Permite a una empresa
consultora ejecutar auditorías con un cuestionario estructurado, guardar avances parciales,
calcular niveles de madurez y exposición al riesgo, y consultar reportes e indicadores.

## 2. Requisitos

- Navegador web moderno (Chrome, Edge, Firefox).
- Dirección de la aplicación provista por el administrador
  (en desarrollo local: `http://localhost:5173`).
- La aplicación es *responsive*: funciona en computadora, tableta y teléfono. El menú principal
  se abre con el botón ☰ de la esquina superior izquierda en todos los tamaños de pantalla.
- Desde el encabezado del menú puede alternar entre **modo claro y modo oscuro** (ícono de
  sol/luna); la preferencia se recuerda en el navegador.

## 3. Tipos de usuario (roles)

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Evaluador** | Auditor de la consultora | Ver y editar el catálogo de controles, realizar cuestionarios de auditoría, ver su panel con estadísticas |
| **Organización** | Empresa u organización evaluada | Ver su historial de evaluaciones, mapa de calor, cumplimiento y hallazgos en su panel |
| Visitante (sin sesión) | Cualquiera | Ver la página de inicio y consultar la lista de controles (solo lectura) |

## 4. Registro e inicio de sesión

### 4.1 Crear una cuenta

1. Entre a la aplicación y presione **Registrarse** (o vaya a `/registro`).
2. Seleccione el tipo de cuenta: **Evaluador** u **Organización**.
3. Complete: nombre, **correo**, **contraseña** y confirmación de contraseña.
4. Presione el botón de registro. Si el correo ya existe, el sistema lo indicará.
5. Al terminar, la sesión inicia automáticamente y se abre **Mi Panel**.

### 4.2 Iniciar sesión

1. Vaya a `/login`.
2. Ingrese correo y contraseña y presione **Iniciar sesión**.
3. Credenciales incorrectas muestran un mensaje de error; la cuenta no se bloquea.

### 4.3 Cerrar sesión

Al abrir el menú (☰), en la parte inferior aparece su nombre y rol; el ícono de salida cierra la
sesión y regresa a la pantalla de login. En la página de inicio también hay un botón de
iniciar/cerrar sesión en la esquina superior derecha.

### 4.4 Editar el perfil

Menú lateral → **Editar perfil** (`/perfil`). Permite actualizar nombre, correo y contraseña de la
cuenta con la que inició sesión.

## 5. Navegación

El menú principal (botón ☰, esquina superior izquierda) muestra las opciones según su rol:

| Opción | Visible para | Descripción |
|---|---|---|
| Inicio | Todos | Página de presentación del sistema |
| Mi Panel | Con sesión | Dashboard personalizado según el rol |
| Editar perfil | Con sesión | Datos de la cuenta |
| Cuestionario de Control Interno | Solo evaluador | Flujo de auditoría |
| Lista de Controles | Todos | Catálogo ISO/IEC 27002 |

## 6. Lista de Controles (`/control-list`)

Catálogo de los controles ISO/IEC 27002 cargados en el sistema.

- La tabla muestra norma, código, nombre, descripción, tipo y la relación de cada control con
  **Integridad**, **Disponibilidad** y **Confidencialidad** (chips `Primario` / `Secundario`).
- La tabla permite buscar, ordenar, ocultar columnas y cambiar la densidad de filas.
- Menú de acciones de cada fila:
  - **Ver detalle** — abre la ficha completa del control: propósito, descripción, guía de
    implementación, peso, atributos de la norma y sus preguntas.
  - **Editar** — visible **solo para evaluadores** con sesión iniciada. Permite modificar nombre,
    tipo, descripción y las propiedades de seguridad (C/I/D) del control.

## 7. Realizar una auditoría (solo evaluadores)

### 7.1 Crear o continuar una auditoría

Menú lateral → **Cuestionario de Control Interno**. Se muestra la lista de sus auditorías con su
estado (Sin iniciar / En progreso / Completa) y barra de avance.

- **Nueva auditoría:** botón *Nueva auditoría* → seleccione la organización y la fecha → *Crear y
  evaluar*. La auditoría queda registrada de inmediato en el sistema.
- **Continuar:** ícono ▶ de la fila. Retoma la auditoría exactamente donde quedó.
- **Eliminar:** ícono de papelera; pide confirmación y borra la auditoría con todas sus
  respuestas (irreversible).

### 7.2 Responder los controles

Al abrir una auditoría se muestra el encabezado con organización, auditor, fecha y avance global,
y la tabla de controles con el progreso de cada uno (ej. `2/4` preguntas).

1. Presione el ícono de **Responder preguntas** en la fila del control.
2. Cada pregunta se califica en **cuatro aspectos**, cada uno con **Sí / No / N/A**:
   - **Cumple** — ¿la práctica se aplica?
   - **Documentado** — ¿existe procedimiento escrito?
   - **Repetible** — ¿se ejecuta de forma consistente?
   - **Evidencia** — ¿hay registros que lo demuestran?
3. Use **N/A** únicamente cuando la práctica no aplica al contexto de la organización (al marcar
   N/A en *Cumple*, los demás aspectos se marcan N/A automáticamente).
4. Presione **Guardar avance** para registrar las respuestas en el sistema. El contador indica
   cuántos cambios están sin guardar. Puede **pausar la auditoría y continuarla otro día**: todo
   lo guardado persiste en la base de datos.
5. El botón **Ver detalle** muestra la ficha completa del control (propósito, guía de la norma)
   como referencia durante la entrevista.

> **Criterio del auditor:** ante duda entre Sí y No, responda **No**. El sistema está calibrado de
> forma conservadora: es preferible sobreestimar el riesgo que ocultarlo.

### 7.3 Ver el reporte ejecutivo

Desde la pantalla de controles de la auditoría, botón **Ver reporte ejecutivo** (también
disponible desde *Mi Panel*). El reporte muestra:

- Indicadores principales: exposición al riesgo general con semáforo, madurez global 0–5,
  cumplimiento y controles evaluados.
- **Exposición al riesgo por dimensión** (Confidencialidad / Integridad / Disponibilidad) con
  barras y nivel de riesgo (bajo / medio / alto).
- **Nivel de madurez por control** en barras 0–5 con su nivel.
- **Mapa de calor** de cumplimiento por dimensión.
- **Controles con mayor exposición** (prioridades de remediación) y **principales hallazgos**.

El botón **Imprimir / PDF** genera la versión imprimible del reporte (use "Guardar como PDF" del
navegador para exportarlo).

## 8. Mi Panel (`/panel`)

El contenido depende del rol con el que inició sesión.

### 8.1 Panel del evaluador

- **Estadísticas**: cuestionarios realizados, organizaciones evaluadas y cuestionarios del mes.
- **Cuestionarios recientes**: tabla con sus últimas auditorías.
- **Accesos rápidos** al cuestionario y al catálogo de controles.

### 8.2 Panel de la organización

- **Historial de evaluaciones** recibidas, con el porcentaje de cumplimiento de cada una y su
  color de semáforo (rojo < 60 %, amarillo < 85 %, verde ≥ 85 %).
- **Mapa de calor** de la última evaluación: cumplimiento por dimensión (Confidencialidad,
  Integridad, Disponibilidad), con desglose de controles primarios y secundarios.
- **Resumen de cumplimiento**: preguntas cumplidas, no cumplidas y no aplicables.
- **Principales hallazgos**: las preguntas respondidas "No", ordenadas por la importancia (peso)
  del control — la lista de prioridades de remediación.

## 9. Interpretación de los resultados

| Indicador | Qué significa |
|---|---|
| **Cumplimiento** | Porcentaje de preguntas aplicables respondidas "Sí" en *cumple* |
| **Nivel de madurez (0–5)** | Qué tan formalizado y gestionado está cada control; ver escala abajo |
| **Exposición al riesgo (C/I/D)** | Porcentaje de deficiencia ponderada de los controles que protegen cada propiedad |
| **Semáforo** | Verde = sólido, amarillo = brechas por atender, rojo = acción inmediata |

Escala de madurez: **0** inexistente · **1** informal · **2** parcial con documentación incompleta ·
**3** documentado e implementado · **4** implementado, supervisado y con evidencias ·
**5** medido y en mejora continua.

## 10. Mensajes de error frecuentes

| Mensaje | Causa | Qué hacer |
|---|---|---|
| "Los datos enviados no son válidos" | Campo obligatorio vacío o formato incorrecto | Revise los campos marcados |
| "…ya existe" (conflicto) | Nombre o correo duplicado | Use otro valor |
| "No se puede eliminar…" | El registro tiene historial de auditorías asociado | El sistema protege el historial; no es un error |
| Pantalla de acceso denegado | Su rol no tiene permiso para esa página | Inicie sesión con el rol adecuado |

## 11. Soporte

Para problemas de instalación o configuración, consulte el `Manual_Tecnico.md` o contacte al
equipo de desarrollo del proyecto.
