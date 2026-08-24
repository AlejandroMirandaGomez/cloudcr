"""Mecanismos de stress contra la base Oracle de prueba.

ADVERTENCIA: esto degrada a proposito la base a la que apunta. Esta pensado
para una instancia Oracle XE local y desechable, montada para la demostracion
del Monitor de Salud. No apuntarlo nunca a una base con datos reales.

Salvaguardas incluidas:

* Por defecto solo acepta hosts locales (localhost / 127.0.0.1). Para otro host
  hay que poner PERMITIR_REMOTO=true en agente_local/.env a proposito.
* Todo objeto que se crea lleva el prefijo CLOUDCR_STRESS_, y `limpiar()` los
  borra. Nunca se toca una tabla, tablespace o sesion que no lleve ese prefijo.
* El llenado de espacio ocurre dentro de un tablespace propio de 50 MB con
  AUTOEXTEND OFF, y el usuario de stress solo tiene cuota EN ESE tablespace:
  al llenarse, Oracle falla con ORA-01653 ahi dentro y no consume disco real
  mas alla de esos 50 MB.
* Cada stress tiene duracion maxima y se puede cortar con `detener()`.
"""

from __future__ import annotations

import logging
import socket
import threading
import time
from dataclasses import dataclass, field

import oracledb

log = logging.getLogger(__name__)

PREFIJO = "CLOUDCR_STRESS_"
TABLA_LOCK = f"{PREFIJO}LOCK"
TABLA_RELLENO = f"{PREFIJO}RELLENO"
TABLESPACE = f"{PREFIJO}TS"

HOSTS_LOCALES = ("localhost", "127.0.0.1", "::1")


def _es_esta_maquina(host: str) -> bool:
    """True si `host` apunta a esta misma maquina.

    No alcanza con comparar contra localhost: el listener de Oracle suele estar
    bindeado a la IP de LAN del equipo (ej. 192.168.x.x), asi que el DSN legitimo
    de una base local no dice "localhost". Se resuelve el nombre y se compara
    contra las direcciones de las interfaces propias.
    """
    if host.lower() in HOSTS_LOCALES:
        return True

    try:
        destino = {info[4][0] for info in socket.getaddrinfo(host, None)}
        propias = {info[4][0] for info in socket.getaddrinfo(socket.gethostname(), None)}
        propias.update({"127.0.0.1", "::1"})
    except socket.gaierror:
        # No resuelve: no se puede afirmar que sea local, asi que se bloquea.
        return False

    return bool(destino & propias)

#: Tope de duracion de cualquier stress, para que un demo olvidado no deje la
#: base degradada indefinidamente.
DURACION_MAXIMA = 300


class ErrorStress(RuntimeError):
    """El stress no se pudo ejecutar."""


@dataclass(frozen=True)
class Objetivo:
    """Conexion con privilegios de escritura contra la base de prueba."""

    host: str
    puerto: int
    servicio: str
    usuario: str
    contrasena: str
    permitir_remoto: bool = False

    def __post_init__(self) -> None:
        if not self.permitir_remoto and not _es_esta_maquina(self.host):
            raise ErrorStress(
                f"El stress solo se permite contra una base que corra en esta misma "
                f"maquina; '{self.host}' no resuelve a ninguna de sus interfaces. "
                "Si de verdad es una base de prueba en otro equipo, ponga "
                "PERMITIR_REMOTO=true en agente_local/.env."
            )

    def dsn(self) -> str:
        return f"{self.host}:{self.puerto}/{self.servicio}"

    def conectar(self) -> oracledb.Connection:
        return oracledb.connect(user=self.usuario, password=self.contrasena, dsn=self.dsn())


@dataclass
class EstadoStress:
    tipo: str
    activo: bool = False
    detalle: str = ""
    desde: float | None = None
    hasta: float | None = None

    def como_dict(self) -> dict[str, object]:
        ahora = time.time()
        return {
            "tipo": self.tipo,
            "activo": self.activo,
            "detalle": self.detalle,
            "segundos_restantes": (
                max(0, int(self.hasta - ahora)) if self.activo and self.hasta else 0
            ),
        }


