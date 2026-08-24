"""Colector de salud para Oracle (modo thin de python-oracledb).

Modo thin: no hace falta Instant Client ni ninguna libreria nativa de Oracle,
el driver habla el protocolo directamente. Basta `pip install oracledb`.

El usuario de monitoreo necesita, como minimo:

    CREATE USER monitor_user IDENTIFIED BY <password>;
    GRANT CREATE SESSION TO monitor_user;
    GRANT SELECT_CATALOG_ROLE TO monitor_user;

Cada variable se lee con su propia consulta y su propio try: si a una le falta
un privilegio o la vista no existe en esa edicion de Oracle, se pierde solo esa
variable y el resto del ciclo sigue. El backend renormaliza los pesos sobre las
variables que si llegaron.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import oracledb

from collector.colectores.base import ColectorSalud

if TYPE_CHECKING:
    from collector.registro import InstanciaConfig

log = logging.getLogger(__name__)

BYTES_POR_GB = 1024 ** 3

# --------------------------------------------------------------------------
# Consultas. Cada entrada es (codigo, SQL). El SQL debe devolver una sola fila
# con una sola columna numerica; NULL se descarta como "no medible ahora".
# --------------------------------------------------------------------------

SQL_PROCESOS: dict[str, str] = {
    # p1 - procesos actualmente en uso.
    #      Se cuenta V$PROCESS y no V$RESOURCE_LIMIT porque esa vista no
    #      devuelve filas dentro de una PDB (probado contra Oracle XE 21c).
    "p1": "SELECT COUNT(*) FROM v$process",
    # p2 - techo configurado (parametro PROCESSES), por el mismo motivo que p1.
    "p2": """
        SELECT TO_NUMBER(value)
        FROM v$parameter
        WHERE name = 'processes'
    """,
    # p3 - sesiones abiertas (se excluyen los procesos de fondo de Oracle)
    "p3": "SELECT COUNT(*) FROM v$session WHERE type = 'USER'",
    # p4 - sesiones ejecutando trabajo en este instante
    "p4": "SELECT COUNT(*) FROM v$session WHERE type = 'USER' AND status = 'ACTIVE'",
    # p5 - sesiones conectadas sin actividad
    "p5": "SELECT COUNT(*) FROM v$session WHERE type = 'USER' AND status = 'INACTIVE'",
    # p6 - sesiones esperando por otra sesion (lock contention)
    "p6": """
        SELECT COUNT(*)
        FROM v$session
        WHERE blocking_session IS NOT NULL
    """,
    # p7 - operaciones largas todavia en curso
    "p7": """
        SELECT COUNT(*)
        FROM v$session_longops
        WHERE time_remaining > 0
    """,
    # p8 - el mayor porcentaje de consumo entre los limites de procesos y de
    #      sesiones: es el que primero hara fallar conexiones nuevas.
    "p8": """
        SELECT ROUND(GREATEST(
            100 * (SELECT COUNT(*) FROM v$process)
                / NULLIF((SELECT TO_NUMBER(value) FROM v$parameter WHERE name = 'processes'), 0),
            100 * (SELECT COUNT(*) FROM v$session)
                / NULLIF((SELECT TO_NUMBER(value) FROM v$parameter WHERE name = 'sessions'), 0)
        ), 2) FROM dual
    """,
}

SQL_MEMORIA: dict[str, str] = {
    # m1 - tamano total de la SGA en GB
    "m1": f"SELECT ROUND(SUM(value) / {BYTES_POR_GB}, 2) FROM v$sga",
    # m2 - memoria libre dentro de la SGA, como porcentaje del total.
    #      Se suma la 'free memory' de los pools (shared pool, large pool...)
    #      y NO 'Free SGA Memory Available' de V$SGAINFO: ese contador mide
    #      granulos sin repartir, que en una instancia ya arrancada vale 0
    #      siempre (medido en XE 21c) y disparaba una critica falsa constante.
    #      Esta version si se mueve: baja cuando el shared pool se presiona.
    "m2": """
        SELECT ROUND(100 * (SELECT SUM(bytes) FROM v$sgastat WHERE name = 'free memory')
                     / NULLIF((SELECT bytes FROM v$sgainfo WHERE name = 'Maximum SGA Size'), 0), 2)
        FROM dual
    """,
    # m3 - porcentaje del shared pool ocupado
    "m3": """
        SELECT ROUND(100 * (1 - SUM(CASE WHEN name = 'free memory' THEN bytes ELSE 0 END)
                                / NULLIF(SUM(bytes), 0)), 2)
        FROM v$sgastat
        WHERE pool = 'shared pool'
    """,
    # m4 - porcentaje del buffer cache ocupado (bloques no libres).
    #      Es la consulta mas cara del ciclo: recorre v$bh una vez.
    "m4": """
        SELECT ROUND(100 * (1 - SUM(CASE WHEN status = 'free' THEN 1 ELSE 0 END)
                                / NULLIF(COUNT(*), 0)), 2)
        FROM v$bh
    """,
    # m5 - objetivo de PGA configurado, en GB.
    #      Se lee de V$PARAMETER: dentro de una PDB el contador
    #      'aggregate PGA target parameter' de V$PGASTAT vale 0, asi que
    #      usarlo como denominador daba NULL en m6 y m7.
    "m5": f"""
        SELECT ROUND(TO_NUMBER(value) / {BYTES_POR_GB}, 2)
        FROM v$parameter
        WHERE name = 'pga_aggregate_target'
    """,
    # m6 - PGA en uso como porcentaje del objetivo configurado
    "m6": """
        SELECT ROUND(100 * (SELECT value FROM v$pgastat WHERE name = 'total PGA inuse')
                     / NULLIF((SELECT TO_NUMBER(value) FROM v$parameter
                               WHERE name = 'pga_aggregate_target'), 0), 2)
        FROM dual
    """,
    # m7 - pico historico de PGA como porcentaje del objetivo
    "m7": """
        SELECT ROUND(100 * (SELECT value FROM v$pgastat WHERE name = 'maximum PGA allocated')
                     / NULLIF((SELECT TO_NUMBER(value) FROM v$parameter
                               WHERE name = 'pga_aggregate_target'), 0), 2)
        FROM dual
    """,
    # m8 - veces que la PGA supero el objetivo. Oracle lo lleva como acumulado
    #      desde el arranque de la instancia, no por dia.
    "m8": """
        SELECT value
        FROM v$pgastat
        WHERE name = 'over allocation count'
    """,
    # m9 - porcentaje de operaciones de PGA resueltas en memoria
    "m9": """
        SELECT ROUND(value, 2)
        FROM v$pgastat
        WHERE name = 'cache hit percentage'
    """,
}

SQL_ARCHIVOS: dict[str, str] = {
    # a1 - datafiles disponibles
    "a1": "SELECT COUNT(*) FROM v$datafile WHERE status IN ('ONLINE', 'SYSTEM')",
    # a2 - datafiles fuera de linea
    "a2": "SELECT COUNT(*) FROM v$datafile WHERE status = 'OFFLINE'",
    # a3 - ocupacion de los datafiles contra su tamano maximo. Se usa
    #      DBA_DATA_FILES porque V$DATAFILE no expone MAXBYTES (ORA-00904).
    #      Con autoextend apagado maxbytes vale 0, de ahi el GREATEST.
    "a3": """
        SELECT ROUND(100 * SUM(bytes) / NULLIF(SUM(GREATEST(maxbytes, bytes)), 0), 2)
        FROM dba_data_files
    """,
    # a4 - espacio libre del tablespace mas apretado (peor caso, no promedio:
    #      un tablespace lleno bloquea escrituras aunque los demas sobren)
    "a4": """
        SELECT ROUND(MIN(100 - used_percent), 2)
        FROM dba_tablespace_usage_metrics
        WHERE tablespace_name NOT IN (
            SELECT tablespace_name FROM dba_tablespaces WHERE contents = 'TEMPORARY'
        )
    """,
    # a5 - ocupacion del tablespace temporal mas usado
    "a5": """
        SELECT ROUND(NVL(MAX(used_percent), 0), 2)
        FROM dba_tablespace_usage_metrics
        WHERE tablespace_name IN (
            SELECT tablespace_name FROM dba_tablespaces WHERE contents = 'TEMPORARY'
        )
    """,
    # a6 - redo logs llenos que Oracle todavia no archivo.
    #      En NOARCHIVELOG (el modo por defecto de XE) archived='NO' es lo
    #      normal en todos los grupos y no indica ningun problema, asi que la
    #      variable se reporta como 0 en vez de dar una alerta falsa.
    "a6": """
        SELECT CASE WHEN (SELECT log_mode FROM v$database) = 'ARCHIVELOG'
                    THEN (SELECT COUNT(*) FROM v$log
                          WHERE archived = 'NO' AND status NOT IN ('CURRENT', 'UNUSED'))
                    ELSE 0 END
        FROM dual
    """,
    # a7 - datafiles que requieren recuperacion
    "a7": "SELECT COUNT(*) FROM v$recover_file",
    # a8 - datafiles que el sistema operativo no puede abrir
    "a8": "SELECT COUNT(*) FROM v$datafile_header WHERE error IS NOT NULL",
}


class OracleColector(ColectorSalud):
    """Lee las 25 variables de salud de una instancia Oracle."""

    MOTOR = "Oracle"

    def __init__(self, instancia: "InstanciaConfig") -> None:
        super().__init__(instancia)
        self._conexion: oracledb.Connection | None = None

    # -- ciclo de vida ------------------------------------------------------

    def conectar(self) -> None:
        if self._conexion is not None:
            try:
                self._conexion.ping()
                return
            except oracledb.Error:
                log.info("La conexion a %s se cayo, reconectando.", self.instancia.nombre)
                self.cerrar()

        self._conexion = oracledb.connect(
            user=self.instancia.usuario,
            password=self.instancia.contrasena,
            dsn=self.instancia.dsn(),
        )
        log.info("Conectado a Oracle %s", self.instancia.dsn())

    def cerrar(self) -> None:
        if self._conexion is None:
            return
        try:
            self._conexion.close()
        except oracledb.Error:
            pass
        finally:
            self._conexion = None

    # -- lectura ------------------------------------------------------------

    def leer_procesos(self) -> dict[str, float]:
        return self._ejecutar(SQL_PROCESOS)

    def leer_memoria(self) -> dict[str, float]:
        return self._ejecutar(SQL_MEMORIA)

    def leer_archivos(self) -> dict[str, float]:
        return self._ejecutar(SQL_ARCHIVOS)

    def escalar(self, sql: str) -> Any:
        """Ejecuta una consulta de un solo valor. Devuelve None si no hay fila."""
        self.conectar()
        assert self._conexion is not None
        with self._conexion.cursor() as cursor:
            fila = cursor.execute(sql).fetchone()
        return None if fila is None else fila[0]

    # -- ayuda --------------------------------------------------------------

    def _ejecutar(self, consultas: dict[str, str]) -> dict[str, float]:
        self.conectar()
        assert self._conexion is not None  # conectar() lo garantiza

        mediciones: dict[str, float] = {}

        with self._conexion.cursor() as cursor:
            for codigo, sql in consultas.items():
                try:
                    fila = cursor.execute(sql).fetchone()
                except oracledb.Error as error:
                    # Falta de privilegio o vista inexistente: se pierde solo
                    # esta variable, no el ciclo.
                    log.warning("Variable %s no disponible: %s", codigo, _mensaje(error))
                    continue

                if fila is None or fila[0] is None:
                    continue

                mediciones[codigo] = round(float(fila[0]), 2)

        return mediciones


def _mensaje(error: oracledb.Error) -> str:
    """Primera linea del error de Oracle, sin el stack completo."""
    return str(error).strip().splitlines()[0]


TODAS_LAS_VARIABLES = frozenset(SQL_PROCESOS) | frozenset(SQL_MEMORIA) | frozenset(SQL_ARCHIVOS)


def probar_conexion(instancia: "InstanciaConfig") -> dict[str, Any]:
    """Verifica credenciales y privilegios antes de aceptar una instancia nueva.

    Devuelve la version de Oracle y que variables no se pudieron leer, para que
    el agente local avise si al usuario de monitoreo le faltan privilegios en
    vez de dejar el dashboard a medias sin explicacion.
    """
    with OracleColector(instancia) as colector:
        banner = colector.escalar("SELECT banner_full FROM v$version WHERE ROWNUM = 1")
        mediciones = colector.leer_todo()

    return {
        "conecta": True,
        "version": banner,
        "variables_leidas": len(mediciones),
        "variables_faltantes": sorted(TODAS_LAS_VARIABLES - set(mediciones)),
    }
