# API — Cloud CR / Cuestionario de Control Interno

Base URL de desarrollo: `http://localhost:8000`

Toda respuesta es JSON. Las exitosas vienen envueltas en `data` (y `meta` cuando hay
paginacion); las de error, en `error`.

```json
{ "data": { "id": 1, "nombre": "TechCorp S.A." } }
```

```json
{ "error": { "status": 422, "mensaje": "Los datos enviados no son validos.",
             "errores": { "nombre": "Es obligatorio." } } }
```

## Codigos de estado

| Codigo | Cuando |
|---|---|
| 200 | Consulta o actualizacion correcta |
| 201 | Recurso creado (incluye cabecera `Location`) |
| 204 | Eliminado, sin cuerpo |
| 400 | JSON mal formado |
| 404 | El recurso o la ruta no existe |
| 405 | Metodo no permitido en esa ruta (incluye cabecera `Allow`) |
| 409 | Conflicto: duplicado, o borrado que destruiria historial |
| 422 | Validacion fallida, o referencia a un id inexistente |
| 500 / 503 | Error interno / base de datos inaccesible |

## Valores permitidos (espejo de los ENUM de PostgreSQL)

| Campo | Valores |
|---|---|
| `integridad`, `disponibilidad`, `confidencialidad` | `Primario`, `Secundario`, o `null` si la norma no marca esa propiedad |
| `cumple`, `documentado`, `repetible`, `evidencia` | `Sí`, `No`, `N/A` |

Son sensibles a mayusculas y llevan tilde: `Sí`, no `Si`.

**`justificacion_no_aplica`** (texto, 10–500 caracteres) acompana a las respuestas:

- Es **obligatorio** cuando `cumple` es `N/A`; sin el, la respuesta se rechaza con 422.
- Se **descarta** (se guarda `null`) cuando `cumple` es `Sí` o `No`, aunque venga en el cuerpo.

La tabla `Respuestas` tiene el mismo CHECK, asi que la regla se cumple aunque se escriba por SQL.

## Paginacion

Los listados aceptan `?limit=` (1–200, por defecto 50) y `?offset=`, y devuelven
`meta.total` con el total sin paginar.

---

# Endpoints

## Salud

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/` | Datos del API |
| GET | `/salud` | Verifica la conexion a PostgreSQL |

## Organizaciones — HU-001

| Metodo | Ruta | Notas |
|---|---|---|
| GET | `/organizaciones` | `?buscar=` filtra por nombre. Incluye `total_cuestionarios` y `ultimo_cuestionario` |
| GET | `/organizaciones/{id}` | |
| POST | `/organizaciones` | `{ "nombre": "TechCorp S.A." }` |
| PUT | `/organizaciones/{id}` | |
| DELETE | `/organizaciones/{id}` | 409 si ya tiene cuestionarios |
| GET | `/organizaciones/{id}/historial` | Cumplimiento a lo largo del tiempo |

## Evaluadores

| Metodo | Ruta | Notas |
|---|---|---|
| GET | `/evaluadores` | Incluye `cuestionarios_realizados` |
| GET | `/evaluadores/{id}` | |
| POST | `/evaluadores` | `{ "nombre": "Juan Garcia" }` |
| PUT | `/evaluadores/{id}` | |

## Normas — HU-004, HU-009

| Metodo | Ruta | Notas |
|---|---|---|
| GET | `/normas` | Incluye `controles_vinculados` |
| GET | `/normas/{id}` | |
| POST | `/normas` | `{ "nombre": "ISO/IEC 27002" }` — 409 si el nombre ya existe |
| PUT | `/normas/{id}` | Los controles vinculados conservan la relacion |
| DELETE | `/normas/{id}` | 409 si tiene controles vinculados |

## Catalogos

**GET `/catalogos`** — listas fijas de la norma, para poblar los formularios: `normas`,
`dominios_norma`, `tipos`, `conceptos`, `dominios_seguridad` y `capacidades`. Cada elemento
trae `id` y `nombre`; `dominios_norma` incluye ademas `clausula`.

## Controles — HU-005, HU-010, HU-012

**GET `/controles`** — HU-012, filtros combinables:

| Parametro | Ejemplo | Efecto |
|---|---|---|
| `norma_id` | `1` | Solo controles de esa norma |
| `dominio_norma_id` | `4` | Solo controles de ese dominio |
| `tipo` | `Preventivo` | Coincidencia exacta, sin distinguir mayusculas |
| `dimension` | `integridad` | Solo controles que aplican a esa dimension (nivel no nulo) |
| `nivel` | `Primario` | Combinado con `dimension`, exige ese nivel exacto |
| `buscar` | `cifrado` | Busca en codigo, nombre, descripcion y proposito |

```
GET /controles?dimension=confidencialidad&nivel=Primario
```

Cada control devuelve la norma, el dominio, los cuatro atributos N:M y sus preguntas:

```json
{ "id": 4, "codigo": "8.24", "nombre": "Uso de criptografia",
  "norma_id": 1, "norma": "27002",
  "dominio_norma_id": 4, "clausula": 8, "dominio_norma": "Tecnologicos",
  "proposito": "...", "descripcion": "...", "peso": 8,
  "confidencialidad": "Primario", "integridad": "Primario", "disponibilidad": "Secundario",
  "guia": "...", "otra_informacion": "...",
  "tipos": [ { "id": 1, "nombre": "Preventivo" } ],
  "conceptos": [ { "id": 2, "nombre": "Proteger" } ],
  "dominios_seguridad": [ { "id": 2, "nombre": "Proteccion" } ],
  "capacidades": [ { "id": 8, "nombre": "Configuracion segura" } ],
  "preguntas": [ { "id": 14, "orden": 1, "texto": "..." } ] }