class Stress:
    """Ejecuta y corta los mecanismos de stress. Un objeto por proceso."""

    TIPOS = ("lock", "tablespace", "cpu", "conexiones")

    def __init__(self, objetivo: Objetivo) -> None:
        self.objetivo = objetivo
        self._lock = threading.RLock()
        self._estados = {t: EstadoStress(tipo=t) for t in self.TIPOS}
        self._detener = {t: threading.Event() for t in self.TIPOS}
        self._hilos: dict[str, threading.Thread] = {}

    # -- API publica --------------------------------------------------------

    def estados(self) -> list[dict[str, object]]:
        with self._lock:
            return [e.como_dict() for e in self._estados.values()]

    def lanzar(self, tipo: str, duracion: int, intensidad: int = 3) -> dict[str, object]:
        if tipo not in self.TIPOS:
            raise ErrorStress(f"Tipo de stress desconocido: {tipo}.")

        duracion = max(5, min(duracion, DURACION_MAXIMA))
        intensidad = max(1, min(intensidad, 20))

        with self._lock:
            if self._estados[tipo].activo:
                raise ErrorStress(f"El stress '{tipo}' ya esta activo.")

            self._detener[tipo].clear()
            estado = self._estados[tipo]
            estado.activo = True
            estado.desde = time.time()
            estado.hasta = estado.desde + duracion
            estado.detalle = "arrancando"

            objetivo = {
                "lock": self._correr_lock,
                "tablespace": self._correr_tablespace,
                "cpu": self._correr_cpu,
                "conexiones": self._correr_conexiones,
            }[tipo]

            hilo = threading.Thread(
                target=self._envolver,
                args=(tipo, objetivo, duracion, intensidad),
                name=f"stress-{tipo}",
                daemon=True,
            )
            self._hilos[tipo] = hilo
            hilo.start()

        return {"tipo": tipo, "duracion": duracion, "intensidad": intensidad}

    def detener(self, tipo: str | None = None) -> list[str]:
        tipos = self.TIPOS if tipo is None else (tipo,)
        detenidos = []
        for t in tipos:
            if t not in self.TIPOS:
                raise ErrorStress(f"Tipo de stress desconocido: {t}.")
            with self._lock:
                if self._estados[t].activo:
                    self._detener[t].set()
                    detenidos.append(t)
        return detenidos

    def limpiar(self) -> dict[str, str]:
        """Borra los objetos CLOUDCR_STRESS_* que dejo el stress."""
        self.detener()
        for hilo in list(self._hilos.values()):
            hilo.join(timeout=10)

        resultado: dict[str, str] = {}
        with self.objetivo.conectar() as conexion, conexion.cursor() as cursor:
            for objeto, sql in (
                (TABLA_LOCK, f"DROP TABLE {TABLA_LOCK} PURGE"),
                (TABLA_RELLENO, f"DROP TABLE {TABLA_RELLENO} PURGE"),
                # El tablespace NO se borra: lo creo el DBA en setup_oracle.sql.
                # Con soltar la tabla se devuelven los 50 MB.
            ):
                try:
                    cursor.execute(sql)
                    resultado[objeto] = "eliminado"
                except oracledb.Error as error:
                    # ORA-00942: no existe. Es lo normal si ese mecanismo nunca
                    # se disparo; no tiene sentido mostrarlo como un fallo.
                    resultado[objeto] = ("no existia" if _codigo(error) == 942
                                         else _mensaje(error))
            conexion.commit()
        return resultado

    # -- envoltorio ---------------------------------------------------------

    def _envolver(self, tipo: str, funcion, duracion: int, intensidad: int) -> None:
        try:
            funcion(duracion, intensidad)
        except Exception as error:  # noqa: BLE001 - el hilo no debe morir callado
            log.exception("Stress %s fallo", tipo)
            self._anotar(tipo, detalle=f"error: {error}")
        finally:
            with self._lock:
                self._estados[tipo].activo = False
                self._estados[tipo].hasta = None
                self._hilos.pop(tipo, None)

    def _anotar(self, tipo: str, detalle: str) -> None:
        with self._lock:
            self._estados[tipo].detalle = detalle
        log.info("stress %s: %s", tipo, detalle)

    def _esperar(self, tipo: str, hasta: float) -> None:
        """Duerme hasta `hasta`, cortando si se pidio detener."""
        while time.time() < hasta:
            if self._detener[tipo].wait(0.5):
                return

    # -- mecanismos ---------------------------------------------------------

    def _correr_lock(self, duracion: int, intensidad: int) -> None:
        """Contencion de locks: una sesion retiene una fila y otras la esperan.

        Se ve en v$session.blocking_session, que es la variable p6 del monitor.
        """
        fin = time.time() + duracion

        bloqueadora = self.objetivo.conectar()
        esperando: list[oracledb.Connection] = []
        hilos: list[threading.Thread] = []

        try:
            with bloqueadora.cursor() as cursor:
                _crear_tabla_lock(cursor)
                bloqueadora.commit()
                # Esta sentencia toma el lock de la fila y NO se hace commit:
                # el lock se mantiene mientras viva la transaccion.
                cursor.execute(f"UPDATE {TABLA_LOCK} SET valor = valor + 1 WHERE id = 1")

            self._anotar("lock", f"fila bloqueada, levantando {intensidad} sesiones en espera")

            # Cada sesion adicional intenta tocar la misma fila y queda esperando.
            for i in range(intensidad):
                conexion = self.objetivo.conectar()
                esperando.append(conexion)
                hilo = threading.Thread(
                    target=_esperar_fila, args=(conexion, i), daemon=True
                )
                hilo.start()
                hilos.append(hilo)

            self._anotar("lock", f"{intensidad} sesiones bloqueadas (p6)")
            self._esperar("lock", fin)
            self._anotar("lock", "liberando el lock")
        finally:
            # El rollback suelta la fila y desbloquea a las que esperan.
            try:
                bloqueadora.rollback()
            finally:
                bloqueadora.close()

            # Hay que esperar a que los hilos salgan del UPDATE antes de cerrar
            # sus conexiones: cerrar una conexion que otro hilo esta usando es
            # comportamiento indefinido en oracledb.
            for hilo in hilos:
                hilo.join(timeout=10)

            for conexion in esperando:
                try:
                    conexion.close()
                except oracledb.Error:
                    pass

    def _correr_tablespace(self, duracion: int, intensidad: int) -> None:
        """Llena un tablespace propio de 50 MB con AUTOEXTEND OFF.

        Mueve a4 (espacio libre de tablespaces) y a3 (ocupacion de datafiles).
        El dano queda contenido: al agotarse, Oracle devuelve ORA-01653 sobre
        ese tablespace y nada mas de la instancia se ve afectado.
        """
        fin = time.time() + duracion

        with self.objetivo.conectar() as conexion, conexion.cursor() as cursor:
            _verificar_tablespace(cursor)
            _crear_tabla_relleno(cursor)
            conexion.commit()

            filas = 0
            lote = 2000 * intensidad

            while time.time() < fin and not self._detener["tablespace"].is_set():
                try:
                    cursor.execute(
                        f"""
                        INSERT INTO {TABLA_RELLENO} (relleno)
                        SELECT RPAD('x', 900, 'x') FROM dual CONNECT BY LEVEL <= :lote
                        """,
                        lote=lote,
                    )
                    conexion.commit()
                    filas += lote
                    self._anotar("tablespace", f"{filas} filas insertadas")
                except oracledb.Error as error:
                    codigo = _codigo(error)
                    # ORA-01653/01654/01688: no se pudo extender: el tablespace
                    # se lleno, que es exactamente el efecto buscado.
                    if codigo in (1653, 1654, 1688):
                        self._anotar("tablespace", f"tablespace lleno tras {filas} filas (ORA-0{codigo})")
                        self._esperar("tablespace", fin)
                        break
                    raise

            self._anotar("tablespace", f"fin, {filas} filas. Use 'Limpiar' para liberar el espacio.")

    def _correr_cpu(self, duracion: int, intensidad: int) -> None:
        """Sesiones ejecutando consultas pesadas: sube p4 (sesiones activas)."""
        fin = time.time() + duracion
        hilos = []

        for i in range(intensidad):
            hilo = threading.Thread(
                target=_quemar_cpu,
                args=(self.objetivo, fin, self._detener["cpu"], i),
                daemon=True,
            )
            hilo.start()
            hilos.append(hilo)

        self._anotar("cpu", f"{intensidad} sesiones ejecutando consultas pesadas")
        self._esperar("cpu", fin)
        for hilo in hilos:
            hilo.join(timeout=10)
        self._anotar("cpu", "sesiones liberadas")

    def _correr_conexiones(self, duracion: int, intensidad: int) -> None:
        """Abre muchas sesiones inactivas: sube p3, p5 y p8 (uso de limites)."""
        fin = time.time() + duracion
        # Cada "intensidad" son 5 sesiones, para que el efecto se note sin
        # tener que pedirle al usuario un numero grande.
        cuantas = intensidad * 5
        conexiones: list[oracledb.Connection] = []

        try:
            for _ in range(cuantas):
                if self._detener["conexiones"].is_set():
                    break
                try:
                    conexiones.append(self.objetivo.conectar())
                except oracledb.Error as error:
                    # ORA-00020: se alcanzo el maximo de procesos. Es el techo
                    # que se queria tocar, no un fallo del stress.
                    self._anotar(
                        "conexiones",
                        f"{len(conexiones)} sesiones abiertas, limite alcanzado: {_mensaje(error)}",
                    )
                    break
                self._anotar("conexiones", f"{len(conexiones)} sesiones abiertas")

            self._esperar("conexiones", fin)
        finally:
            for conexion in conexiones:
                try:
                    conexion.close()
                except oracledb.Error:
                    pass
            self._anotar("conexiones", "sesiones cerradas")


