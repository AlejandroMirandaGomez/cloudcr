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
| `integridad`, `disponibilidad`, `confidencialidad` | `P`, `S`, `N-A` |
| `respuesta` | `Si`, `No`, `N-A` |
| `documentado`, `repetible`, `evidencia` | `si`, `no` |

Son sensibles a mayusculas: `Si` en la respuesta, `si` en los tres booleanos.

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

## Controles — HU-005, HU-010, HU-012

**GET `/controles`** — HU-012, filtros combinables:

| Parametro | Ejemplo | Efecto |
|---|---|---|
| `norma_id` | `2` | Solo controles vinculados a esa norma |
| `tipo` | `Preventivo` | Coincidencia exacta, sin distinguir mayusculas |
| `dimension` | `integridad` | Solo controles que aplican a esa dimension (nivel distinto de `N-A`) |
| `nivel` | `P` | Combinado con `dimension`, exige ese nivel exacto |
| `buscar` | `cifrado` | Busca en nombre y detalle |

```
GET /controles?norma_id=1&dimension=confidencialidad&nivel=P
```

Cada control devuelve sus normas embebidas:

```json
{ "id": 4, "tipo_control": "Preventivo", "nombre_control": "Encriptacion de Datos",
  "detalle": "Encriptacion en transito y reposo",
  "integridad": "P", "disponibilidad": "N-A", "confidencialidad": "P",
  "normas": [ { "id": 1, "nombre": "ISO/IEC 27001" }, { "id": 3, "nombre": "CIS Controls" } ] }
```

**GET `/controles/tipos`** — lista de `tipo_control` distintos, para poblar el filtro.

**POST `/controles`** — HU-005, crea el control y sus vinculos en una transaccion:

```json
{
  "tipo_control": "Preventivo",
  "nombre_control": "Cifrado de respaldos",
  "detalle": "Respaldos cifrados con AES-256 antes de salir del sitio",
  "integridad": "P",
  "disponibilidad": "S",
  "confidencialidad": "P",
  "normas": [1, 3]
}
```

`normas` es obligatorio y debe traer al menos un id. Si algun id no existe, se revierte todo
y responde 422.

**PUT `/controles/{id}`** — HU-010, parcial: solo se modifican los campos enviados. Si se
incluye `normas`, reemplaza el conjunto completo de vinculos (`[]` los borra todos). Las
respuestas ya registradas en cuestionarios anteriores no se tocan.

**DELETE `/controles/{id}`** — 409 si el control ya tiene respuestas.

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
con los datos del control y los cuatro campos de la respuesta.

Todo cuestionario incluye `respuestas_registradas`, `controles_en_catalogo` y `avance`
(0–1). No hay campo `estado`: ver `docs/GAPS.md`.

**DELETE `/cuestionarios/{id}`** — borra el cuestionario y sus respuestas en una transaccion.

## Respuestas — HU-013, HU-014

**PUT `/cuestionarios/{id}/respuestas/{controlId}`** — una sola ruta cubre crear y editar
(idempotente): 201 la primera vez, 200 en adelante.

```json
{ "respuesta": "Si", "documentado": "si", "repetible": "si", "evidencia": "no" }
```

**POST `/cuestionarios/{id}/respuestas`** — guarda el cuestionario completo en una
transaccion. Si una fila falla, no se guarda ninguna:

```json
{ "respuestas": [
    { "control_id": 1, "respuesta": "Si",  "documentado": "si", "repetible": "si", "evidencia": "si" },
    { "control_id": 2, "respuesta": "No",  "documentado": "no", "repetible": "si", "evidencia": "no" },
    { "control_id": 3, "respuesta": "N-A", "documentado": "no", "repetible": "no", "evidencia": "no" }
] }
```

Responde `{ "guardadas": 3, "creadas": 3, "actualizadas": 0 }`.

**GET `/cuestionarios/{id}/respuestas/pendientes`** — controles del catalogo que aun no tienen
respuesta en ese cuestionario. Le sirve al frontend para armar la pantalla del cuestionario.

**GET / DELETE `/cuestionarios/{id}/respuestas/{controlId}`** — consulta o borra una respuesta.

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