```

**GET `/controles/{id}`** agrega ademas `niveles_madurez`, los cinco descriptores de madurez de ese
control. No viene en el listado, donde solo engordaria la respuesta:

```json
{ "niveles_madurez": [ { "nivel": 1, "nombre": "Inicial / Ad Hoc", "descripcion": "..." } ] }
```

**POST `/controles`** — HU-005, crea el control, sus atributos y sus preguntas en una
transaccion:

```json
{
  "norma_id": 1,
  "dominio_norma_id": 4,
  "codigo": "8.25",
  "nombre": "Ciclo de vida de desarrollo seguro",
  "proposito": "Garantizar que la seguridad se disena e implementa en el ciclo de vida.",
  "descripcion": "Deben establecerse y aplicarse reglas para el desarrollo seguro.",
  "peso": 7,
  "confidencialidad": "Primario",
  "integridad": "Primario",
  "disponibilidad": null,
  "guia": "...",
  "otra_informacion": null,
  "tipos": [1],
  "conceptos": [2],
  "dominios_seguridad": [2],
  "capacidades": [7],
  "preguntas": ["¿Existen reglas escritas de desarrollo seguro?"]
}
```

`tipos` es obligatorio y debe traer al menos un id. Si algun id no existe, se revierte todo
y responde 422. `preguntas` es un arreglo de textos: el orden del arreglo es el orden de las
preguntas.

**PUT `/controles/{id}`** — HU-010, parcial: solo se modifican los campos enviados. Cada
arreglo de atributos que se envie reemplaza el conjunto completo (`[]` lo vacia). `preguntas`
sincroniza por posicion: actualiza las existentes, agrega las nuevas y elimina las sobrantes;
si una pregunta sobrante ya tiene respuestas, responde 409 y no borra nada.

**DELETE `/controles/{id}`** — 409 si alguna de sus preguntas ya tiene respuestas, o si el control
tiene niveles de madurez declarados en algun cuestionario.

## Cuestionarios — HU-006, HU-016, HU-017

**GET `/cuestionarios`** — HU-016. Filtros: `organizacion_id`, `evaluador_id`, `desde`,
`hasta` (fechas `YYYY-MM-DD`).

**POST `/cuestionarios`** — HU-006:

```json
{ "organizacion_id": 1, "evaluador_id": 2, "fecha": "2026-07-29" }
```

`fecha` es opcional (por defecto hoy) y no admite fechas futuras. `evaluador_id` viaja en el
cuerpo porque el login es implementacion futura.

**GET `/cuestionarios/{id}`** — HU-017, detalle completo con el arreglo `respuestas`, cada una
con la pregunta, su control y los cuatro campos de la respuesta.

Todo cuestionario incluye `respuestas_registradas`, `preguntas_en_catalogo` y `avance`
(0–1). No hay campo `estado`: ver `docs/Gaps.md`.

**DELETE `/cuestionarios/{id}`** — borra el cuestionario y sus respuestas en una transaccion.

## Respuestas — HU-013, HU-014

Se responde **por pregunta**, no por control: un control con cinco preguntas genera cinco
respuestas.

**PUT `/cuestionarios/{id}/respuestas/{preguntaId}`** — una sola ruta cubre crear y editar
(idempotente): 201 la primera vez, 200 en adelante.

```json
{ "cumple": "Sí", "documentado": "Sí", "repetible": "No", "evidencia": "Sí" }
```

Cuando `cumple` no es `Sí`, los otros tres se envian como `N/A`: el formulario solo los
pregunta cuando la respuesta es afirmativa.

**POST `/cuestionarios/{id}/respuestas`** — guarda el cuestionario completo en una
transaccion. Si una fila falla, no se guarda ninguna:

```json
{ "respuestas": [
    { "pregunta_id": 1, "cumple": "Sí",  "documentado": "Sí", "repetible": "Sí",  "evidencia": "Sí" },
    { "pregunta_id": 2, "cumple": "No",  "documentado": "N/A", "repetible": "N/A", "evidencia": "N/A" },
    { "pregunta_id": 3, "cumple": "N/A", "documentado": "N/A", "repetible": "N/A", "evidencia": "N/A" }
] }
```

Responde `{ "guardadas": 3, "creadas": 3, "actualizadas": 0 }`.

**GET `/cuestionarios/{id}/respuestas/pendientes`** — preguntas del catalogo que aun no tienen
respuesta en ese cuestionario, con el codigo y el nombre de su control.

**GET / DELETE `/cuestionarios/{id}/respuestas/{preguntaId}`** — consulta o borra una respuesta.

## Nivel de madurez declarado

El evaluador declara el nivel 1-5 de cada control antes de responder sus preguntas, escogiendo entre
los cinco descriptores del control (`docs/Metodologia_Madurez.md`). Los descriptores viajan en el
detalle del control: `GET /controles/{id}` trae `niveles_madurez` con `nivel`, `nombre` y
`descripcion`.

**PUT `/cuestionarios/{id}/niveles-madurez/{controlId}`** — upsert idempotente: 201 la primera vez,
200 en adelante.

```json
{ "nivel": 3 }
```

```json
{ "data": { "control_id": 1, "codigo": "8.2", "control": "Derechos de acceso privilegiado",
            "nivel": 3, "nivel_nombre": "Definido", "nivel_descripcion": "Existe un procedimiento…" } }
