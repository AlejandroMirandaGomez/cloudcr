# AGENTS.md — Runbook de instalación local

Guía paso a paso para dejar CloudCR corriendo por completo en una computadora
nueva (backend, frontend, PostgreSQL y, opcionalmente, el monitor de salud
con Oracle en vivo). Pensada para que un agente de IA (u otra persona) la
siga sin contexto previo del proyecto.

Para entender la arquitectura general antes de tocar nada, leer primero
`claude.md` (contexto del proyecto) y `README.md` (estructura de carpetas).
Este documento es el **cómo**, no el **qué ni el porqué**.

## Antes de empezar

- **Nunca asumir credenciales.** Los `.env.example` traen valores de
  ejemplo (`postgres`/`postgres`, contraseñas placeholder) que casi nunca
  coinciden con lo que hay realmente instalado en la máquina. Probar el
  valor por defecto una vez; si falla, preguntar al usuario en vez de seguir
  adivinando contraseñas.
- **Windows: los binarios no siempre están en el PATH.** `psql`, `sqlplus`,
  etc. pueden no resolverse con `where`. Buscarlos bajo sus carpetas de
  instalación típicas (ver cada sección) en vez de asumir que fallan porque
  no están instalados.
- **Si el entorno tiene tanto Bash (git-bash/MSYS) como PowerShell**, para
  todo lo que sea Windows nativo (rutas `C:\...`, `sqlplus`, servicios)
  preferir PowerShell. Git-bash reescribe automáticamente cualquier
  argumento que empiece con `/` como una ruta de Windows — esto rompe
  literalmente `sqlplus / as sysdba` (el `/` de autenticación por SO se
  convierte en una ruta). Si hay que usar Bash sí o sí, evitar `/ as sysdba`
  y conectar con usuario/clave explícitos (`sys/<pwd>@host:puerto/servicio AS SYSDBA`).

---

## 1. Base de datos PostgreSQL

### 1.1 Verificar si ya existe

```powershell
Get-Service -Name "*postgres*"
```

Si `psql` no está en el PATH, buscarlo:

```powershell
Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe"
```

Listar bases y confirmar si `cloud_cr` ya existe (probar la contraseña del
`.env.example`, y si falla, preguntar al usuario):

```powershell
$env:PGPASSWORD = "<password>"
& "C:\Program Files\PostgreSQL\<version>\bin\psql.exe" -U postgres -h localhost -p 5432 -lqt
```

### 1.2 Crear la base si no existe

```bash
psql -U postgres -c "CREATE DATABASE cloud_cr;"
psql -U postgres -d cloud_cr -f database/Modelo_Relacional.sql
psql -U postgres -d cloud_cr -f database/Datos_Iniciales.sql
```

### 1.3 Si ya existe, revisar qué migraciones tiene aplicadas

```sql
\dt
\d schema_migrations
SELECT * FROM schema_migrations;
```

`schema_migrations` tiene columnas `nombre` / `aplicada_en` (no `version` —
no asumir el nombre de columna, inspeccionar con `\d` primero).

### 1.4 Aplicar migraciones pendientes (idempotente)

```bash
cp backend/config/.env.example backend/config/.env
# ajustar DB_USER / DB_PASS en backend/config/.env con las credenciales reales
php backend/scripts/migrate.php
```

Corre solo las migraciones de `backend/database/migrations/` que falten;
las ya registradas se saltan (`[migrate] Ya aplicada: ...`).

---

## 2. Backend (PHP)

```bash
composer dump-autoload -d backend
php -S localhost:8000 -t backend/public
```

Requiere `pdo_pgsql` habilitado en `php.ini`. Verificar con:

```bash
curl http://localhost:8000/salud
```

Detalle completo (WAMP, virtual host, troubleshooting) en `backend/README.md`.

