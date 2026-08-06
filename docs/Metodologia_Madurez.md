# Justificación de la Metodología de Nivel de Madurez

**Proyecto:** Evaluación del Riesgo en la Administración de Bases de Datos basada en ISO/IEC 27002
**Curso:** EIF402 — Administración de Bases de Datos, Universidad Nacional

---

## 1. Escala de madurez (fijada por el enunciado)

| Nivel | Descripción |
|---|---|
| 0 | El control no existe. No hay evidencia de su implementación. |
| 1 | El control existe de manera informal o es aplicado ocasionalmente, sin procedimientos definidos. |
| 2 | El control se aplica parcialmente y existen algunas prácticas documentadas, aunque no de forma consistente. |
| 3 | El control se encuentra documentado, definido e implementado en la mayor parte de los procesos. |
| 4 | El control se encuentra completamente implementado, es supervisado periódicamente y existen evidencias de su cumplimiento. |
| 5 | El control se encuentra completamente implementado, es medido, evaluado continuamente y forma parte de un proceso de mejora continua. |

## 2. Principio de diseño: madurez calculada, no asignada

Muchas metodologías piden al auditor asignar el nivel 0–5 directamente "a ojo". Esa aproximación es
rápida pero subjetiva: dos auditores pueden calificar distinto el mismo hallazgo, y no queda rastro
de **por qué** un control obtuvo un 3 y no un 4.

Nuestra metodología **deriva** el nivel de madurez de los datos crudos del instrumento. Cada
pregunta se califica en cuatro atributos observables (`cumple`, `documentado`, `repetible`,
`evidencia` — ver `Instrumento_Evaluacion.md`, sección 3.3), elegidos porque corresponden
exactamente a las dimensiones que separan los niveles de la escala del enunciado:

| Atributo del instrumento | Dimensión de madurez que captura | Niveles que discrimina |
|---|---|---|
| `cumple` | Existencia de la práctica | 0 → 1 |
| `documentado` | Formalización (procedimientos definidos) | 1 → 2/3 |
| `repetible` | Consistencia (no ad hoc, no dependiente de personas) | 2 → 3 |
| `evidencia` | Supervisión y verificabilidad | 3 → 4 |
| Los cuatro en el 100 % de las preguntas | Gestión completa y medible del control | 4 → 5 |

Esta correspondencia está inspirada en los modelos de madurez de capacidad tipo **CMMI** y en la
escala de madurez de procesos de **COBIT**, donde los niveles superiores no agregan "más de lo
mismo" sino cualidades nuevas: primero se hace, luego se documenta, luego se vuelve repetible,
luego se supervisa con evidencia, y finalmente se mide y mejora continuamente.

## 3. Fórmula de cálculo

### Paso 1 — Tasas de atributo por control

Para cada control `c`, sobre sus **preguntas aplicables** (aquellas con `cumple ≠ N/A`):

```
tC = preguntas con cumple      = 'Sí'  /  preguntas aplicables
tD = preguntas con documentado = 'Sí'  /  preguntas aplicables
tR = preguntas con repetible   = 'Sí'  /  preguntas aplicables
tE = preguntas con evidencia   = 'Sí'  /  preguntas aplicables
```

Cada tasa está en `[0, 1]`. Los atributos con valor `N/A` o `No` no suman al numerador.

### Paso 2 — Índice de madurez continuo

```
IM(c) = 5 × (tC + tD + tR + tE) / 4        ∈ [0, 5]
```

Los cuatro atributos ponderan igual: cada uno representa una dimensión distinta e igualmente
necesaria de la madurez (hacer, formalizar, sistematizar, evidenciar). El índice continuo se usa
además como insumo fino del cálculo de riesgo (ver `Metodologia_Riesgo.md`).

### Paso 3 — Nivel discreto con topes cualitativos

El nivel 0–5 se obtiene redondeando `IM(c)` al entero más cercano y aplicando **topes** que
preservan el significado cualitativo de la escala del enunciado:

```
nivel_bruto = redondear(IM(c))

Topes:
  si tD = 0            →  nivel máximo 2   (sin nada documentado no puede ser "documentado y definido")
  si tE = 0            →  nivel máximo 3   (sin evidencias no puede ser "supervisado con evidencias")
  si alguna tasa < 1   →  nivel máximo 4   (el nivel 5 exige gestión completa en el 100 % del control)

nivel(c) = min(nivel_bruto, topes aplicables)
```

**Por qué los topes:** el promedio puro permitiría compensaciones absurdas — por ejemplo, un
control 100 % cumplido y repetible pero con cero evidencia daría `IM = 3.75 → 4`, cuando la escala
define el nivel 4 precisamente por la existencia de evidencias. Los topes garantizan que cada nivel
solo se alcanza cuando su condición cualitativa se cumple, manteniendo a la vez la granularidad del
promedio para los niveles intermedios.

### Caso especial

