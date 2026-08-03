# Historias no implementables con el esquema actual

Se acordo programar unicamente contra el esquema entregado por Persona 1, sin modificarlo.
Estas historias quedan bloqueadas y **no** se simularon en el backend, para no devolver datos
que la base no puede sostener.

---

## HU-015 — Finalizar un cuestionario  🔴 bloqueada

`Cuestionarios_Control_Interno` no tiene columna de estado, asi que no hay donde persistir
"en progreso" / "finalizado" ni contra que validar el bloqueo de edicion.

**Mitigacion actual:** cada cuestionario expone `respuestas_registradas`,
`controles_en_catalogo` y `avance` (0–1) para que el frontend muestre el progreso. Es
informativo: no bloquea nada.

**DDL que lo desbloquea:**

```sql
CREATE TYPE estado_cuestionario AS ENUM ('en_progreso', 'finalizado');

ALTER TABLE Cuestionarios_Control_Interno
    ADD COLUMN estado estado_cuestionario NOT NULL DEFAULT 'en_progreso';
```

Con esa columna: `POST /cuestionarios/{id}/finalizar`, y `guardar()` rechaza con 409 cuando
el cuestionario ya esta finalizado.

---

## HU-011 — Desactivar una norma o un control  🔴 bloqueada

No existe columna `activo`. Un borrado fisico si o si rompe el historial: `Respuestas_Controles`
y `Controles_Normas` referencian esos ids con llave foranea.

**Mitigacion actual:** `DELETE /normas/{id}` y `DELETE /controles/{id}` solo proceden si el
registro nunca fue usado. Si ya tiene respuestas o vinculos, se devuelve **409** con el conteo
exacto en el mensaje, en vez de fallar con un error de llave foranea.

**DDL que lo desbloquea:**

```sql
ALTER TABLE Normas    ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE Controles ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;
```

Con eso, el catalogo filtra `WHERE activo` al armar un cuestionario nuevo y los cuestionarios
viejos siguen mostrando todo.

---

## HU-001 — Datos de contacto de la organizacion  🟡 parcial

La historia pide "nombre de la organizacion, datos de contacto". La tabla solo tiene `nombre`.
El CRUD funciona; el contacto no se guarda en ningun lado.

```sql
ALTER TABLE Organizaciones
    ADD COLUMN contacto_nombre VARCHAR(150),
    ADD COLUMN contacto_correo VARCHAR(150),
    ADD COLUMN contacto_telefono VARCHAR(30);
```

---

## HU-002, HU-003, HU-007, HU-008 — Autenticacion  ⚪ fuera de alcance

El backlog ya las marca como IMPLEMENTACION FUTURA. `Evaluadores` solo tiene `id` y `nombre`:
no hay correo, contrasena, rol ni estado de aprobacion. Mientras no exista sesion, el
`evaluador_id` de HU-006 viaja en el cuerpo del `POST /cuestionarios` en lugar de deducirse
de la sesion activa. Es el unico punto del API que habra que cambiar cuando exista login.

---

## Riesgos, evidencias y madurez  ⚪ fuera del esquema

El enunciado de Persona 4 pide `Riesgos`, `Evidencias`, impacto × probabilidad y nivel de
madurez. En el esquema actual:

- No hay tabla `Riesgos` ni `Evidencias`.
- `evidencia` es un `si_no`, no un archivo adjunto ni una referencia.
- No hay columnas de impacto ni probabilidad, asi que **el valor del riesgo no se puede
  calcular en la base de datos**.

Lo que el backend si entrega, como insumo para las reglas de Persona 4:

| Endpoint | Aporta |
|---|---|
| `GET /cuestionarios/{id}/resumen` | cumplimiento global y tasas de documentado / repetible / evidencia |
| `GET /cuestionarios/{id}/mapa-calor` | cumplimiento por dimension con desglose P / S (HU-018) |
| `GET /cuestionarios/{id}/hallazgos` | controles con respuesta 'No', con sus normas asociadas |

Si Persona 4 necesita persistir impacto y probabilidad, hace falta al menos:

```sql
ALTER TABLE Controles
    ADD COLUMN impacto SMALLINT CHECK (impacto BETWEEN 1 AND 5),
    ADD COLUMN probabilidad SMALLINT CHECK (probabilidad BETWEEN 1 AND 5);
```

---

## Observacion sobre el catalogo

`Querys_Script_V2.sql` siembra ISO/IEC 27001, NIST CSF, CIS Controls y SOC 2, pero el backlog
(HU-004) y el enunciado de Persona 4 hablan de **ISO 27002**, COBIT 2019 y SEVRI. Conviene
alinearlo con Persona 4 antes de la entrega: es dato semilla, no afecta el codigo.