> Si más adelante se levanta el monitor con `collector`/`agente_local` en
> Docker (§4.3.1), este backend hay que reiniciarlo con `-S 0.0.0.0:8000` en
> vez de `localhost:8000` — en Windows `localhost` resuelve solo a `::1`
> (loopback), que un contenedor no puede alcanzar. El síntoma si se olvida
> este paso: el collector lee Oracle bien pero falla al empujar el snapshot
> ("Network is unreachable"), y `/monitor/bases-datos` se queda con el
> último dato bueno sin actualizarse.

> El servidor embebido de PHP (`php -S`) relee `config/.env` en cada
> request (no hay proceso persistente cacheando config), así que editar
> `backend/config/.env` con el backend ya corriendo **no** requiere
> reiniciarlo. Esto no aplica si el backend corre detrás de Apache/WAMP con
> opcache — ahí sí reiniciar el servidor web tras tocar el `.env`.

---

## 3. Frontend (React + Vite)

```bash
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

`VITE_API_URL` en `frontend/.env` debe apuntar al backend (`http://localhost:8000`
en local).

---

## 4. Monitor de Salud con datos en vivo de Oracle (opcional)

Solo necesario si se quiere ver el dashboard de `/monitor` con datos reales
en vez del mensaje "No hay bases de datos monitoreadas". Sin este paso, el
resto de la app (Fase 1 completa) funciona igual.

Arquitectura: `[Oracle local] <-- [collector] --push--> [backend] --> [dashboard]`.
Detalle conceptual completo en `claude.md` y `collector/README.md`.

### 4.1 Instalar Oracle XE (si no está instalado)

No se puede automatizar: requiere aceptar licencia y descargar ~2 GB desde
https://www.oracle.com/database/technologies/xe-downloads.html (opción
"Windows (64-bit)"). Extraer el ZIP y correr `setup.exe` como
administrador. El instalador pide una contraseña para `SYS`/`SYSTEM` —
usarla también más adelante para la conexión `sysdba`.

Verificar que quedó arriba:

```powershell
Get-Service -Name "OracleServiceXE", "OracleOraDB21Home1TNSListener"
```

Si no están `Running`, iniciarlos (requiere terminal como administrador):

```powershell
net start OracleServiceXE
net start OracleOraDB21Home1TNSListener
```

Confirmar en qué dirección escucha el listener — puede bindearse solo a la
IP de LAN en vez de `localhost`:

```powershell
Get-NetTCPConnection -LocalPort 1521 -State Listen | Select-Object LocalAddress
```

### 4.2 Crear los usuarios de Oracle

`sqlplus.exe` normalmente no está en el PATH. Ubicación típica:

```
C:\app\<usuario_windows>\product\21c\dbhomeXE\bin\sqlplus.exe
```

El script `collector/sql/setup_oracle.sql` trae placeholders
(`CAMBIE_ESTA_CLAVE_1`, `CAMBIE_ESTA_CLAVE_2`) que hay que reemplazar antes
de correrlo — **no** dejar contraseñas reales hardcodeadas en ese archivo
versionado. Preguntar al usuario qué contraseñas usar (o generar unas
seguras y mostrárselas) y pasarlas por `DEFINE` al vuelo, sin editar el
archivo del repo. Desde PowerShell, autenticando con usuario/clave (evita
el problema de `/ as sysdba` en git-bash):

```powershell
$sql = Get-Content "collector/sql/setup_oracle.sql" -Raw
$sql = $sql -replace "CAMBIE_ESTA_CLAVE_1", "<password_monitor_user>"
$sql = $sql -replace "CAMBIE_ESTA_CLAVE_2", "<password_cloudcr_stress>"
$sql = "ALTER SESSION SET CONTAINER = XEPDB1;`n" + $sql
$sql | & "C:\app\<usuario_windows>\product\21c\dbhomeXE\bin\sqlplus.exe" -S "sys/<password_sys>@localhost:1521/XEPDB1 as sysdba"
```

Nota: si el connect string ya apunta al servicio `XEPDB1` (como arriba), el
`ALTER SESSION SET CONTAINER` es redundante — la sesión ya se abre dentro
de esa PDB. Confirmar al final del output: `Usuarios creados: 2 de 2` y
`Cuota de stress: 1 de 1`.

### 4.3 Collector y agente local

```bash
pip install -r collector/requirements.txt
pip install -r agente_local/requirements.txt
cp collector/.env.example collector/.env
cp agente_local/.env.example agente_local/.env
```

Generar el token compartido y ponerlo **igual** en los dos `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

