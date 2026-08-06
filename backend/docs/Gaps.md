# Lo que el esquema actual no permite implementar

Estado respecto a `database/Modelo_Relacional.sql`. Lo que aparece aqui **no** se simulo en el
backend, para no devolver datos que la base no puede sostener.

---

## Resuelto por el modelo nuevo  ✅

Estas limitaciones existian contra el esquema viejo (`Script_V2.sql`) y ya no aplican:

- **Preguntas por control.** Existe la tabla `Preguntas` (1:N con `Controles`) y las respuestas
  cuelgan de ella, no del control.
- **Peso o importancia del control.** Columna `peso` con `CHECK (peso BETWEEN 1 AND 10)`.
- **Dominio de la norma y objetivo del control.** `Dominios_Norma` (con su clausula) y la
  columna `proposito`.
- **Codigo del control.** Columna `codigo` con `UNIQUE (norma_id, codigo)`.
- **Autenticacion.** `Evaluadores` y `Organizaciones` tienen `correo` unico y
  `contrasena_hash`; el login vive en `POST /auth/login`.

---

## HU-015 — Finalizar un cuestionario  🔴 bloqueada

`Cuestionarios_Control_Interno` no tiene columna de estado, asi que no hay donde persistir
"en progreso" / "finalizado" ni contra que validar el bloqueo de edicion.

**Mitigacion actual:** cada cuestionario expone `respuestas_registradas`,
`preguntas_en_catalogo` y `avance` (0–1) para que el frontend muestre el progreso. Es
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

No existe columna `activo`. Un borrado fisico si o si rompe el historial: `Respuestas`
referencia `Preguntas`, que referencia `Controles`.

**Mitigacion actual:** `DELETE /normas/{id}` y `DELETE /controles/{id}` solo proceden si el
registro nunca fue usado. Si ya tiene respuestas, se devuelve **409** con el conteo exacto en
el mensaje, en vez de fallar con un error de llave foranea.

**DDL que lo desbloquea:**

```sql
ALTER TABLE Normas    ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE Controles ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;
```

---

## Area evaluada y Administrador de Bases de Datos  🔴 bloqueada

El enunciado los pide como datos minimos de cada auditoria.
`Cuestionarios_Control_Interno` solo guarda `organizacion_id`, `evaluador_id` y `fecha`.

```sql
ALTER TABLE Cuestionarios_Control_Interno
    ADD COLUMN area_evaluada VARCHAR(150),
    ADD COLUMN administrador_bd VARCHAR(150);
```

---

## Observaciones y evidencias en texto  🟡 parcial

`Respuestas` ya guarda `justificacion_no_aplica` (texto obligatorio cuando `cumple = 'N/A'`,
con CHECK en la tabla y validacion en el API). Falta el texto libre para el resto de las
respuestas y los archivos adjuntos que menciona el enunciado.

```sql
ALTER TABLE Respuestas
    ADD COLUMN observaciones TEXT,
    ADD COLUMN detalle_evidencia TEXT;
```

---

## Nivel de madurez y exposicion al riesgo  ✅ resuelto

La madurez se **deriva** de las respuestas (no se registra a mano), asi que no hizo falta DDL.
Metodologias en `docs/Metodologia_Madurez.md` y `docs/Metodologia_Riesgo.md`; implementacion en
`ReporteRepository::madurez()` y `::riesgo()`.

| Endpoint | Aporta |
|---|---|
| `GET /cuestionarios/{id}/madurez` | IM continuo y nivel 0-5 por control, por dominio y global |
| `GET /cuestionarios/{id}/riesgo` | exposicion C/I/D, indice general y ranking por control |
| `GET /cuestionarios/{id}/resumen` | cumplimiento global y tasas de documentado / repetible / evidencia |
| `GET /cuestionarios/{id}/mapa-calor` | cumplimiento por dimension con desglose Primario / Secundario |
| `GET /cuestionarios/{id}/hallazgos` | preguntas respondidas 'No', ordenadas por peso del control |

---

## Autorizacion por datos en el API  🟡 pendiente

El login funciona, pero el API no exige token ni sesion: cualquier cliente puede llamar
cualquier endpoint. El control de acceso por rol vive solo en el frontend
(`ProtectedRoute`), que es una barrera de UX, no de seguridad. Para la parte 2 conviene un
token (p. ej. firmado con HMAC) validado en `Bootstrap`/middleware, y filtrar por
`organizacion_id`/`evaluador_id` de la sesion en los endpoints de lectura.

---

## HU-001 — Datos de contacto de la organizacion  🟡 parcial

La historia pide "nombre de la organizacion, datos de contacto". La tabla tiene `nombre` y
`correo`. El CRUD funciona; el resto del contacto no se guarda en ningun lado.

```sql
ALTER TABLE Organizaciones
    ADD COLUMN contacto_nombre VARCHAR(150),
    ADD COLUMN contacto_telefono VARCHAR(30);
```
