# Diseño del Instrumento de Evaluación

**Proyecto:** Evaluación del Riesgo en la Administración de Bases de Datos basada en ISO/IEC 27002
**Curso:** EIF402 — Administración de Bases de Datos, Universidad Nacional

---

## 1. Propósito del instrumento

El instrumento de evaluación es el cuestionario estructurado que el evaluador aplica a una
organización para determinar el grado de implementación de los controles de seguridad de la norma
ISO/IEC 27002:2022 aplicables a la administración de bases de datos.

Sus resultados alimentan directamente:

1. El **nivel de madurez 1–5** de cada control, declarado por el evaluador contra los descriptores
   COBIT del propio control (ver `Metodologia_Madurez.md`).
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

Cada control se evalúa en dos ramas —el nivel de madurez que se declara para el control completo y
las preguntas que se responden una por una—, reflejadas en el modelo de datos
(`database/Modelo_Relacional.sql`):

```
Control (10)  →  Nivel de madurez declarado (1 de 5 descriptores)
              →  Pregunta (43)  →  Respuesta (4 atributos: Sí / No / N/A)
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

- **Observables y verificables:** cada pregunta describe una práctica que el evaluador puede
  constatar mediante entrevista, demostración o revisión documental, no una opinión.
- **Agrupación de prácticas afines:** cada pregunta consolida un conjunto coherente de prácticas
  de la guía (ej. "identidades privilegiadas propias + no compartidas + MFA" en una sola pregunta),
  para mantener el cuestionario aplicable en una sesión de evaluación razonable.
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

**Justificación del diseño de cuatro atributos:** un solo Sí/No por pregunta obligaría al evaluador a
un juicio binario que pierde la información que sostiene el diagnóstico. Los cuatro atributos
recorren las dimensiones que la escala de madurez distingue (existencia → documentación →
consistencia → evidencia verificable), de modo que el cumplimiento medido sirve de **contraste
observable** del nivel de madurez que el evaluador declara para el control: una divergencia grande
entre ambos es en sí misma un hallazgo. Ver `Metodologia_Madurez.md`, sección 4.

**Uso de `N/A`:** se responde `N/A` en `cumple` cuando la práctica no aplica al contexto de la
organización (ej. no usa proveedores externos de nube). Las preguntas con `cumple = N/A` se excluyen
de los denominadores de cumplimiento y del mapa de calor; no premian ni castigan.

**Justificación obligatoria del `N/A`.** Como el `N/A` retira la pregunta del cálculo, es la única
respuesta que puede usarse para inflar artificialmente el resultado de un cuestionario. Por eso el
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

### 4.1 Descriptores de madurez del control

Cada uno de los diez controles tiene además **cinco descriptores de madurez** (uno por nivel),
derivados del modelo de madurez COBIT 4.1 del objetivo de control equivalente. Se cargan en la tabla
`Niveles_Madurez_Control` con `database/Datos_Iniciales.sql` y viajan en el detalle del control
(`GET /controles/{id}`, campo `niveles_madurez`). El mapeo control ↔ objetivo COBIT está en
`Metodologia_Madurez.md`, sección 3.

## 5. Procedimiento de aplicación

1. **Creación del cuestionario.** El evaluador crea un cuestionario
   (`POST /cuestionarios`) indicando organización, evaluador y fecha.
2. **Declaración del nivel de madurez.** Al abrir cada control, y antes de responder sus preguntas,
   el evaluador escoge cuál de los cinco descriptores de ese control describe a la organización
   (`PUT /cuestionarios/{id}/niveles-madurez/{controlId}`, idempotente).
3. **Sesión de evaluación.** Mediante entrevista con el DBA y revisión documental, el evaluador
   responde cada pregunta calificando los cuatro atributos.
4. **Guardado parcial.** Las respuestas se guardan pregunta por pregunta
   (`PUT /cuestionarios/{id}/respuestas/{preguntaId}`, operación idempotente tipo *upsert*) o por
   lotes transaccionales (`POST /cuestionarios/{id}/respuestas`). Esto permite **pausar y retomar**
   el cuestionario, requisito explícito del enunciado. El endpoint
   `GET /cuestionarios/{id}/respuestas/pendientes` lista lo que falta por responder.
5. **Cierre y cálculo.** Con los niveles declarados y las respuestas registradas, el sistema calcula
   automáticamente cumplimiento, madurez agregada, exposición al riesgo por dimensión e indicadores
   (`/resumen`, `/madurez`, `/riesgo`, `/mapa-calor`, `/hallazgos`, `/historial`).

## 6. Reglas de calificación para el evaluador

Para garantizar consistencia entre evaluadores, se fijan estos criterios:

- El **nivel de madurez** se declara escogiendo el descriptor que la organización cumple **por
  completo**; si cumple parcialmente el nivel superior, se declara el inferior (mismo criterio
  conservador que rige los atributos).
- `cumple = Sí` exige que la práctica se aplique en los sistemas de bases de datos **en el momento
  del cuestionario**, no que esté planificada.
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
| Nivel de madurez | Nivel 1–5 declarado por control; agregado por dominio y global ponderando por peso (`Metodologia_Madurez.md`) |
| Exposición al riesgo | Deficiencia (1 − nivel/5) × peso × relación C/I/D (`Metodologia_Riesgo.md`) |
| Mapa de calor | Cumplimiento por dimensión, desglosado Primario/Secundario |
| Hallazgos | Preguntas con `cumple = No`, ordenadas por peso del control |
| Historial | Serie de cumplimiento por organización a lo largo del tiempo |