- `backend/config/.env` → `MONITOR_COLLECTOR_TOKEN=<token>`
- `collector/.env` → `MONITOR_COLLECTOR_TOKEN=<token>` (mismo valor)

> **Orden importa.** El collector lee `.env` una sola vez al arrancar
> (`python-dotenv`). Si el proceso `python -m collector` ya estaba corriendo
> cuando se edita `collector/.env`, hay que reiniciarlo para que tome el
> token nuevo — si no, el backend responde `401`. Para confirmar si hace
> falta reiniciar, comparar el `LastWriteTime` del `.env` contra el
> `CreationDate` del proceso:
>
> ```powershell
> Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
>   Where-Object { $_.CommandLine -match '-m collector' } |
>   Select-Object ProcessId, CreationDate
> (Get-Item "collector/.env").LastWriteTime
> ```
>
> Si el `.env` se editó **después** de que el proceso arrancó, reiniciarlo.

Levantar (dos terminales, desde la raíz del repo):

```bash
python -m collector      # API local en 127.0.0.1:8100 + loop de recoleccion
python -m agente_local    # pagina en http://127.0.0.1:8200
```

Sin `MONITOR_COLLECTOR_TOKEN` configurado en el backend, `POST /monitor/ingesta`
responde `503` a propósito (falla cerrado). `401` significa que el token no
coincide entre `collector/.env` y `backend/config/.env`.

#### 4.3.1 Alternativa si Smart App Control bloquea `oracledb` (Windows)

Síntoma: `python -m collector` (o `agente_local`) falla con

```
ImportError: DLL load failed while importing base_impl: Una directiva de
Control de aplicaciones bloqueó este archivo.
```

Confirmar la causa exacta antes de asumir nada (puede ser otra cosa):

```powershell
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-CodeIntegrity/Operational'; StartTime=(Get-Date).AddMinutes(-10)} |
  Select-Object -First 5 TimeCreated, Id, Message
```

Buscar un evento "Smart App Control Block" sobre
`oracledb\base_impl.cp3xx-win_amd64.pyd`. Es una función de Windows 11 que
arranca en modo "evaluación" (deja correr el binario nuevo la primera vez) y
más tarde, sin avisar, pasa a bloquearlo — por eso puede haber funcionado en
una sesión anterior y fallar ahora sin que nada del proyecto haya cambiado.

**No desactivar Smart App Control para resolver esto**: es una decisión de
seguridad del usuario, irreversible sin reinstalar Windows. La alternativa
que no la toca es correr `collector` y `agente_local` en **Docker** en vez de
Python nativo (WSL sirve igual pero requiere `sudo apt install python3-pip`
interactivo, que un agente no puede completar solo).

Los archivos ya existen en `docker/` (`monitor.Dockerfile` +
`docker-compose.yml`) si se corrió este runbook antes; si no, crearlos
siguiendo el mismo patrón: una imagen `python:3.12-slim` con los dos `requirements.txt`
instalados y el código de `collector/` + `agente_local/` copiado, arrancada
con `python -c "...crear_app(...).run(host='0.0.0.0', ...)"` en vez de
`python -m collector` (los `__main__.py` del proyecto bindean a `127.0.0.1`
a propósito — fuera de la máquina eso incluye "fuera del contenedor", así
que hay que llamar a `crear_app` directo con `host='0.0.0.0'`).

