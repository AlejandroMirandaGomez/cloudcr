"""Interfaz comun de los colectores de salud.

El monitor de CloudCR razona siempre sobre los mismos codigos de variable
(p1..p8 procesos, m1..m9 memoria, a1..a8 archivos) definidos en la tabla
Monitor_Variables. Esta clase fija ese contrato para que agregar un motor
nuevo sea escribir una subclase, sin tocar el backend ni el dashboard.

Hoy la unica implementacion real es OracleColector. Para MySQL o PostgreSQL
habria que subclasear y traducir las mismas variables a sus propias fuentes:

    variable            Oracle                  PostgreSQL (equivalente)
    ------------------  ----------------------  ------------------------------
    p3 sesiones         V$SESSION               pg_stat_activity
    p6 bloqueadas       V$SESSION.blocking_...  pg_locks (granted = false)
    m4 buffer cache     V$BH                    pg_buffercache
    a3 datafiles        V$DATAFILE              pg_database_size / pg_tablespace
    a4 tablespaces      DBA_TABLESPACE_USAGE    pg_tablespace + disco

Las variables que un motor no pueda medir simplemente no se devuelven: el
backend renormaliza los pesos sobre las que si llegaron, con la unica
condicion de que cada componente traiga al menos una variable con umbrales.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # solo para anotaciones, evita el import circular en runtime
    from collector.registro import InstanciaConfig

log = logging.getLogger(__name__)


class ColectorSalud(ABC):
    """Lee las variables de salud de una instancia y las devuelve por codigo."""

    #: Nombre del motor tal como lo espera el API (Oracle, PostgreSQL, ...).
    MOTOR: str = "Desconocido"

    def __init__(self, instancia: "InstanciaConfig") -> None:
        self.instancia = instancia

    # -- ciclo de vida ------------------------------------------------------

    @abstractmethod
    def conectar(self) -> None:
        """Abre la conexion. Debe poder llamarse varias veces sin duplicarla."""

    @abstractmethod
    def cerrar(self) -> None:
        """Cierra la conexion si estaba abierta. No debe lanzar."""

    # -- lectura por componente --------------------------------------------

    @abstractmethod
    def leer_procesos(self) -> dict[str, float]:
        """Variables p1..p8: procesos, sesiones, bloqueos, uso de limites."""

    @abstractmethod
    def leer_memoria(self) -> dict[str, float]:
        """Variables m1..m9: SGA y PGA (o sus equivalentes en otro motor)."""

    @abstractmethod
    def leer_archivos(self) -> dict[str, float]:
        """Variables a1..a8: datafiles, tablespaces, temporales y redo logs."""

    # -- lectura completa ---------------------------------------------------

    def leer_todo(self) -> dict[str, float]:
        """Junta los tres componentes en un solo diccionario de mediciones.

        Si un componente falla entero (permisos, vista inexistente en esa
        edicion del motor) se registra el error y se sigue con los demas, en
        vez de perder el ciclo completo.
        """
        mediciones: dict[str, float] = {}

        for nombre, leer in (
            ("procesos", self.leer_procesos),
            ("memoria", self.leer_memoria),
            ("archivos", self.leer_archivos),
        ):
            try:
                mediciones.update(leer())
            except Exception as error:  # noqa: BLE001 - un componente no tumba el ciclo
                log.warning("No se pudo leer el componente %s: %s", nombre, error)

        return mediciones

    def __enter__(self) -> "ColectorSalud":
        self.conectar()
        return self

    def __exit__(self, *_excepcion: object) -> None:
        self.cerrar()