# -------------------------------------------------------------------- ayuda


def _crear_tabla_lock(cursor: oracledb.Cursor) -> None:
    _ignorar_si_existe(cursor, f"CREATE TABLE {TABLA_LOCK} (id NUMBER PRIMARY KEY, valor NUMBER)")
    cursor.execute(
        f"MERGE INTO {TABLA_LOCK} t USING (SELECT 1 id, 0 valor FROM dual) s "
        "ON (t.id = s.id) WHEN NOT MATCHED THEN INSERT (id, valor) VALUES (s.id, s.valor)"
    )


def _crear_tabla_relleno(cursor: oracledb.Cursor) -> None:
    _ignorar_si_existe(
        cursor,
        f"CREATE TABLE {TABLA_RELLENO} (relleno VARCHAR2(1000)) TABLESPACE {TABLESPACE}",
    )


def _verificar_tablespace(cursor: oracledb.Cursor) -> None:
    """El tablespace de stress lo crea el DBA en collector/sql/setup_oracle.sql.

    Antes lo creaba este codigo, pero crear un tablespace NO da cuota sobre el:
    los INSERT fallaban con ORA-01950. Darle al usuario de stress privilegios
    para arreglarse solo (ALTER USER o UNLIMITED TABLESPACE) le permitiria
    llenar cualquier tablespace, incluido SYSTEM. Es mas seguro que el DBA lo
    prepare una vez, con cuota acotada, y que aqui solo se verifique.
    """
    cursor.execute(
        "SELECT COUNT(*) FROM dba_tablespaces WHERE tablespace_name = :ts",
        ts=TABLESPACE,
    )
    fila = cursor.fetchone()
    if not fila or not fila[0]:
        raise ErrorStress(
            f"No existe el tablespace {TABLESPACE}. Ejecute "
            "collector/sql/setup_oracle.sql como SYSDBA sobre la PDB de prueba."
        )

    cursor.execute(
        "SELECT 1 FROM dba_ts_quotas WHERE tablespace_name = :ts AND username = USER",
        ts=TABLESPACE,
    )
    if cursor.fetchone() is None:
        raise ErrorStress(
            f"El usuario de stress no tiene cuota en {TABLESPACE}. Reejecute "
            "collector/sql/setup_oracle.sql como SYSDBA."
        )


