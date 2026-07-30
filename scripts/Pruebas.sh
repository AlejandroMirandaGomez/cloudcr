#!/usr/bin/env bash
# Prueba de humo del API. Requiere el servidor levantado y la base con Script_V2.sql.
#   php -S localhost:8000 -t public
#   bash docs/pruebas.sh
set -u
BASE="${1:-http://localhost:8000}"
J="Content-Type: application/json"

paso() { printf '\n=== %s\n' "$1"; }
llamar() { curl -s -o /tmp/cr_body -w '%{http_code}' "$@"; echo " <- esperado junto al cuerpo:"; cat /tmp/cr_body; echo; }

paso "Salud"
llamar "$BASE/salud"

paso "Crear organizacion (201)"
llamar -X POST "$BASE/organizaciones" -H "$J" -d '{"nombre":"Prueba Humo S.A."}'

paso "Nombre duplicado (409)"
llamar -X POST "$BASE/organizaciones" -H "$J" -d '{"nombre":"Prueba Humo S.A."}'

paso "Nombre vacio (422)"
llamar -X POST "$BASE/organizaciones" -H "$J" -d '{"nombre":""}'

paso "Crear norma (201)"
llamar -X POST "$BASE/normas" -H "$J" -d '{"nombre":"ISO/IEC 27002 (humo)"}'

paso "Crear control con nivel invalido (422)"
llamar -X POST "$BASE/controles" -H "$J" \
  -d '{"tipo_control":"Preventivo","nombre_control":"X","integridad":"Z","disponibilidad":"P","confidencialidad":"P","normas":[1]}'

paso "Crear control con norma inexistente (422, sin dejar basura)"
llamar -X POST "$BASE/controles" -H "$J" \
  -d '{"tipo_control":"Preventivo","nombre_control":"Control humo","integridad":"P","disponibilidad":"S","confidencialidad":"P","normas":[999999]}'

paso "Catalogo filtrado (200)"
llamar "$BASE/controles?dimension=confidencialidad&nivel=P"

paso "Dimension invalida (422)"
llamar "$BASE/controles?dimension=inventada"

paso "Cuestionario con fecha futura (422)"
llamar -X POST "$BASE/cuestionarios" -H "$J" -d '{"organizacion_id":1,"evaluador_id":1,"fecha":"2099-01-01"}'

paso "Crear cuestionario (201)"
llamar -X POST "$BASE/cuestionarios" -H "$J" -d '{"organizacion_id":1,"evaluador_id":1}'

paso "Guardar respuesta: primera vez 201, repetida 200 (HU-013 / HU-014)"
llamar -X PUT "$BASE/cuestionarios/1/respuestas/1" -H "$J" \
  -d '{"respuesta":"Si","documentado":"si","repetible":"si","evidencia":"si"}'
llamar -X PUT "$BASE/cuestionarios/1/respuestas/1" -H "$J" \
  -d '{"respuesta":"No","documentado":"no","repetible":"no","evidencia":"no"}'

paso "Pendientes del cuestionario 1"
llamar "$BASE/cuestionarios/1/respuestas/pendientes"

paso "Resumen y mapa de calor (HU-018)"
llamar "$BASE/cuestionarios/1/resumen"
llamar "$BASE/cuestionarios/1/mapa-calor"
llamar "$BASE/cuestionarios/1/hallazgos"

paso "Ruta inexistente (404) y metodo no permitido (405)"
llamar "$BASE/no-existe"
llamar -X DELETE "$BASE/evaluadores/1"

paso "Id no numerico (404, no 500)"
llamar "$BASE/cuestionarios/abc"