```

Un `nivel` fuera de 1-5 responde 422. Borrar el cuestionario borra sus niveles declarados; un
control con niveles declarados no se puede eliminar (409 con el conteo).

**GET `/cuestionarios/{id}/niveles-madurez`** — niveles declarados en el cuestionario. Los controles
que aun no tienen nivel simplemente no aparecen. `meta.escala` trae los cinco niveles del catalogo.

```json
{ "data": [ { "control_id": 1, "codigo": "8.2", "control": "...", "nivel": 3,
              "nivel_nombre": "Definido", "nivel_descripcion": "…" } ],
  "meta": { "escala": [ { "nivel": 1, "nombre": "Inicial / Ad Hoc" } ] } }
```

El detalle del cuestionario (`GET /cuestionarios/{id}`) incluye el mismo arreglo en
`niveles_madurez`, para que el frontend cargue la pantalla con una sola peticion.

## Reportes — HU-018

**GET `/cuestionarios/{id}/resumen`**

```json
{ "data": {
    "cuestionario_id": 1, "total_respondidos": 5,
    "cumplidos": 3, "no_cumplidos": 1, "no_aplica": 1,
    "aplicables": 4, "cumplimiento": 0.75,
    "atributos": { "tasa_documentado": 0.6, "tasa_repetible": 0.8, "tasa_evidencia": 0.6 } } }
