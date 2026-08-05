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

**DELETE `/controles/{id}`** — 409 si alguna de sus preguntas ya tiene respuestas.

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

## Reportes — HU-018

**GET `/cuestionarios/{id}/resumen`**

```json
{ "data": {
    "cuestionario_id": 1, "total_respondidos": 5,
    "cumplidos": 3, "no_cumplidos": 1, "no_aplica": 1,
    "aplicables": 4, "cumplimiento": 0.75,
    "madurez_insumos": { "tasa_documentado": 0.6, "tasa_repetible": 0.8, "tasa_evidencia": 0.6 } } }
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