Si un control no tiene preguntas aplicables (todas `N/A`), el control queda **fuera de la
evaluación**: sin nivel de madurez y excluido del cálculo de riesgo. No se le asigna 0, porque la
ausencia de aplicabilidad no es ausencia de control.

## 4. Verificación contra la escala del enunciado

| Situación observada en la auditoría | tC | tD | tR | tE | IM | Topes | Nivel | ¿Coincide con la escala? |
|---|---|---|---|---|---|---|---|---|
| Nada existe | 0 | 0 | 0 | 0 | 0.00 | — | **0** | ✔ "No existe" |
| Se aplica en la mitad de los casos, sin nada más | 0.5 | 0 | 0 | 0 | 0.63 | tD=0→máx 2 | **1** | ✔ "Informal, ocasional" |
| Se aplica siempre, pero informal | 1 | 0 | 0 | 0 | 1.25 | tD=0→máx 2 | **1** | ✔ "Sin procedimientos definidos" |
| Se aplica siempre, mitad documentado, nada consistente | 1 | 0.5 | 0 | 0 | 1.88 | tD>0, tE=0→máx 3 | **2** | ✔ "Parcial, algunas prácticas documentadas, no consistente" |
| Aplicado y documentado por completo, aún sin evidencias | 1 | 1 | 1 | 0 | 3.75 | tE=0→máx 3 | **3** | ✔ "Documentado, definido e implementado" |
| Todo lo anterior + evidencias en la mayoría | 1 | 1 | 1 | 0.75 | 4.69 | tasa<1→máx 4 | **4** | ✔ "Implementado, supervisado, con evidencias" |
| Gestión completa: 100 % en los cuatro atributos | 1 | 1 | 1 | 1 | 5.00 | — | **5** | ✔ "Medido, mejora continua" |
| Solo existe "en papel" (documentado pero no aplicado) | 0 | 1 | 0 | 0 | 1.25 | tE=0→máx 3 | **1** | ✔ Un control no aplicado es, a lo sumo, incipiente |

**Sobre el nivel 5:** el instrumento no pregunta directamente por "mejora continua"; se adopta como
proxy la **perfección consistente**: un control donde el 100 % de las preguntas están cumplidas,
documentadas, repetibles y con evidencia demuestra un proceso gestionado de extremo a extremo, que
es la condición material del nivel 5. Es deliberadamente exigente: el nivel máximo debe ser
excepcional.

## 5. Ejemplo numérico completo

Control **8.13 — Copia de seguridad** (4 preguntas, todas aplicables). Respuestas de la auditoría:

| Pregunta | cumple | documentado | repetible | evidencia |
|---|---|---|---|---|
| 1 (política y calendario de respaldos) | Sí | Sí | Sí | Sí |
| 2 (cobertura de todos los motores) | Sí | Sí | Sí | No |
| 3 (pruebas de restauración) | No | No | No | No |
| 4 (protección de los respaldos) | Sí | No | Sí | No |

```
tC = 3/4 = 0.75      tD = 2/4 = 0.50      tR = 3/4 = 0.75      tE = 1/4 = 0.25
IM  = 5 × (0.75 + 0.50 + 0.75 + 0.25) / 4 = 5 × 0.5625 = 2.81
nivel_bruto = 3
Topes: tD > 0 y tE > 0 → sin tope por documentación/evidencia; tasas < 1 → máx 4.
nivel(8.13) = 3
```

Lectura: el respaldo existe, está parcialmente formalizado y es mayormente consistente, pero las
pruebas de restauración no se realizan y casi no hay evidencias — un nivel 3 con brechas claras que
aparecerán como hallazgos.

## 6. Agregaciones

- **Madurez por dominio de la norma:** promedio de `IM(c)` de los controles del dominio,
  ponderado por `peso`.
- **Madurez global de la auditoría:** promedio de `IM(c)` de todos los controles evaluados,
  ponderado por `peso`.

Se pondera por peso para que los controles más críticos para la administración de bases de datos
influyan más en el diagnóstico global, en coherencia con el modelo de riesgo.

## 7. Propiedades de la metodología

- **Objetividad y reproducibilidad:** el nivel se deriva de respuestas observables; dos auditores
  con las mismas respuestas obtienen el mismo nivel.
- **Trazabilidad:** todo nivel puede explicarse descomponiéndolo en sus cuatro tasas.
- **Monotonía:** mejorar cualquier atributo de cualquier pregunta nunca reduce el nivel.
- **Prudencia:** los topes cualitativos y el criterio conservador del instrumento (duda = `No`)
  sesgan hacia subestimar madurez, nunca hacia inflarla.
- **Implementable sin cambios de esquema:** todas las entradas existen en la tabla `Respuestas`
  (`cumple`, `documentado`, `repetible`, `evidencia`) y en `Controles.peso`; el cálculo es una
  agregación SQL/PHP sobre datos ya capturados.