```

**GET `/cuestionarios/{id}/mapa-calor`** — HU-018:

```json
{ "data": {
    "cuestionario_id": 1,
    "escala": [ { "color": "rojo", "desde": 0, "hasta": 0.6 },
                { "color": "amarillo", "desde": 0.6, "hasta": 0.85 },
                { "color": "verde", "desde": 0.85, "hasta": 1 } ],
    "dimensiones": [
      { "dimension": "integridad", "aplicables": 4, "cumplidos": 3, "cumplimiento": 0.75,
        "color": "amarillo",
        "por_nivel": { "primario":   { "aplicables": 2, "cumplidos": 2, "cumplimiento": 1 },
                       "secundario": { "aplicables": 2, "cumplidos": 1, "cumplimiento": 0.5 } } }
    ] } }
```

Criterio de calculo: un control cuenta para una dimension solo si su nivel ahi es `P` o `S`;
las respuestas `N-A` se excluyen del denominador; `cumplimiento = 'Si' / aplicables`. Cuando
no hay controles aplicables, `cumplimiento` es `null` y el color es `sin_datos` — el frontend
debe mostrar "sin evaluar", no 0%.

**GET `/cuestionarios/{id}/hallazgos`** — controles con respuesta `No`, con sus normas. Es la
entrada para las recomendaciones automaticas de Persona 4.

**GET `/cuestionarios/{id}/no-aplicables`** — preguntas respondidas `N/A` con su
`justificacion_no_aplica`, para dejar trazabilidad de lo que quedo fuera del calculo.

**GET `/cuestionarios/{id}/madurez`** — nivel de madurez 1-5 por control, por dominio y global,
segun `docs/Metodologia_Madurez.md` (nivel declarado por el evaluador → promedio ponderado por peso).

```json
{ "data": {
    "cuestionario_id": 1,
    "escala": [ { "nivel": 1, "nombre": "Inicial / Ad Hoc" } ],
    "controles": [
      { "control_id": 1, "codigo": "8.2", "nombre": "...", "dominio_norma": "Tecnologicos",
        "peso": 9, "preguntas": 4, "respondidas": 3, "aplicables": 2,
        "tasas": { "cumple": 0.5, "documentado": 0.5, "repetible": 0, "evidencia": 0 },
        "indice_madurez": 4, "nivel_madurez": 4, "nivel_nombre": "Administrado y Medible" } ],
    "dominios": [ { "dominio_norma": "Tecnologicos", "clausula": 8,
                    "controles_evaluados": 3, "indice_madurez": 3.67 } ],
    "global": { "controles_evaluados": 3, "indice_madurez": 3.67 } } }
```

Un control sin nivel declarado trae `indice_madurez`, `nivel_madurez` y `nivel_nombre` en `null`
y queda fuera de dominios y del global; `indice_madurez` por control es el nivel declarado (los
agregados si son fraccionarios porque ponderan por `peso`). `tasas` es informativo —las tasas de
`Si` de los cuatro atributos sobre las preguntas aplicables— y viene en `null` cuando el control
no tiene preguntas aplicables; ya no interviene en el calculo de la madurez.

**GET `/cuestionarios/{id}/riesgo`** — exposicion al riesgo C/I/D e indice general, segun
`docs/Metodologia_Riesgo.md` (`E = Σ peso·r·(1−nivel/5) / Σ peso·r`; `r`: Primario 1.0,
Secundario 0.5, sin relacion 0).

```json
{ "data": {
    "cuestionario_id": 1,
    "escala": [ { "nivel": "bajo", "color": "verde", "desde": 0, "hasta": 0.15 },
                { "nivel": "medio", "color": "amarillo", "desde": 0.15, "hasta": 0.4 },
                { "nivel": "alto", "color": "rojo", "desde": 0.4, "hasta": 1 } ],
    "dimensiones": [ { "dimension": "confidencialidad", "controles_considerados": 2,
                       "exposicion": 0.375, "nivel_riesgo": "medio", "color": "amarillo" } ],
    "indice_general": { "exposicion": 0.3393, "nivel_riesgo": "medio", "color": "amarillo" },
    "controles": [
      { "control_id": 1, "codigo": "8.2", "peso": 9, "indice_madurez": 1, "nivel_madurez": 1,
        "deficiencia": 0.8, "exposicion": 0.72 } ] } }
