# Diseño del Instrumento de Evaluación

**Proyecto:** Evaluación del Riesgo en la Administración de Bases de Datos basada en ISO/IEC 27002
**Curso:** EIF402 — Administración de Bases de Datos, Universidad Nacional

---

## 1. Propósito del instrumento

El instrumento de evaluación es el cuestionario estructurado que el evaluador (auditor) aplica a una
organización para determinar el grado de implementación de los controles de seguridad de la norma
ISO/IEC 27002:2022 aplicables a la administración de bases de datos.

Sus resultados alimentan directamente:

1. El **nivel de madurez 0–5** de cada control (ver `Metodologia_Madurez.md`).
2. La **exposición al riesgo** de Confidencialidad, Integridad y Disponibilidad
   (ver `Metodologia_Riesgo.md`).
3. Los reportes e indicadores del sistema (resumen, mapa de calor, hallazgos, historial).

## 2. Alcance

El instrumento evalúa exclusivamente controles asociados a la administración de bases de datos.
Se seleccionaron **10 controles** del dominio **Tecnológicos (cláusula 8)** de ISO/IEC 27002:2022,
por ser el dominio donde la norma concentra las salvaguardas operativas que un Administrador de
Bases de Datos (DBA) implementa o supervisa directamente. La justificación individual de cada
control se desarrolla en el documento *Justificación de los controles seleccionados*.

## 3. Estructura del instrumento

El instrumento tiene tres niveles jerárquicos, reflejados uno a uno en el modelo de datos
(`database/Modelo_Relacional.sql`):

```
Control (10)  →  Pregunta (43)  →  Respuesta (4 atributos: Sí / No / N/A)
```

### 3.1 Nivel 1 — Ficha del control

Cada control registra los metadatos que exige el enunciado del proyecto:

| Campo | Descripción | Columna en BD |
|---|---|---|
| Código | Identificador dentro de la norma (ej. `8.2`) | `Controles.codigo` |
| Nombre | Nombre oficial del control | `Controles.nombre` |
| Dominio de la norma | Cláusula 5–8 de ISO/IEC 27002:2022 | `Dominios_Norma` |
| Objetivo (propósito) | Qué busca garantizar el control | `Controles.proposito` |
| Descripción | Enunciado del control según la norma | `Controles.descripcion` |
| Peso (importancia) | Entero 1–10, impacto relativo para un entorno de BD | `Controles.peso` |
| Relación con C / I / D | `Primario`, `Secundario` o no aplica (`NULL`) | `Controles.confidencialidad / integridad / disponibilidad` |
| Guía de implementación | Prácticas recomendadas por la norma | `Controles.guia` |
| Atributos de la norma | Tipo, conceptos de ciberseguridad, dominios de seguridad, capacidades operativas | tablas puente N:M |

### 3.2 Nivel 2 — Preguntas

Cada control se transforma en **una o varias preguntas** (43 en total, entre 4 y 5 por control).
Las preguntas se derivaron de la **guía de implementación** oficial del control en la norma,
siguiendo estos criterios de redacción:

- **Observables y verificables:** cada pregunta describe una práctica que el auditor puede
  constatar mediante entrevista, demostración o revisión documental, no una opinión.
- **Agrupación de prácticas afines:** cada pregunta consolida un conjunto coherente de prácticas
  de la guía (ej. "identidades privilegiadas propias + no compartidas + MFA" en una sola pregunta),
  para mantener el cuestionario aplicable en una sesión de auditoría razonable.
- **Cobertura completa del control:** el conjunto de preguntas de un control cubre todas las
  prácticas esenciales de su guía de implementación.
- **Contextualizadas a bases de datos:** las preguntas mencionan explícitamente gestores de bases
  de datos, cuentas como `postgres`/`sa`/`root`, respaldos, bitácoras del motor, etc.

### 3.3 Nivel 3 — Atributos de respuesta

Cada pregunta **no** se responde con un único Sí/No: se califica en **cuatro atributos
independientes**, cada uno con valores `Sí` / `No` / `N/A`:

| Atributo | Pregunta implícita | Qué evidencia captura |
|---|---|---|
| `cumple` | ¿La práctica se aplica en la organización? | Existencia de la práctica |
| `documentado` | ¿Existe un procedimiento o política escrita que la respalda? | Formalización |
| `repetible` | ¿Se ejecuta de forma consistente y sistemática, no ad hoc? | Consistencia del proceso |
| `evidencia` | ¿Existen registros o artefactos que demuestran su ejecución? | Verificabilidad / supervisión |

**Justificación del diseño de cuatro atributos:** un solo Sí/No por pregunta obligaría al auditor a
un juicio binario que pierde la información necesaria para distinguir niveles de madurez. Los cuatro
atributos corresponden a las dimensiones que separan los niveles de la escala 0–5 del enunciado
(existencia → informalidad → documentación → consistencia → evidencia/supervisión), de modo que el
nivel de madurez puede **calcularse** a partir de datos observados en vez de asignarse
subjetivamente. Ver `Metodologia_Madurez.md`, sección 3.

