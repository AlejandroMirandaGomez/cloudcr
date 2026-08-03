# Cloud CR — Backend

API REST en PHP puro sobre PostgreSQL para la aplicacion de evaluacion del riesgo en la
administracion de bases de datos (ISO/IEC 27002).

Sin framework. Composer se usa **unicamente** para generar el autoload PSR-4: el proyecto
no declara ninguna dependencia externa.

## Requisitos

- PHP >= 8.1 con `pdo_pgsql` y `mbstring` habilitados
- PostgreSQL >= 12 (se usan `FILTER`, `JSON_AGG` y `ON CONFLICT`)
- Composer (solo para el autoload)
- Apache con `mod_rewrite`, o el servidor embebido de PHP

## Instalacion

### 1. Generar el autoload

```bash
composer dump-autoload
```

**Este paso no es opcional.** `app/Core/Bootstrap.php` hace `require vendor/autoload.php`;
sin la carpeta `vendor/` toda peticion muere con un fatal error antes de llegar al router.
Como `composer.json` no declara dependencias, `dump-autoload` basta y no necesita red.

### 2. Crear la base de datos

```sql
CREATE DATABASE cloud_cr;
```

Luego, conectado a `cloud_cr`, ejecutar el script de esquema y opcionalmente el de datos
de prueba.

> **Pendiente:** el script SQL todavia no esta versionado en el repositorio. Su lugar es
> la carpeta `database/` de la raiz, y es ademas el entregable 11 del curso.

El backend depende de estas restricciones `UNIQUE`; sin ellas no funciona correctamente:

| Restriccion | Por que |
|---|---|
| `Organizaciones.nombre` | Devolver 409 en vez de 500 ante un duplicado |
| `Normas.nombre` | Idem |
| `Controles.nombre_control` | Idem |
| `Controles_Normas (control_id, norma_id)` | `ON CONFLICT DO NOTHING` al vincular normas |
| `Respuestas_Controles (cuestionario_id, control_id)` | El `PUT` idempotente de respuestas se apoya en `ON CONFLICT DO UPDATE`; sin esta restriccion falla |

### 3. Configurar la conexion (opcional)

```bash
cp config/.env.example config/.env
```

Si `config/.env` no existe, se usan los valores por defecto de `app/Core/Config.php`
(`localhost:5432`, base `cloud_cr`, usuario `postgres`). Las variables de entorno reales
del sistema tienen prioridad sobre el archivo.

### 4. Habilitar el driver en `php.ini` si hace falta

```ini
extension=pdo_pgsql
```

### 5. Levantar el servidor

```bash
php -S localhost:8000 -t public
```

Desde la raiz del repositorio seria `php -S localhost:8000 -t backend/public`.

### 6. Verificar

```bash
curl http://localhost:8000/salud
```

## Estructura

```
backend/
├── .htaccess               Reenvia la raiz de backend/ hacia public/
├── composer.json           Autoload PSR-4: CloudCR\ -> app/
├── public/index.php        Front controller: CORS, dispatch y manejo central de errores
├── public/.htaccess        Envia todo a index.php (requiere mod_rewrite)
├── app/Core/               Bootstrap, Config, Database (PDO), Request, Response,
│                           Router, Validator, HttpException
├── app/Repositories/       Todo el SQL vive aqui, una clase por tabla/agregado
├── app/Controllers/        Validan la entrada y delegan al repositorio
├── routes/routes.php       Tabla de rutas (36 endpoints, una linea por endpoint)
├── config/.env.example     Plantilla de configuracion
├── docs/Api.md             Referencia de endpoints con ejemplos
├── docs/Gaps.md            Lo que el esquema actual no permite implementar
└── scripts/Pruebas.sh      Prueba de humo con curl sobre los endpoints principales
```

Todas las rutas internas del codigo usan `__DIR__`, asi que la carpeta `backend/` se puede
mover o renombrar sin tocar nada. `Request::path()` ademas descuenta el subdirectorio donde
este montado el proyecto.

## Decisiones tecnicas

- **PDO con consultas preparadas en el 100% de las consultas.** No hay concatenacion de
  valores en SQL. Los unicos identificadores dinamicos (nombre de columna de dimension y
  nombre de tabla en la verificacion de existencia) vienen de listas blancas.
- **Los ENUM de PostgreSQL se castean explicitamente** (`CAST(:x AS nivel_control)`) porque
  un parametro preparado llega como texto sin tipo.
- **Transacciones** donde una operacion toca mas de una tabla: crear o editar un control con
  sus normas, el guardado por lotes de respuestas, y el borrado de un cuestionario.
- **`ON CONFLICT DO UPDATE`** en las respuestas: crear y editar son el mismo `PUT`
  idempotente (201 la primera vez, 200 en adelante).
- **Errores de PostgreSQL traducidos a HTTP**: `23505` → 409 con mensaje en espanol segun la
  restriccion violada, `23503` → 422, `23502` → 422, `22P02` → 422, `42P01` → 500 con
  instrucciones. El frontend nunca recibe un stack trace.
- **Ningun borrado destruye historial**: no se puede eliminar una organizacion, control o
  norma que ya aparezca en un cuestionario respondido; se responde 409 con el conteo exacto.
- **Respuestas uniformes**: `{data}` / `{data, meta}` en exito, `{error}` en fallo. Los
  porcentajes devuelven `null` (no `0`) cuando no hay datos, para que el frontend distinga
  "sin evaluar" de "0 % de cumplimiento".

## Estado respecto al enunciado del proyecto

