# Justificación de la Metodología de Cálculo de la Exposición al Riesgo

**Proyecto:** Evaluación del Riesgo en la Administración de Bases de Datos basada en ISO/IEC 27002
**Curso:** EIF402 — Administración de Bases de Datos, Universidad Nacional

---

## 1. Marco conceptual

Se adopta el modelo clásico de la gestión de riesgos (alineado con ISO/IEC 27005 y NIST SP 800-30,
simplificado a los datos que el instrumento captura):

```
Riesgo ≈ Probabilidad de que el control falle × Impacto de esa falla
```

En un cuestionario de controles no se miden amenazas ni frecuencias de incidentes; lo que sí se mide
es **qué tan deficiente está cada salvaguarda**. Por eso el modelo usa dos proxies observables:

- **Probabilidad → deficiencia del control.** Un control inmaduro falla con mayor probabilidad.
  Se usa la brecha de madurez como aproximación de la probabilidad de falla.
- **Impacto → peso del control × relación con la dimensión.** El `peso` (1–10) definido y
  justificado por el equipo expresa cuánto daño causa la ausencia del control en un entorno de
  bases de datos; la relación C/I/D (`Primario`/`Secundario`/nula) expresa **sobre cuál propiedad**
  de la información recae ese daño.

## 2. Componentes del cálculo

### 2.1 Deficiencia del control

A partir del nivel de madurez `n(c) ∈ [1, 5]` que el evaluador declaró para el control (ver
`Metodologia_Madurez.md`):

```
d(c) = 1 − n(c) / 5          ∈ [0, 0.8]
```

- `d = 0`: control optimizado (nivel 5) → no aporta riesgo.
- `d = 0.8`: control inicial / ad hoc (nivel 1) → aporta casi todo su riesgo potencial.

El máximo es `0.8` y no `1` porque la escala arranca en 1: un control declarado sigue existiendo, por
improvisado que sea. El caso "el control no existe" no se modela con deficiencia 1, sino dejando el
control sin declarar, y entonces queda fuera del cálculo (sección 3.4) y se reporta como pendiente.

### 2.2 Relevancia dimensional

La norma marca cada control como `Primario`, `Secundario` o sin relación respecto a
Confidencialidad (C), Integridad (I) y Disponibilidad (D). Se traduce a un factor:

| Relación en la norma | Factor `r(c, X)` | Justificación |
|---|---|---|
| `Primario` | 1.0 | El control protege esa propiedad de forma directa |
| `Secundario` | 0.5 | La protege de forma indirecta o parcial |
| `NULL` (sin relación) | 0.0 | El control no participa en esa dimensión |

El factor 0.5 para `Secundario` es una decisión de diseño: refleja "la mitad de la contribución"
sin introducir una escala arbitraria de varios parámetros. Es la misma semántica que ya usa el
mapa de calor de la aplicación, que desglosa cumplimiento primario y secundario por dimensión.

### 2.3 Impacto relativo

`peso(c) ∈ [1, 10]` — columna `Controles.peso`, definida y justificada por el equipo para cada
control según su criticidad en la administración de bases de datos (ver
`Instrumento_Evaluacion.md`, sección 4).

## 3. Fórmulas

### 3.1 Exposición al riesgo por dimensión (C, I, D)

Para cada dimensión `X ∈ {Confidencialidad, Integridad, Disponibilidad}`, sobre los controles
evaluados (con al menos una pregunta aplicable):

```
           Σc  peso(c) × r(c, X) × d(c)
E(X) =  ─────────────────────────────────          ∈ [0, 1]
           Σc  peso(c) × r(c, X)
```

Es un **promedio de deficiencias ponderado por impacto**: cada control contribuye a la dimensión en
proporción a su peso y a su relevancia sobre esa propiedad. El resultado se expresa como
porcentaje (ej. `E(C) = 0.34` → exposición de Confidencialidad del 34 %).

### 3.2 Índice general de exposición al riesgo

```
           Σc Σx  peso(c) × r(c, X) × d(c)
E(G) =  ──────────────────────────────────────      ∈ [0, 1]
           Σc Σx  peso(c) × r(c, X)
```

Agrega las tres dimensiones en un solo indicador. No es el promedio simple de `E(C)`, `E(I)` y
`E(D)`: las dimensiones con mayor masa de protección (más controles primarios y de mayor peso)
influyen más, lo cual es deseable — representa la exposición del conjunto real de salvaguardas,
no de tres promedios abstractos.

### 3.3 Exposición por control (para rankings y hallazgos)

```
ER(c) = (peso(c) / 10) × d(c)          ∈ [0, 1]
```

Ordena los controles de mayor a menor riesgo residual y alimenta los reportes "controles con mayor
exposición al riesgo" y "controles con menor nivel de madurez" que pide el enunciado.

### 3.4 Exclusiones

- Controles sin nivel de madurez declarado: fuera de numerador y denominador.
- Dimensiones donde el control tiene relación `NULL`: factor 0, no participa.
- Si una dimensión queda sin ningún control aplicable, se reporta "sin datos" (igual que hace hoy
  el mapa de calor con denominador 0), nunca 0 % de riesgo.