```

`controles` viene ordenado por `exposicion` descendente (ranking de remediacion). Una
dimension sin controles considerados trae `exposicion` en `null` y nivel `sin_datos`.
## Monitor de Salud — Fase 2

Datos en vivo de una instancia Oracle. El backend **no se conecta a Oracle**:
recibe las mediciones que empuja el collector local (ver `collector/README.md`),
calcula los indicadores y sirve el último estado al dashboard.

Índice: `ISBD = (IP + IM + IA) / 3`, en escala 0–100.

Estados: `Verde` (≥ umbral verde), `Rojo` (≤ umbral rojo), `Amarillo` en medio,
`Caida` (sin conexión). Los dos umbrales se configuran por base y por índice en
`Monitor_Umbrales_Indice` (ver `GET/PUT /monitor/umbrales-indice`); sin
configurar valen 75 y 60.

**Media geométrica ponderada:** aplica a IP/IM/IA, no al ISBD. El índice de un
componente es la media geométrica de los puntajes de sus variables, ponderada
por el peso de cada una — no un promedio aritmético. Un puntaje bajo castiga el
índice en proporción a su propio peso, así una crítica no queda tapada por
puntajes buenos en otras variables. Ver
`CalculadoraSalud::indiceComponente`.

Todos los GET aceptan `?baseDatosId=<id>`. Sin ese parámetro usan la primera
base activa.

### `GET /monitor/bases-datos`

Listado para la pantalla selectora. Una base recién registrada, sin snapshots
todavía, devuelve `isbd: null` y `estado: "Sin datos"`.

```json
{ "data": [ {
  "id": 1, "nombre": "Oracle XE Local", "motor": "Oracle",
  "host": "localhost", "puerto": 1521, "servicio": "XEPDB1",
  "isbd": 94.47, "estado": "Verde", "color": "verde",
  "actualizado_en": "2026-08-23 16:12:04"
} ] }
```

### `GET /monitor/indice`

Índice del último snapshot, con el desglose por componente y los umbrales del
semáforo vigentes para esa base.

```json
{ "data": {
  "base_datos": { "id": 1, "nombre": "Oracle XE Local", "motor": "Oracle" },
  "isbd": { "valor": 94.68, "estado": "Verde", "color": "verde",
            "pesos": { "procesos": 0.333, "memoria": 0.333, "archivos": 0.333 },
            "umbrales": { "verde": 75, "rojo": 60 } },
  "componentes": {
    "procesos": { "indicador": "IP", "valor": 98.88, "estado": "Verde", "color": "verde",
                  "umbrales": { "verde": 75, "rojo": 60 } },
    "memoria":  { "indicador": "IM", "valor": 85.2,  "estado": "Verde", "color": "verde",
                  "umbrales": { "verde": 75, "rojo": 60 } },
    "archivos": { "indicador": "IA", "valor": 99.97, "estado": "Verde", "color": "verde",
                  "umbrales": { "verde": 75, "rojo": 60 } }
  },
  "umbrales": {
    "isbd": { "verde": 75, "rojo": 60 }, "ip": { "verde": 75, "rojo": 60 },
    "im":   { "verde": 75, "rojo": 60 }, "ia": { "verde": 75, "rojo": 60 }
  },
  "actualizado_en": "2026-08-23 16:12:04", "simulado": false
} }
```

`pesos` quedó como rastro histórico: el ISBD ya no pondera, es el promedio simple.

**404** si la base existe pero todavía no tiene mediciones.

### `GET /monitor/umbrales-indice`

Umbrales del semáforo de los cuatro índices de una base. Los que no se hayan
personalizado salen con el valor por defecto (verde 75 / rojo 60).

```json
{ "data": {
  "base_datos": { "id": 1, "nombre": "Oracle XE Local" },
  "umbrales": {
    "isbd": { "verde": 80, "rojo": 55 }, "ip": { "verde": 75, "rojo": 60 },
    "im":   { "verde": 75, "rojo": 60 }, "ia": { "verde": 75, "rojo": 60 }
  }
} }
```

### `PUT /monitor/umbrales-indice`

Guarda los cuatro pares. Es lo que persiste el botón "Editar parámetros" del
dashboard. Devuelve el mismo cuerpo que el GET.

```json
{
  "baseDatosId": 1,
  "umbrales": {
    "isbd": { "verde": 80, "rojo": 55 }, "ip": { "verde": 75, "rojo": 60 },
    "im":   { "verde": 75, "rojo": 60 }, "ia": { "verde": 75, "rojo": 60 }
  }
}
```

**422** si falta un índice, si un umbral cae fuera de 0–100 o si el rojo no es
menor que el verde.

### `GET /monitor/alertas`

Alertas del último snapshot, críticas primero. Se sirven aparte del índice a
propósito: una alerta crítica individual no debe quedar oculta detrás de un
promedio alto.

```json
{ "data": [ {
  "id": 42, "componente": "procesos", "variable": "p6", "severidad": "critica",
  "mensaje": "Sesiones bloqueadas: 7 sesiones, por encima del umbral critico (5 sesiones).",
  "generada_en": "2026-08-23 16:12:04"
} ] }
```

### `GET /monitor/historico`

Evolución del ISBD, del snapshot más viejo al más reciente. `limite` acota
cuántos (por defecto 30, máximo 500).

```json
{ "data": [ { "id": 11, "fecha": "2026-08-23 16:12:04", "etiqueta": "16:12:04",
              "isbd": 94.47, "ip": 98.88, "im": 85.2, "ia": 99.97 } ] }