**Implementado**

- CRUD de organizaciones, evaluadores, normas, controles y cuestionarios
- Catalogo de controles filtrable por norma, tipo, dimension (C/I/D), nivel P/S y texto
- Registro de respuestas Si / No / N-A por control, con guardado parcial e idempotente,
  y guardado por lotes transaccional
- Reportes: resumen de cumplimiento, mapa de calor por dimension con desglose P/S,
  hallazgos (controles en "No") e historial de cumplimiento por organizacion

**No implementado** (requiere cambios en el modelo de datos)

- Autenticacion de usuarios y manejo de sesiones — el `evaluador_id` viaja en el cuerpo
- Preguntas por control: hoy se responde a nivel de control, no de pregunta
- Nivel de madurez 0–5; solo se exponen los insumos `documentado`, `repetible` y `evidencia`
- Peso o importancia del control, y por lo tanto el calculo de exposicion al riesgo C/I/D
- Dominios de la norma, y los reportes por dominio que dependen de ellos
- Observaciones, comentarios y evidencias en texto
- Estado del cuestionario (en progreso / finalizado)

El detalle de cada bloqueo esta en `docs/Gaps.md`.

## Archivos privados bajo `www/`

`app/`, `config/`, `routes/`, `scripts/` y `docs/` traen un `.htaccess` con
`Require all denied`. Solo el contenido de `public/` esta pensado para servirse por HTTP.

> Esto depende de que Apache permita archivos `.htaccess` (`AllowOverride All` o al menos
> `Limit`). Si `AllowOverride None` esta activo, los `.htaccess` se ignoran por completo y
> `config/.env` —con la contrasena de la base— quedaria accesible. La forma segura de
> evitarlo es el virtual host de la seccion siguiente, que deja `public/` como raiz del
> sitio y todo lo demas fuera del alcance del servidor web.

---

## Despliegue en WAMP (Windows)

WAMP **no** incluye PostgreSQL. Hay que instalar PostgreSQL aparte
(https://www.postgresql.org/download/windows/) y dejar Apache + PHP de WAMP como
servidor web. MySQL/MariaDB de WAMP puede quedar apagado; no se usa.

### 1. Habilitar el driver de PostgreSQL en PHP

WAMP mantiene dos `php.ini` (uno para Apache y otro para la CLI), asi que conviene
hacerlo desde el menu del icono de la bandeja:

**PHP → PHP extensions →** marcar `php_pdo_pgsql` **y** `php_pgsql`.

WAMP reinicia Apache solo. Verificar con:

```
http://localhost/?phpinfo=1
```

y buscar la seccion `pdo_pgsql`. Si no aparece, revisar manualmente
`C:\wamp64\bin\apache\apache2.4.xx\bin\php.ini` y descomentar:

```ini
extension=php_pdo_pgsql.dll
extension=php_pgsql.dll
```

> Si las DLL no existen en `C:\wamp64\bin\php\php8.x.x\ext\`, la version de PHP se
> compilo sin ellas: hay que bajar el paquete PHP para Windows (Thread Safe, misma
> version y arquitectura) y copiar las dos DLL mas `libpq.dll` a la carpeta de PHP.

### 2. Habilitar mod_rewrite

**Apache → Apache modules →** marcar `rewrite_module`. Sin esto, el `.htaccess` de
`public/` no funciona y todas las rutas dan 404.

### 3. Colocar el proyecto

Copiar la carpeta `backend/` a `C:\wamp64\www\backend\`. El API queda en:

```
http://localhost/backend/public/
http://localhost/backend/public/salud
```

`Request::path()` ya descuenta el subdirectorio, asi que no hay que tocar nada mas.

No hace falta copiar el repositorio completo: `frontend/`, `database/` y `docs/` no los
sirve Apache.

### 4. Opcional pero recomendado: virtual host

Deja `public/` como raiz del sitio, con lo que `app/`, `routes/` y `config/` quedan fuera
del alcance del servidor web por completo, sin depender de los `.htaccess`. En
`C:\wamp64\bin\apache\apache2.4.xx\conf\extra\httpd-vhosts.conf`:

```apache
<VirtualHost *:80>
    ServerName cloudcr.local
    DocumentRoot "C:/wamp64/www/backend/public"
    <Directory "C:/wamp64/www/backend/public">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require local
    </Directory>
</VirtualHost>
```

Agregar `127.0.0.1  cloudcr.local` a `C:\Windows\System32\drivers\etc\hosts`
(editar como administrador) y reiniciar Apache. El API queda en
`http://cloudcr.local/`, sin el prefijo `/backend/public`.

### 5. Configurar la conexion

```
copy config\.env.example config\.env
```

y editar `DB_HOST=localhost`, `DB_PORT=5432` (el instalador de PostgreSQL para Windows
usa 5432 por defecto), `DB_NAME=cloud_cr`, `DB_USER=postgres`,
`DB_PASS=<la que puso en el instalador>`.

### 6. Donde ver los errores

`ini_set('display_errors', '0')` esta puesto a proposito: los errores no se imprimen en
la respuesta JSON. En WAMP el log queda en `C:\wamp64\logs\php_error.log`. Los mensajes
del backend se identifican con el prefijo `[cloud-cr]`.

### Notas

- `scripts/Pruebas.sh` es bash. En Windows correrlo desde Git Bash, o usar
  `http://localhost/backend/public/...` directamente en Postman / Thunder Client.
- No hace falta cambiar `date_default_timezone_set('America/Costa_Rica')`; funciona igual
  en Windows.