def _ignorar_si_existe(cursor: oracledb.Cursor, sql: str) -> None:
    """Ejecuta un CREATE tolerando ORA-00955 (el objeto ya existe)."""
    try:
        cursor.execute(sql)
    except oracledb.Error as error:
        if _codigo(error) != 955:
            raise


def _esperar_fila(conexion: oracledb.Connection, indice: int) -> None:
    """Intenta tocar la fila bloqueada; la sesion queda esperando en v$session."""
    try:
        with conexion.cursor() as cursor:
            cursor.execute(f"UPDATE {TABLA_LOCK} SET valor = valor + 1 WHERE id = 1")
        conexion.rollback()
    except oracledb.Error as error:
        log.debug("sesion en espera %d termino: %s", indice, _mensaje(error))


def _quemar_cpu(objetivo: Objetivo, fin: float, detener: threading.Event, indice: int) -> None:
    try:
        with objetivo.conectar() as conexion, conexion.cursor() as cursor:
            while time.time() < fin and not detener.is_set():
                cursor.execute(
                    "SELECT SUM(n) FROM (SELECT LEVEL n FROM dual CONNECT BY LEVEL <= 400000)"
                )
                cursor.fetchone()
    except oracledb.Error as error:
        log.debug("sesion de cpu %d termino: %s", indice, _mensaje(error))


def _codigo(error: oracledb.Error) -> int:
    """Numero de error de Oracle (ORA-01653 -> 1653), o 0 si no aplica."""
    objeto = error.args[0] if error.args else None
    return getattr(objeto, "code", 0) or 0


def _mensaje(error: oracledb.Error) -> str:
    return str(error).strip().splitlines()[0]
