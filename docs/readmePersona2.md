# Cloud CR — Backend (Persona 2)

API REST en PHP puro sobre PostgreSQL para el sistema de Cuestionario de Control Interno.
Sin Composer, sin framework: solo PHP 8.1+ y la extension `pdo_pgsql`.

## Requisitos

- PHP >= 8.1 con `pdo_pgsql` y `mbstring` habilitados
- PostgreSQL >= 12 (se usan `FILTER`, `JSON_AGG` y `ON CONFLICT`)
- Apache con `mod_rewrite` (o el servidor embebido de PHP)

## Instalacion

1. Crear la base y ejecutar el script de Persona 2:

   ```sql
   CREATE DATABASE cloud_cr;
   ```
   Luego, conectado a `cloud_cr`, ejecutar **`Script_V2.sql`** y opcionalmente
   `Querys_Script_V2.sql` para los datos de prueba.

   > Use `Script_V2.sql`, **no** `cuestionario_control_interno.sql`. El backend depende
   > de las restricciones `UNIQUE` que solo tiene la version V2 (`Organizaciones.nombre`,
   > `Normas.nombre`, `Controles.nombre_control`) para devolver 409 en vez de 500 ante duplicados.

2. Configurar la conexion:

   ```bash
   cp config/.env.example config/.env
   # editar DB_NAME, DB_USER, DB_PASS
   ```

3. Habilitar el driver en `php.ini` si hace falta:

   ```ini
   extension=pdo_pgsql
   ```

4. Levantar el servidor:

   ```bash
   php -S localhost:8000 -t public
   ```

   O copiar la carpeta a `htdocs/` y apuntar el navegador a
   `http://localhost/backend/public/`.

5. Verificar:

   ```bash
   curl http://localhost:8000/salud
   ```

## Estructura

```
public/index.php        Front controller: CORS, ruteo y manejo central de errores
src/bootstrap.php       Autoload PSR-4 sin Composer + configuracion de entorno
src/routes.php          Tabla de rutas (una linea por endpoint)
src/Core/               Config, Database (PDO), Request, Response, Router, Validator, HttpException
src/Repositories/       Todo el SQL vive aqui, una clase por tabla/agregado
src/Controllers/        Validan la entrada y delegan al repositorio
docs/API.md             Referencia de endpoints con ejemplos
docs/GAPS.md            Historias que el esquema actual no permite implementar
docs/pruebas.sh         Prueba de humo con curl sobre todos los endpoints
```

## Decisiones tecnicas

- **PDO con consultas preparadas en el 100% de las consultas.** No hay concatenacion de
  valores en SQL. Los unicos identificadores dinamicos (nombre de columna de dimension)
  vienen de una lista blanca.
- **Los ENUM de PostgreSQL se castean explicitamente** (`CAST(:x AS nivel_control)`) porque
  un parametro preparado llega como texto sin tipo.
- **Transacciones** donde una operacion toca mas de una tabla: crear/editar un control con
  sus normas, y el guardado por lotes de respuestas.
- **`ON CONFLICT DO UPDATE`** en las respuestas: HU-013 (crear) y HU-014 (editar) son el
  mismo `PUT` idempotente, apoyado en `UNIQUE (cuestionario_id, control_id)`.
- **Errores de PostgreSQL traducidos a HTTP**: `23505` → 409, `23503` → 422, `42P01` → 500
  con instrucciones. El frontend nunca recibe un stack trace.
- **Ningun borrado destruye historial**: no se puede eliminar una organizacion, control o
  norma que ya aparezca en un cuestionario respondido.

## Pendiente por parte de otros roles

- El esquema no soporta HU-011 ni HU-015 (ver `docs/GAPS.md`). Ese es un cambio de Persona 1.
- Los pesos de impacto/probabilidad y el nivel de madurez los define Persona 4. El API
  entrega los insumos crudos en `/cuestionarios/{id}/resumen` y `/cuestionarios/{id}/hallazgos`.

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

Copiar la carpeta a `C:\wamp64\www\backend\`. El API queda en:

```
http://localhost/backend/public/
http://localhost/backend/public/salud
```

`Request::path()` ya descuenta el subdirectorio, asi que no hay que tocar nada mas.

Las carpetas `config/` y `src/` traen su propio `.htaccess` con `Require all denied`,
porque bajo `www/` quedarian expuestas por HTTP (incluido `config/.env` con la
contrasena de la base).

### 4. Opcional pero recomendado: virtual host

Deja `public/` como raiz del sitio, con lo que `src/` y `config/` quedan fuera del
alcance del servidor web por completo. En
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
usa 5432 por defecto), `DB_NAME=cloud_cr`, `DB_USER=postgres`, `DB_PASS=<la que puso en el instalador>`.

### 6. Donde ver los errores

`ini_set('display_errors', '0')` esta puesto a proposito: los errores no se imprimen en
la respuesta JSON. En WAMP el log queda en `C:\wamp64\logs\php_error.log`. Los mensajes
del backend se identifican con el prefijo `[cloud-cr]`.

### Notas

- `docs/pruebas.sh` es bash. En Windows correrlo desde Git Bash, o usar
  `http://localhost/backend/public/...` directamente en Postman / Thunder Client.
- No hace falta cambiar `date_default_timezone_set('America/Costa_Rica')`; funciona igual
  en Windows.