```

### `GET /monitor/variables`

Catálogo de las 25 variables con el valor medido en el último snapshot. Acepta
`?componente=procesos|memoria|archivos`. `valor: null` = el collector todavía no
la reportó. `color: null` = variable de configuración (`sentido: "fijo"`), que
no puntúa ni genera alertas.

```json
{ "data": [ {
  "id": "p6", "codigo": "p6", "componente": "procesos",
  "variable": "Sesiones bloqueadas", "descripcion": "Sesiones que esperan por otra sesión",
  "fuente": "V$SESSION (blocking_session) / V$WAIT_CHAINS", "unidad": "sesiones",
  "sentido": "alto_malo", "limite_advertencia": 2, "limite_critico": 5, "peso": 12.5,
  "valor": 0, "puntaje": 100, "color": "verde", "estado": "Verde",
  "justificacion": "…"
} ] }
```

### `POST /monitor/estado-caida`

La llama el collector cuando no puede leer una instancia. Mismo token que la
ingesta (`X-Collector-Token`). Marca la base como caida; el dashboard la muestra
como "Caida - sin conexion". Una ingesta exitosa posterior limpia el flag.

```json
{ "nombre": "Oracle XE Local", "caida": true, "motivo": "sin conexion" }
```

Respuesta **200**: `{ "data": { "id": 1, "nombre": "...", "caida": true } }`.
`caida:false` restaura la base. **404** si el nombre no existe, **401** sin token.

### `POST /monitor/ingesta`

Lo llama el collector local. **Es el único endpoint del API con credencial
propia**: exige la cabecera `X-Collector-Token` con el secreto compartido
(variable de entorno `MONITOR_COLLECTOR_TOKEN`, mínimo 16 caracteres).

```http
POST /monitor/ingesta
X-Collector-Token: <secreto>
Content-Type: application/json

{
  "base_datos": { "nombre": "Oracle XE Local", "motor": "Oracle",
                  "host": "localhost", "puerto": 1521, "servicio": "XEPDB1" },
  "mediciones": { "p1": 88, "p2": 1760, "m3": 63.95, "a4": 98.88 }
}
```

La base se da de alta o se actualiza por `nombre`. La marca de tiempo del
snapshot es la de llegada al API, no una enviada por el collector, para que el
orden del histórico no dependa del reloj de la máquina local.

No hace falta mandar las 25 variables: los pesos se renormalizan sobre las que
lleguen. La única condición es que **cada componente traiga al menos una
variable con umbrales**.

**201**

```json
{ "data": { "snapshot_id": 11, "base_datos_id": 1, "isbd": 94.47,
            "componentes": { "procesos": 98.88, "memoria": 85.2, "archivos": 99.97 },
            "alertas": 2, "mediciones": 25 } }
```

| Código | Cuándo |
|---|---|
| `401` | token ausente o incorrecto |
| `422` | código de variable desconocido, valor no numérico, o falta un componente |
| `503` | `MONITOR_COLLECTOR_TOKEN` sin configurar en el servidor (falla cerrado) |
