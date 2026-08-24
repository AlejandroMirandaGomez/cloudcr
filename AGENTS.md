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
