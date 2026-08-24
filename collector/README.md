# Collector local — Monitor de Salud (Fase 2)

Este directorio y `agente_local/` son las dos piezas que corren **en la máquina
donde vive la base Oracle**. No se deployan.

## Por qué existe el collector

El monitor de CloudCR (frontend en Vercel, backend PHP en Render) es público,
pero la base Oracle de prueba corre en `localhost`. Render no puede alcanzar tu
`localhost`, así que la conexión va al revés: el collector corre en tu máquina,
lee Oracle y **empuja** las métricas al monitor.

```
[Agente local]  --HTTP-->  [Collector]  --oracledb thin-->  [Oracle XE local]
  (registro)                   |
  (stress)  --------------->   | push cada N segundos (HTTPS + X-Collector-Token)
       |                       v
       |            [Backend CloudCR en Render] --> [PostgreSQL] --> [Dashboard]
       |
       +--> ejecuta el stress directo contra Oracle (usuario aparte)
```

Consecuencia de diseño: **las credenciales de Oracle nunca salen de tu máquina.**
Al monitor solo viajan las mediciones ya tomadas.

## Requisitos

- Python 3.10+
- Oracle XE corriendo, con su **listener arriba** (ver problemas comunes)
- El backend de CloudCR accesible, con `MONITOR_COLLECTOR_TOKEN` configurado

```bash
pip install -r collector/requirements.txt
pip install -r agente_local/requirements.txt
```

## Puesta en marcha

### 1. Usuarios de Oracle

```
sqlplus / as sysdba
SQL> ALTER SESSION SET CONTAINER = XEPDB1;
SQL> @collector/sql/setup_oracle.sql
```

Crea dos usuarios con responsabilidades separadas a propósito:

| Usuario | Privilegios | Lo usa |
|---|---|---|
| `monitor_user` | `CREATE SESSION`, `SELECT_CATALOG_ROLE` | el collector |
| `cloudcr_stress` | `CREATE SESSION`, `CREATE TABLE`, cuota solo en `CLOUDCR_STRESS_TS` | el agente local, solo para el stress |

El de monitoreo es de **solo lectura**: si se filtra, no puede modificar nada.

El script también crea el tablespace `CLOUDCR_STRESS_TS` (50 MB, `AUTOEXTEND OFF`).
Lo crea el DBA y no el código del stress a propósito: crear un tablespace no
otorga cuota sobre él (`ORA-01950`), y darle al usuario de stress permisos para
asignarse cuota solo (`ALTER USER` o `UNLIMITED TABLESPACE`) le permitiría
llenar cualquier tablespace, incluido `SYSTEM`. Preparado así, el usuario de
stress solo puede escribir en esos 50 MB.

### 2. Token compartido

El mismo valor en los dos lados:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

- Backend: variable de entorno `MONITOR_COLLECTOR_TOKEN`
  (en Render, en las *Environment Variables* del servicio; en local,
  `backend/config/.env`).
- Collector: `MONITOR_COLLECTOR_TOKEN` en `collector/.env`.

Sin token configurado en el backend, `POST /monitor/ingesta` responde **503** y
no acepta nada. Falla cerrado a propósito.

### 3. Configuración

```bash
cp collector/.env.example collector/.env
cp agente_local/.env.example agente_local/.env
```

En `collector/.env` ajustar `MONITOR_API_URL` y `MONITOR_COLLECTOR_TOKEN`.

### 4. Levantar

Dos terminales, desde la raíz del repo:

```bash
python -m collector      # API local en 127.0.0.1:8100 + loop de recolección
python -m agente_local    # página en http://127.0.0.1:8200
```

### 5. Registrar la base

Abrir <http://127.0.0.1:8200>, completar el formulario y registrar. El collector
prueba la conexión **antes** de aceptarla, y avisa qué variables no pudo leer si
faltan privilegios. Al primer snapshot, la base aparece sola en el selector del
dashboard (`/monitor`).

## Demostración en vivo

Bajar el intervalo a 2–3 segundos en los dos lados:

```
collector/.env    INTERVALO_SEGUNDOS=3
frontend/.env     VITE_MONITOR_REFRESCO_MS=3000
```

Los botones de stress además piden al collector un ciclo inmediato
(`POST /ciclo`), así que el dashboard reacciona sin esperar el intervalo.

| Mecanismo | Qué hace | Variables que mueve |
|---|---|---|
| Lock contention | una sesión retiene una fila sin commit, otras la esperan | `p6` sesiones bloqueadas |
| Llenar tablespace | tablespace propio de 50 MB con `AUTOEXTEND OFF`, inserts hasta `ORA-01653` | `a4` espacio libre, `a3` ocupación |
| Carga de CPU | N sesiones con `CONNECT BY LEVEL` pesado | `p4` sesiones activas |
| Flood de conexiones | abre sesiones hasta topar con `PROCESSES` | `p3`, `p5`, `p8` |

Medido en XE 21c: lock contention lleva `p6` de 0 a 6 (crítica) y el llenado de
tablespace lleva `a4` de 98 % a 0 % libre (crítica), deteniéndose solo en
`ORA-01653`. Los de CPU y conexiones **mueven** las variables (`p3` de 1 a 76,
`p1` de 88 a 163) pero no cruzan umbrales, porque XE trae `PROCESSES = 1760` y
los umbrales están en 380/460. Para que el flood llegue a crítico hay que bajar
el parámetro:

