"""Loop de recoleccion: lee Oracle cada N segundos y empuja al monitor.

Corre en un hilo aparte del servidor HTTP del collector, para que registrar una
base nueva desde el agente local no bloquee el ciclo en curso ni al reves.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from collector.colectores.base import ColectorSalud
from collector.colectores.oracle import OracleColector
from collector.config import Config
from collector.monitor_api import ErrorEnvio, MonitorAPI
from collector.registro import InstanciaConfig, Registro

log = logging.getLogger(__name__)

#: Motor -> clase de colector. Aqui se enchufaria MySQLColector/PostgresColector.
COLECTORES: dict[str, type[ColectorSalud]] = {
    "Oracle": OracleColector,
}


@dataclass
class EstadoInstancia:
    """Resultado del ultimo ciclo, para que el agente local lo muestre."""

    nombre: str
    ok: bool = False
    detalle: str = "sin ciclos todavia"
    variables: int = 0
    isbd: float | None = None
    alertas: int = 0
    momento: str | None = None

    def como_dict(self) -> dict[str, object]:
        return vars(self).copy()


@dataclass
class Recolector:
    config: Config
    registro: Registro
    api: MonitorAPI

    _colectores: dict[str, ColectorSalud] = field(default_factory=dict)
    _estados: dict[str, EstadoInstancia] = field(default_factory=dict)
    # Nombres de instancias con caida simulada desde el agente local (demo).
    _caidas_forzadas: set[str] = field(default_factory=set)
    _lock: threading.RLock = field(default_factory=threading.RLock)
    # Serializa los ciclos. El hilo de fondo y POST /ciclo pueden coincidir, y
    # una conexion de oracledb NO es segura para usarse desde dos hilos a la vez.
    _lock_ciclo: threading.Lock = field(default_factory=threading.Lock)
    _detener: threading.Event = field(default_factory=threading.Event)
    _hilo: threading.Thread | None = None

    # -- control -----------------------------------------------------------

    def arrancar(self) -> None:
        if self._hilo is not None and self._hilo.is_alive():
            return
        self._detener.clear()
        self._hilo = threading.Thread(target=self._bucle, name="recolector", daemon=True)
        self._hilo.start()
        log.info("Recolector arrancado, intervalo de %ss.", self.config.intervalo)

    def detener(self) -> None:
        self._detener.set()
        if self._hilo is not None:
            self._hilo.join(timeout=self.config.timeout + 5)
        self._cerrar_colectores()

    def ciclo_ahora(self) -> dict[str, dict[str, object]]:
        """Fuerza un ciclo inmediato. La usa el agente local tras un stress."""
        self._ciclo()
        return self.estados()

    def _ciclo(self) -> None:
        """Un ciclo completo, garantizando que no se solape con otro."""
        with self._lock_ciclo:
            self._ciclo_sin_lock()

    def estados(self) -> dict[str, dict[str, object]]:
        with self._lock:
            return {n: e.como_dict() for n, e in self._estados.items()}

    def olvidar(self, nombre: str) -> None:
        """Cierra y descarta el colector de una instancia dada de baja."""
        with self._lock:
            colector = self._colectores.pop(nombre, None)
            self._estados.pop(nombre, None)
            self._caidas_forzadas.discard(nombre)
        if colector is not None:
            colector.cerrar()

    def forzar_caida(self, nombre: str, caida: bool) -> None:
        """Simula (o levanta) la caida de una instancia, para el demo.

        Con la caida activa, el ciclo deja de leer esa instancia y reporta al
        monitor que esta caida. Al restaurar, el proximo ciclo vuelve a leerla
        y la ingesta limpia el flag. Cierra el colector para soltar la conexion.
        """
        with self._lock:
            if caida:
                self._caidas_forzadas.add(nombre)
                colector = self._colectores.pop(nombre, None)
            else:
                self._caidas_forzadas.discard(nombre)
                colector = None
        if colector is not None:
            colector.cerrar()

    # -- interno -----------------------------------------------------------

    def _bucle(self) -> None:
        while not self._detener.is_set():
            comenzo = time.monotonic()
            try:
                self._ciclo()
            except Exception:  # noqa: BLE001 - el hilo nunca debe morir
                log.exception("Error inesperado en el ciclo de recoleccion")

            # Se descuenta lo que tardo el ciclo para que el periodo real sea el
            # configurado. Leer las 25 variables toma ~2 s (v$bh es la cara), y
            # sin esto un intervalo de 3 s terminaba dando snapshots cada 5 s.
            resto = self.config.intervalo - (time.monotonic() - comenzo)
            # wait() en vez de sleep() para que detener() corte de inmediato.
            self._detener.wait(max(0.1, resto))

        self._cerrar_colectores()

    def _ciclo_sin_lock(self) -> None:
        instancias = self.registro.listar()
        if not instancias:
            return

        # Una instancia que falla no debe impedir que las demas se envien.
        for instancia in instancias:
            # Caida simulada desde el agente local: se reporta caida y no se
            # intenta leer (ver forzar_caida / restaurar).
            if instancia.nombre in self._caidas_forzadas:
                self._reportar_caida(instancia.nombre, "Caida simulada desde el agente local.")
                continue

            try:
                self._procesar(instancia)
            except Exception as error:  # noqa: BLE001
                log.warning("Instancia %s: %s", instancia.nombre, error)
                self._anotar(instancia.nombre, ok=False, detalle=str(error))
                # No pudo leerse: avisar al monitor para que la marque caida.
                self._reportar_caida(instancia.nombre, str(error))

    def _reportar_caida(self, nombre: str, motivo: str) -> None:
        try:
            self.api.marcar_caida(nombre, motivo)
        except Exception as error:  # noqa: BLE001 - avisar la caida no debe romper el ciclo
            log.warning("No se pudo reportar la caida de %s: %s", nombre, error)

    def _procesar(self, instancia: InstanciaConfig) -> None:
        colector = self._colector_de(instancia)
        mediciones = colector.leer_todo()

        if not mediciones:
            raise RuntimeError(
                "No se pudo leer ninguna variable. Revise que el usuario de monitoreo "
                "tenga SELECT_CATALOG_ROLE."
            )

        try:
            resultado = self.api.enviar(instancia.para_api(), mediciones)
        except ErrorEnvio as error:
            self._anotar(instancia.nombre, ok=False, detalle=str(error), variables=len(mediciones))
            raise

        self._anotar(
            instancia.nombre,
            ok=True,
            detalle="snapshot enviado",
            variables=len(mediciones),
            isbd=resultado.get("isbd"),
            alertas=resultado.get("alertas", 0),
        )
        log.info(
            "%s: %d variables, ISBD=%s, %s alertas",
            instancia.nombre,
            len(mediciones),
            resultado.get("isbd"),
            resultado.get("alertas", 0),
        )

    def _colector_de(self, instancia: InstanciaConfig) -> ColectorSalud:
        with self._lock:
            colector = self._colectores.get(instancia.nombre)

            # Si cambiaron los datos de conexion hay que rehacer el colector.
            if colector is not None and colector.instancia != instancia:
                colector.cerrar()
                colector = None

            if colector is None:
                clase = COLECTORES.get(instancia.motor)
                if clase is None:
                    raise RuntimeError(f"No hay colector para el motor {instancia.motor}.")
                colector = clase(instancia)
                self._colectores[instancia.nombre] = colector

            return colector

    def _anotar(self, nombre: str, **campos: object) -> None:
        with self._lock:
            estado = self._estados.setdefault(nombre, EstadoInstancia(nombre=nombre))
            for campo, valor in campos.items():
                setattr(estado, campo, valor)
            estado.momento = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S")

    def _cerrar_colectores(self) -> None:
        with self._lock:
            colectores = list(self._colectores.values())
            self._colectores.clear()
        for colector in colectores:
            colector.cerrar()
