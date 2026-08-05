#!/usr/bin/env bash
# Prueba de humo del API. Requiere el servidor levantado y la base creada con
# database/Modelo_Relacional.sql y database/Datos_Iniciales.sql.
#   php -S localhost:8000 -t backend/public
#   bash backend/scripts/Pruebas.sh
set -u
BASE="${1:-http://localhost:8000}"
J="Content-Type: application/json"

paso() { printf '\n=== %s\n' "$1"; }
llamar() { curl -s -o /tmp/cr_body -w '%{http_code}' "$@"; echo " <- esperado junto al cuerpo:"; cat /tmp/cr_body; echo; }

paso "Salud"
llamar "$BASE/salud"

paso "Catalogos fijos de la norma (200)"
llamar "$BASE/catalogos"

paso "Crear organizacion (201)"
llamar -X POST "$BASE/organizaciones" -H "$J" \
  -d '{"nombre":"Prueba Humo S.A.","correo":"humo@prueba.test","contrasena":"claveSegura1"}'

paso "Correo duplicado (409)"
llamar -X POST "$BASE/organizaciones" -H "$J" \
  -d '{"nombre":"Otra S.A.","correo":"humo@prueba.test","contrasena":"claveSegura1"}'

paso "Nombre vacio (422)"
llamar -X POST "$BASE/organizaciones" -H "$J" -d '{"nombre":""}'

paso "Crear evaluador (201)"
llamar -X POST "$BASE/evaluadores" -H "$J" \
  -d '{"nombre":"Evaluador Humo","correo":"evaluador@prueba.test","contrasena":"claveSegura1"}'

paso "Crear control con nivel invalido (422)"
llamar -X POST "$BASE/controles" -H "$J" \
  -d '{"norma_id":1,"dominio_norma_id":4,"codigo":"9.1","nombre":"Control humo","proposito":"Probar","descripcion":"Probar","peso":5,"integridad":"Z","tipos":[1]}'

paso "Crear control con peso fuera de rango (422)"
llamar -X POST "$BASE/controles" -H "$J" \
  -d '{"norma_id":1,"dominio_norma_id":4,"codigo":"9.2","nombre":"Control humo","proposito":"Probar","descripcion":"Probar","peso":99,"tipos":[1]}'

paso "Crear control con codigo repetido (409)"
llamar -X POST "$BASE/controles" -H "$J" \
  -d '{"norma_id":1,"dominio_norma_id":4,"codigo":"8.2","nombre":"Control humo","proposito":"Probar","descripcion":"Probar","peso":5,"tipos":[1]}'

paso "Catalogo filtrado (200)"
llamar "$BASE/controles?dimension=confidencialidad&nivel=Primario"

paso "Dimension invalida (422)"
llamar "$BASE/controles?dimension=inventada"

paso "Detalle de un control con sus preguntas (200)"
llamar "$BASE/controles/1"

paso "Cuestionario con fecha futura (422)"
llamar -X POST "$BASE/cuestionarios" -H "$J" -d '{"organizacion_id":1,"evaluador_id":1,"fecha":"2099-01-01"}'

paso "Crear cuestionario (201)"
llamar -X POST "$BASE/cuestionarios" -H "$J" -d '{"organizacion_id":1,"evaluador_id":1}'

paso "Guardar respuesta por pregunta: primera vez 201, repetida 200 (HU-013 / HU-014)"
llamar -X PUT "$BASE/cuestionarios/1/respuestas/1" -H "$J" \
  -d '{"cumple":"Sí","documentado":"Sí","repetible":"Sí","evidencia":"Sí"}'
llamar -X PUT "$BASE/cuestionarios/1/respuestas/1" -H "$J" \
  -d '{"cumple":"No","documentado":"N/A","repetible":"N/A","evidencia":"N/A"}'

paso "Respuesta con valor sin tilde (422)"
llamar -X PUT "$BASE/cuestionarios/1/respuestas/2" -H "$J" \
  -d '{"cumple":"Si","documentado":"N/A","repetible":"N/A","evidencia":"N/A"}'

paso "Preguntas pendientes del cuestionario 1"
llamar "$BASE/cuestionarios/1/respuestas/pendientes"

paso "Resumen, mapa de calor y hallazgos (HU-018)"
llamar "$BASE/cuestionarios/1/resumen"
llamar "$BASE/cuestionarios/1/mapa-calor"
llamar "$BASE/cuestionarios/1/hallazgos"

paso "Ruta inexistente (404) y metodo no permitido (405)"
llamar "$BASE/no-existe"
llamar -X DELETE "$BASE/evaluadores/1"

paso "Id no numerico (404, no 500)"
llamar "$BASE/cuestionarios/abc"