Tres detalles de red que rompen si se copian los comandos nativos tal cual:

1. **El backend debe escuchar en `0.0.0.0`, no `localhost`** (si no, el
   contenedor lo ve como "connection refused"):
   ```powershell
   php -S 0.0.0.0:8000 -t backend/public
   ```
2. **`collector/config.py` rechaza `MONITOR_API_URL` si no contiene
   literalmente `localhost` o `127.0.0.1`** (asume que si no, es un host
   remoto real y el token viajaría en claro). `host.docker.internal` no sirve
   para esa variable puntual — hay que darle un alias en `extra_hosts` que sí
   contenga esa palabra, por ejemplo `localhost-host:host-gateway`, y usar
   `http://localhost-host:8000`.
3. **La salvaguarda de `agente_local/stress.py`** compara el host contra las
   interfaces de red del contenedor, no del Windows real — `host.docker.internal`
   nunca va a matchear, así que hace falta `PERMITIR_REMOTO=true` en el
   `agente_local` del compose (a propósito: sigue siendo la misma máquina
   física, solo que el contenedor la ve como un peer de red distinto).

Levantar (el token es el mismo que `MONITOR_COLLECTOR_TOKEN` en
`backend/config/.env`; `docker/.env` está en `.gitignore`, nunca commitear
el token real en `docker-compose.yml`):

```powershell
cd docker
cp .env.example .env   # completar MONITOR_COLLECTOR_TOKEN antes de seguir
docker compose build
docker compose up -d
cd ..
```

Registro y todo lo demás sigue igual, salvo que el "Host" a usar es
`host.docker.internal` en vez de `localhost`/la IP de LAN, y el usuario de
stress necesita `PERMITIR_REMOTO=true` como se explicó arriba. Comandos
completos y probados para copiar y pegar en `README.md` § "Arranque rápido".

### 4.4 Registrar la base en el dashboard

Abrir `http://127.0.0.1:8200` y completar el formulario:

| Campo | Valor típico (Oracle XE local) |
|---|---|
| Nombre en el monitor | cualquier nombre descriptivo |
| Motor | Oracle |
| Host | `localhost` (o la IP de LAN si el listener no bindeó localhost) |
| Puerto | `1521` |
| Service name / TNS | `XEPDB1` |
| Usuario de monitoreo | `monitor_user` / la contraseña del paso 4.2 |
| Usuario de stress (opcional) | `cloudcr_stress` / la contraseña del paso 4.2 |

Al enviar el formulario debería confirmar algo como
`Registrada. Oracle respondio con 25 de 25 variables.` Si falla, revisar la
sección "Problemas comunes" de `collector/README.md` (login Oracle, listener
caído, `SELECT_CATALOG_ROLE` faltante, etc.).

### 4.5 Verificar el pipeline completo

En la tabla "2. Bases monitoreadas" de `http://127.0.0.1:8200`, click en
**Actualizar** después de esperar un ciclo (`INTERVALO_SEGUNDOS` en
`collector/.env`, 5 s por defecto). Debe aparecer una fila con fecha de
último ciclo, un valor de ISBD (0–100) y conteo de alertas. Con eso
confirmado, el dashboard del frontend en `/monitor` ya debería mostrar la
base con datos reales en vez de "No hay bases de datos monitoreadas".

Para sembrar datos simulados sin necesidad de Oracle (útil si solo se
quiere ver el dashboard poblado, sin hacer el paso 4 completo):

```bash
php backend/scripts/seed_monitor_simuladas.php
```

---

## Checklist rápido de verificación end-to-end

1. `curl http://localhost:8000/salud` → 200
2. Frontend en `http://localhost:5173` carga y el login/cuestionario de
   Fase 1 funciona
3. (Opcional) `http://127.0.0.1:8200` registra la base sin error y
   `Actualizar` muestra un ISBD numérico
4. `/monitor` en el frontend muestra la base registrada, no el mensaje de
   "sin datos"