```sql
ALTER SYSTEM SET processes = 150 SCOPE = SPFILE;
-- requiere reiniciar la instancia
```

Para el demo conviene usar lock contention y tablespace, que sí cruzan umbrales
sin tocar la configuración de la instancia.

La **intensidad controla la profundidad**: con la penalización weakest-link, una
crítica leve deja el ISBD apenas en rojo y una profunda lo hunde. En lock
contention, intensidad ~6 (p6=6) deja el ISBD ~36; intensidad ≥8 (p6≥8) lo lleva
a 0 ("base caída" por índice).

Salvaguardas del stress:

- Solo corre contra una base que esté **en esta misma máquina**: el host se
  resuelve y se compara contra las IP de las interfaces propias, porque el
  listener de Oracle suele estar bindeado a la IP de LAN (`192.168.x.x`) y no a
  `localhost`. Para una base de prueba en otro equipo hay que poner
  `PERMITIR_REMOTO=true` en `agente_local/.env` a propósito.
- Todo objeto que crea lleva el prefijo `CLOUDCR_STRESS_`; el botón **Limpiar**
  los borra. No toca nada más.
- El llenado ocurre dentro de su propio tablespace de 50 MB: al agotarse,
  Oracle falla dentro de ese tablespace y no consume más disco.
- Cada stress tiene duración máxima (300 s) y se puede cortar.

## Notas sobre las métricas

Las 25 variables (`p1..p8`, `m1..m9`, `a1..a8`) y sus umbrales viven en la tabla
`Monitor_Variables` del backend (migraciones `0004` y `0005`). El collector solo
mide; los indicadores IP/IM/IA y el ISBD los calcula el backend.

Al conectar contra Oracle real aparecieron diferencias con los datos simulados
originales, que quedaron corregidas:

- `V$RESOURCE_LIMIT` **no devuelve filas dentro de una PDB**. `p1`, `p2` y `p8`
  se calculan con `V$PROCESS`, `V$SESSION` y `V$PARAMETER`.
- `V$DATAFILE` no tiene columna `MAXBYTES` (da `ORA-00904`). `a3` usa
  `DBA_DATA_FILES`.
- En `V$PGASTAT` el contador `aggregate PGA target parameter` vale 0 dentro de
  una PDB. `m5`, `m6` y `m7` usan el parámetro `pga_aggregate_target`.
- En `NOARCHIVELOG` (el modo por defecto de XE) todos los redo logs tienen
  `archived='NO'` sin que eso sea un problema. `a6` reporta 0 en ese modo.
- `Free SGA Memory Available` mide gránulos sin repartir y vale 0 en cualquier
  instancia ya arrancada. `m2` suma la `free memory` de los pools, que sí varía.

### Pendiente de revisar con el profesor

`m4` (Uso de Buffer Cache) mide ocupación, y Oracle mantiene el cache lleno a
propósito: en XE recién arrancada da 99.91 %. Con los umbrales originales
(75/92) quedaba en **crítico permanente**. La migración `0005` los subió a
99.5/99.95 como parche.

La corrección de fondo es cambiar la variable por el **miss ratio** del buffer
cache (`physical reads cache` / lecturas lógicas), que en la misma instancia dio
3.41 % y sí es un indicador directo de presión de memoria. Queda anotado en
`backend/docs/Gaps.md`.

## Problemas comunes

**`DPY-6005: cannot connect to database` / `WinError 10061`**
El listener de Oracle no está arriba, o no escucha en el host que se le pasó.
En Windows hay que arrancarlo desde una terminal **como administrador**:

```powershell
net start OracleServiceXE
net start OracleOraDB21Home1TNSListener
```

Ojo con el host: el listener suele bindearse **solo a la IP de LAN**, no a
`localhost`. Verificar con qué dirección quedó:

```powershell
Get-NetTCPConnection -LocalPort 1521 -State Listen | Select-Object LocalAddress
```

y usar esa dirección en el formulario de registro. Si `listener.ora` tiene
fijada una IP que ya no existe, el servicio arranca y se cae sola con
`TNS-12545` / `Windows Error 49`; se arregla poniendo `HOST = localhost`.

**El collector parece ignorar los cambios de código**
En Windows `pkill` no siempre mata el proceso. Verificar que no quedó una
instancia vieja tomando el puerto:

```powershell
Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
  Where-Object { $_.CommandLine -match '-m collector' } |
  Select-Object ProcessId, CreationDate
```

**`503` al empujar**
Falta `MONITOR_COLLECTOR_TOKEN` en el backend, o tiene menos de 16 caracteres.

**`401` al empujar**
El token del collector no coincide con el del backend.

**`422 mediciones.<componente>`**
El collector no pudo leer ninguna variable con umbrales de ese componente.
Casi siempre falta `SELECT_CATALOG_ROLE` en el usuario de monitoreo.

**El dashboard dice "No hay bases de datos monitoreadas"**
Todavía no llegó ningún snapshot. Revisar el log del collector.

## Agregar otro motor

`collector/colectores/base.py` define la interfaz común
(`leer_procesos`, `leer_memoria`, `leer_archivos`). Para MySQL o PostgreSQL se
subclasea `ColectorSalud`, se traducen las variables a sus propias fuentes y se
registra la clase en `COLECTORES` de `collector/recolector.py`. El backend y el
dashboard no cambian: razonan sobre los mismos códigos de variable.