## 4. Escala de interpretación (semáforo)

Coherente con la escala de cumplimiento ya usada por la aplicación
(rojo < 0.60 ≤ amarillo < 0.85 ≤ verde, sobre cumplimiento), invertida para riesgo:

| Exposición | Nivel de riesgo | Color | Lectura ejecutiva |
|---|---|---|---|
| 0.00 – 0.15 | Bajo | Verde | Postura sólida; mantener y medir |
| 0.15 – 0.40 | Medio | Amarillo | Brechas concretas; plan de remediación priorizado |
| 0.40 – 1.00 | Alto | Rojo | Exposición inaceptable; acción inmediata |

## 5. Ejemplo numérico completo

Cuestionario con tres controles evaluados (niveles declarados según
`Metodologia_Madurez.md`):

| Control | peso | C | I | D | n | d = 1 − n/5 |
|---|---|---|---|---|---|---|
| 8.2 Accesos privilegiados | 9 | 1.0 | 1.0 | 0.5 | 4 | 0.20 |
| 8.13 Copia de seguridad | 9 | 0 | 1.0 | 1.0 | 3 | 0.40 |
| 8.24 Criptografía | 8 | 1.0 | 1.0 | 0.5 | 1 | 0.80 |

**Confidencialidad:**

```
Numerador   = 9(1.0)(0.20) + 9(0)(0.40) + 8(1.0)(0.80) = 1.80 + 0 + 6.40 = 8.20
Denominador = 9(1.0) + 0 + 8(1.0) = 17.0
E(C) = 8.20 / 17.0 = 0.482  →  48.2 %  →  riesgo ALTO (rojo)
```

**Integridad:**

```
Numerador   = 9(1.0)(0.20) + 9(1.0)(0.40) + 8(1.0)(0.80) = 1.80 + 3.60 + 6.40 = 11.80
Denominador = 9 + 9 + 8 = 26.0
E(I) = 11.80 / 26.0 = 0.454  →  45.4 %  →  riesgo ALTO (rojo)
```

**Disponibilidad:**

```
Numerador   = 9(0.5)(0.20) + 9(1.0)(0.40) + 8(0.5)(0.80) = 0.90 + 3.60 + 3.20 = 7.70
Denominador = 4.5 + 9 + 4 = 17.5
E(D) = 7.70 / 17.5 = 0.440  →  44.0 %  →  riesgo ALTO (rojo)
```

**Índice general:**

```
E(G) = (8.20 + 11.80 + 7.70) / (17.0 + 26.0 + 17.5) = 27.70 / 60.5 = 0.458  →  45.8 %
```

**Ranking por control:** `ER(8.24) = 0.8 × 0.80 = 0.64` > `ER(8.13) = 0.9 × 0.40 = 0.36` >
`ER(8.2) = 0.9 × 0.20 = 0.18`. La criptografía es la prioridad de remediación aunque su peso sea
menor que el de los otros dos: su madurez es mucho más baja.

## 6. Consistencia con el resto de la solución

El enunciado valora explícitamente la coherencia entre componentes. La cadena completa es:

```
Controles seleccionados (peso, C/I/D justificados)
   → Instrumento (nivel de madurez declarado por control + 43 preguntas con 4 atributos)
      → Madurez (nivel 1–5 escogido entre los descriptores COBIT del control)
         → Riesgo (deficiencia = 1 − nivel/5, ponderada por peso y relación C/I/D)
            → Indicadores (mapa de calor C/I/D, ranking de controles, índice general, semáforo)
```

Cada eslabón consume exclusivamente salidas del anterior; no hay parámetros ocultos ni datos
capturados fuera del instrumento.

## 7. Propiedades y limitaciones

**Propiedades:**

- Determinista y reproducible: los mismos niveles declarados producen siempre la misma exposición.
- Monótono: subir el nivel de madurez de cualquier control reduce (o mantiene) la exposición, nunca
  la aumenta.
- Acotado en `[0, 1]` en todos los niveles (control, dimensión, general), apto para semáforos y
  comparaciones entre cuestionarios de distinto tamaño.

**Limitaciones (asumidas y documentadas):**

- No modela amenazas ni frecuencia de incidentes: es riesgo **de control** (deficiencia de
  salvaguardas), no riesgo de escenario. Es lo apropiado para un cuestionario de controles.
- La deficiencia hereda el juicio experto del nivel declarado; su trazabilidad depende de que el
  evaluador haya escogido el descriptor que efectivamente corresponde a la organización.
- El factor 0.5 de `Secundario` y los umbrales del semáforo son decisiones de calibración del
  equipo; se documentan aquí para poder revisarlos con datos reales de cuestionarios futuros.
- El impacto se hereda del `peso` estático del catálogo; una organización con requisitos atípicos
  (ej. disponibilidad extrema) puede requerir recalibrar pesos en su instancia del catálogo, cosa
  que la aplicación permite mediante la edición de controles.
