# Justificación de la Metodología de Nivel de Madurez

**Proyecto:** Evaluación del Riesgo en la Administración de Bases de Datos basada en ISO/IEC 27002
**Curso:** EIF402 — Administración de Bases de Datos, Universidad Nacional

---

## 1. Escala de madurez

Se adopta la escala de los **modelos de madurez de COBIT 4.1** (IT Governance Institute, 2007), con
su nomenclatura oficial:

| Nivel | Nombre | Lectura general |
|---|---|---|
| 1 | Inicial / Ad Hoc | La práctica existe, pero es reactiva y depende del criterio de cada persona |
| 2 | Repetible pero Intuitivo | Se repite con cierta consistencia, sin documentación ni análisis |
| 3 | Definido | Documentado, formalizado y alineado con la política, pero no continuo |
| 4 | Administrado y Medible | Estandarizado, obligatorio y con indicadores definidos |
| 5 | Optimizado | Automatizado, monitoreado y en mejora continua |

La escala **no incluye un nivel 0**: el instrumento pregunta por el nivel al abrir cada control y las
cinco opciones cubren el espectro desde "existe pero es improvisado" hasta "optimizado". La ausencia
total de un control se representa dejando el control **sin declarar**, que es distinto de asignarle un
cero (ver sección 5).

## 2. Principio de diseño: madurez declarada contra descriptores específicos del control

El nivel de madurez **lo declara el evaluador**, no lo deriva el sistema de las respuestas del
cuestionario. Es la primera decisión que se toma al abrir un control, antes de responder sus
preguntas.

La objeción clásica a la asignación directa es la subjetividad: dos evaluadores califican distinto el
mismo hallazgo porque "nivel 3" significa cosas distintas para cada uno. Esta metodología neutraliza
esa objeción **sin renunciar al juicio experto**: el evaluador no escoge un número en abstracto, sino
que escoge **cuál de cinco descripciones concretas corresponde a la organización**, y esas
descripciones están escritas para ese control en particular.

Por ejemplo, el nivel 2 del control 8.2 (derechos de acceso privilegiado) no dice "parcialmente
implementado", dice:

> La responsabilidad recae en un coordinador de seguridad con autoridad gerencial limitada. Los
> privilegios se otorgan siguiendo prácticas repetidas pero no documentadas y persisten cuentas
> genéricas compartidas (root, sa, sys); los sistemas registran el uso privilegiado, pero esa
> información no se analiza.

Escoger entre enunciados de ese grado de especificidad es una tarea de reconocimiento, no de
estimación: el evaluador contrasta lo que observó en la organización con cinco situaciones
descritas y marca la que coincide.

**Por qué se abandonó la madurez calculada.** La versión anterior derivaba el nivel de las tasas de
`cumple`, `documentado`, `repetible` y `evidencia` de las preguntas del control. Esa fórmula era
reproducible, pero medía una cosa distinta de la que nombra la escala: promediaba el **grado de
cobertura de unas prácticas puntuales** y lo presentaba como **madurez del proceso**. Un control
podía salir "nivel 4 — administrado y medible" sin que existiera un solo indicador definido, porque
ningún atributo del instrumento pregunta por indicadores, por automatización ni por mejora continua,
que es exactamente lo que separa los niveles 4 y 5 en COBIT. Los descriptores por control cierran esa
brecha: cada nivel se declara contra el texto que lo define.

## 3. Origen de los descriptores

Cada uno de los diez controles seleccionados se mapeó al objetivo de control de COBIT 4.1 que cubre
la misma práctica, y sus cinco descriptores se derivaron del modelo de madurez del proceso
correspondiente:

| Control ISO 27002:2022 | Objetivo de control COBIT 4.1 | Modelo de madurez de origen |
|---|---|---|
| 8.2 Derechos de acceso privilegiado | DS5.4 Administración de Cuentas del Usuario | DS5 Garantizar la Seguridad de los Sistemas |
| 8.5 Autenticación segura | DS5.3 Administración de Identidad | DS5 Garantizar la Seguridad de los Sistemas |
| 8.7 Protección contra malware | DS5.9 Prevención, Detección y Corrección de Software Malicioso | DS5 Garantizar la Seguridad de los Sistemas |
| 8.12 Prevención de fuga de datos | DS11.6 Requerimientos de Seguridad para la Administración de Datos | DS11 Administración de Datos |
| 8.13 Copia de seguridad de la información | DS11.5 Respaldo y Restauración | DS11 Administración de Datos |
| 8.15 Registro | DS5.5 Pruebas, Vigilancia y Monitoreo de la Seguridad | DS5 Garantizar la Seguridad de los Sistemas |
| 8.20 Seguridad de redes | DS5.10 Seguridad de la Red | DS5 Garantizar la Seguridad de los Sistemas |
| 8.24 Uso de criptografía | DS5.8 Administración de Llaves Criptográficas | DS5 Garantizar la Seguridad de los Sistemas |
| 8.31 Separación de entornos | AI7.4 Ambiente de Prueba | AI7 Instalar y Acreditar Soluciones y Cambios |
| 8.32 Gestión de cambios | AI6 Administrar Cambios | AI6 Administrar Cambios |