**Uso de `N/A`:** se responde `N/A` en `cumple` cuando la práctica no aplica al contexto de la
organización (ej. no usa proveedores externos de nube). Las preguntas con `cumple = N/A` se excluyen
de todos los denominadores de cálculo; no premian ni castigan.

**Justificación obligatoria del `N/A`.** Como el `N/A` retira la pregunta del cálculo, es la única
respuesta que puede usarse para inflar artificialmente el resultado de una auditoría. Por eso el
instrumento exige registrar el campo **`justificacion_no_aplica`** (10–500 caracteres) explicando
por qué la práctica no es aplicable a la organización. La regla se aplica en tres capas: el
formulario muestra el campo y bloquea el guardado, el API responde 422 si falta, y la tabla
`Respuestas` tiene un `CHECK` que impide la fila. Cuando la respuesta deja de ser `N/A`, la
justificación se descarta automáticamente. Las justificaciones quedan listadas en el reporte
ejecutivo (sección *Preguntas no aplicables*), de modo que la exclusión sea auditable.

## 4. Catálogo de controles del instrumento

| Código | Control | Peso | C | I | D | Preguntas |
|---|---|---|---|---|---|---|
| 8.2 | Derechos de acceso privilegiado | 9 | Primario | Primario | Secundario | 4 |
| 8.5 | Autenticación segura | 9 | Primario | Primario | Secundario | 4 |
| 8.7 | Protección contra malware | 9 | Primario | Primario | Primario | 5 |
| 8.12 | Prevención de fuga de datos | 6 | Primario | — | — | 5 |
| 8.13 | Copia de seguridad de la información | 9 | — | Primario | Primario | 4 |
| 8.15 | Registro (logging) | 8 | Secundario | Secundario | Secundario | 4 |
| 8.20 | Seguridad de redes | 8 | Primario | Primario | Secundario | 4 |
| 8.24 | Uso de criptografía | 8 | Primario | Primario | Secundario | 4 |
| 8.31 | Separación de entornos de desarrollo, prueba y producción | 6 | Primario | Primario | Secundario | 5 |
| 8.32 | Gestión de cambios | 8 | Secundario | Primario | Secundario | 4 |

*(— = la norma no marca esa propiedad para el control; se registra `NULL` y el control no
participa en el cálculo de esa dimensión.)*

El texto completo de las 43 preguntas está en `database/Datos_Iniciales.sql` y es consultable en la
aplicación (`GET /controles`, pantalla *Cuestionario de control interno*).

## 5. Procedimiento de aplicación

1. **Creación de la auditoría.** El evaluador crea un cuestionario
   (`POST /cuestionarios`) indicando organización, evaluador y fecha.
2. **Sesión de auditoría.** Mediante entrevista con el DBA y revisión documental, el evaluador
   responde cada pregunta calificando los cuatro atributos.
3. **Guardado parcial.** Las respuestas se guardan pregunta por pregunta
   (`PUT /cuestionarios/{id}/respuestas/{preguntaId}`, operación idempotente tipo *upsert*) o por
   lotes transaccionales (`POST /cuestionarios/{id}/respuestas`). Esto permite **pausar y retomar**
   la auditoría, requisito explícito del enunciado. El endpoint
   `GET /cuestionarios/{id}/respuestas/pendientes` lista lo que falta por responder.
4. **Cierre y cálculo.** Con las respuestas registradas, el sistema calcula automáticamente
   cumplimiento, madurez por control, exposición al riesgo por dimensión e indicadores
   (`/resumen`, `/mapa-calor`, `/hallazgos`, `/historial`).

## 6. Reglas de calificación para el auditor

Para garantizar consistencia entre auditores, se fijan estos criterios:

- `cumple = Sí` exige que la práctica se aplique en los sistemas de bases de datos **en el momento
  de la auditoría**, no que esté planificada.
- `documentado = Sí` exige documento formal (política, procedimiento, instructivo) vigente y
  accesible; borradores o conocimiento tribal cuentan como `No`.
- `repetible = Sí` exige que la práctica se ejecute igual ante cada ocurrencia (calendario, proceso
  definido, automatización); ejecuciones esporádicas o dependientes de una sola persona cuentan
  como `No`.
- `evidencia = Sí` exige artefactos verificables: bitácoras, actas, tiquetes, reportes de pruebas
  de restauración, registros de revisión de accesos, etc.
- Ante duda entre `Sí` y `No`, se responde `No` (criterio conservador: el riesgo se sobreestima,
  nunca se subestima).

## 7. Trazabilidad con el resto de la solución

| Componente | Cómo consume el instrumento |
|---|---|
| Nivel de madurez | Tasas de `Sí` de los 4 atributos por control → índice 0–5 (`Metodologia_Madurez.md`) |
| Exposición al riesgo | Madurez × peso × relación C/I/D (`Metodologia_Riesgo.md`) |
| Mapa de calor | Cumplimiento por dimensión, desglosado Primario/Secundario |
| Hallazgos | Preguntas con `cumple = No`, ordenadas por peso del control |
| Historial | Serie de cumplimiento por organización a lo largo del tiempo |