El texto completo de los cincuenta descriptores (10 controles × 5 niveles) vive en la base de datos,
en la tabla `Niveles_Madurez_Control`, y se carga con `database/Datos_Iniciales.sql`. Al ser datos y
no código, el catálogo se puede extender a controles nuevos sin tocar la aplicación.

## 4. Captura en el instrumento

1. El evaluador abre un control del cuestionario.
2. Lo primero que ve es el selector de nivel de madurez con las cinco opciones. Al pasar el mouse
   sobre una opción —o al seleccionarla— se despliega la descripción completa de ese nivel **para ese
   control**, de modo que la decisión se toma leyendo el texto, no adivinando el número.
3. Declarado el nivel, responde las preguntas del control, que siguen capturando `cumple`,
   `documentado`, `repetible` y `evidencia` por pregunta.

Ambas cosas se guardan juntas con «Guardar avance». El nivel queda en
`Madurez_Controles (cuestionario_id, control_id, nivel)`: un nivel por control y por cuestionario,
modificable mientras la evaluación siga abierta.

**Qué aporta cada insumo:**

| Insumo | Qué mide | Para qué se usa |
|---|---|---|
| Nivel de madurez declarado | Grado de institucionalización del proceso de control | Madurez por control, por dominio y global; deficiencia del modelo de riesgo |
| Respuestas por pregunta | Cumplimiento verificable de prácticas concretas | Porcentaje de cumplimiento, mapa de calor C/I/D y hallazgos |

Los dos son complementarios y se sostienen mutuamente: el cumplimiento **evidencia** el nivel
declarado, y una divergencia grande entre ambos (por ejemplo, nivel 5 con 40 % de cumplimiento) es
en sí misma un hallazgo de la revisión, visible en el reporte porque los dos indicadores se publican
lado a lado.

## 5. Agregaciones

Sea `n(c) ∈ [1, 5]` el nivel declarado del control `c` y `peso(c) ∈ [1, 10]` su peso en el catálogo:

```
                    Σc  peso(c) × n(c)
Madurez(conjunto) = ───────────────────          ∈ [1, 5]
                       Σc  peso(c)
```

- **Madurez por dominio de la norma:** promedio ponderado sobre los controles del dominio.
- **Madurez global del cuestionario:** promedio ponderado sobre todos los controles con nivel
  declarado.

Se pondera por `peso` para que los controles más críticos en la administración de bases de datos
influyan más en el diagnóstico global, en coherencia con el modelo de riesgo.

**Controles sin nivel declarado:** quedan **fuera de la evaluación** —sin nivel, fuera del promedio
del dominio, fuera del global y fuera del cálculo de riesgo— y se listan explícitamente como "sin
nivel declarado" en el reporte. No se les asigna 0: un control que todavía no se evaluó no es un
control ausente, y contarlo como cero inflaría artificialmente la exposición al riesgo.

## 6. Ejemplo numérico

Cuestionario con cuatro controles declarados:

| Control | peso | Nivel declarado |
|---|---|---|
| 8.2 Accesos privilegiados | 9 | 4 |
| 8.5 Autenticación segura | 9 | 2 |
| 8.13 Copia de seguridad | 9 | 5 |
| 8.24 Criptografía | 8 | 2 |

```
Madurez global = (9×4 + 9×2 + 9×5 + 8×2) / (9 + 9 + 9 + 8)
               = (36 + 18 + 45 + 16) / 35
               = 115 / 35
               = 3.29
```

Los seis controles restantes no tienen nivel declarado y no participan; el reporte muestra
"4 / 10 controles evaluados" para que la cifra se lea con esa advertencia a la vista.

## 7. Propiedades de la metodología

- **Trazabilidad:** todo nivel remite a un texto concreto que el evaluador leyó y aceptó como
  descripción de la organización; el descriptor queda guardado y se muestra en el reporte junto al
  nivel.
- **Fidelidad a la escala:** un control es "nivel 4" porque cumple la descripción del nivel 4 de ese
  control, no porque un promedio cayó en ese intervalo.
- **Consistencia entre evaluadores:** la variabilidad se reduce por la especificidad de los
  descriptores, que son idénticos para todos los evaluadores y todas las organizaciones.
- **Independencia del avance:** la madurez se puede declarar aunque el cuestionario esté a medio
  responder, y el reporte indica siempre cuántos controles tienen nivel declarado.
- **Extensibilidad:** agregar un control al catálogo solo exige cargar sus cinco descriptores.

**Limitaciones asumidas:**

- El nivel es un juicio experto: dos evaluadores pueden diferir aunque lean el mismo texto. La
  mitigación es la especificidad de los descriptores y la publicación conjunta del cumplimiento
  verificable, que permite auditar el juicio.
- Los descriptores están escritos para los diez controles seleccionados; extender el instrumento a
  otros controles de ISO/IEC 27002 exige derivar sus descriptores del modelo COBIT correspondiente.
