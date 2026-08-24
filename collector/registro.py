"""Registro local de las instancias que el collector debe monitorear.

Las credenciales de la base monitoreada viven SOLO aqui, en la maquina que
corre el collector. Al monitor de CloudCR se le envian unicamente las metricas
ya calculadas: nunca el usuario ni la contrasena de Oracle.

El archivo se guarda en collector/instancia/bases.json, que esta en .gitignore.
Es texto plano: sirve para un demo academico en una maquina local, no para un
entorno real. Para produccion habria que usar el almacen de secretos del
sistema operativo o pedir la contrasena en cada arranque.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

ARCHIVO = Path(__file__).resolve().parent / "instancia" / "bases.json"

MOTORES_SOPORTADOS = ("Oracle",)


class ErrorRegistro(ValueError):
    """Datos invalidos al registrar una instancia."""


@dataclass(frozen=True)
class InstanciaConfig:
    """Datos de conexion de una base monitoreada."""

    nombre: str
    host: str
    puerto: int
    servicio: str
    usuario: str
    contrasena: str
    motor: str = "Oracle"

    def dsn(self) -> str:
        """Easy Connect: host:puerto/servicio."""
        return f"{self.host}:{self.puerto}/{self.servicio}"

    def publico(self) -> dict[str, object]:
        """Vista sin credenciales, la unica que sale del collector."""
        return {
            "nombre": self.nombre,
            "motor": self.motor,
            "host": self.host,
            "puerto": self.puerto,
            "servicio": self.servicio,
            "usuario": self.usuario,
        }

    def para_api(self) -> dict[str, object]:
        """Identificacion que se envia al monitor junto con las mediciones."""
        return {
            "nombre": self.nombre,
            "motor": self.motor,
            "host": self.host,
            "puerto": self.puerto,
            "servicio": self.servicio,
        }

    @staticmethod
    def desde_dict(datos: dict[str, object]) -> "InstanciaConfig":
        """Valida y normaliza lo que llega del formulario del agente local."""

        def texto(campo: str, maximo: int, obligatorio: bool = True) -> str:
            valor = datos.get(campo)
            if not isinstance(valor, str) or not valor.strip():
                if obligatorio:
                    raise ErrorRegistro(f"El campo '{campo}' es obligatorio.")
                return ""
            valor = valor.strip()
            if len(valor) > maximo:
                raise ErrorRegistro(f"El campo '{campo}' no debe exceder {maximo} caracteres.")
            return valor

        motor = texto("motor", 30, obligatorio=False) or "Oracle"
        if motor not in MOTORES_SOPORTADOS:
            raise ErrorRegistro(
                f"Motor '{motor}' no soportado por el collector. Solo: {', '.join(MOTORES_SOPORTADOS)}."
            )

        puerto_bruto = datos.get("puerto", 1521)
        try:
            puerto = int(puerto_bruto)
        except (TypeError, ValueError) as error:
            raise ErrorRegistro("El puerto debe ser un numero entero.") from error
        if not 1 <= puerto <= 65535:
            raise ErrorRegistro("El puerto debe estar entre 1 y 65535.")

        return InstanciaConfig(
            nombre=texto("nombre", 100),
            host=texto("host", 150),
            puerto=puerto,
            servicio=texto("servicio", 100),
            usuario=texto("usuario", 100),
            contrasena=texto("contrasena", 200),
            motor=motor,
        )


@dataclass
class Registro:
    """Coleccion de instancias registradas, persistida en disco.

    El loop de recoleccion corre en un hilo aparte del servidor HTTP, por eso
    todo acceso pasa por el lock.
    """

    archivo: Path = ARCHIVO
    _instancias: dict[str, InstanciaConfig] = field(default_factory=dict)
    _lock: threading.RLock = field(default_factory=threading.RLock)

    def cargar(self) -> None:
        if not self.archivo.exists():
            log.info("No hay instancias registradas todavia (%s).", self.archivo)
            return

        try:
            crudo = json.loads(self.archivo.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            log.error("No se pudo leer %s: %s", self.archivo, error)
            return

        with self._lock:
            self._instancias = {}
            for datos in crudo:
                try:
                    instancia = InstanciaConfig.desde_dict(datos)
                except ErrorRegistro as error:
                    log.error("Instancia guardada invalida, se omite: %s", error)
                    continue
                self._instancias[instancia.nombre] = instancia

        log.info("Cargadas %d instancias de %s", len(self._instancias), self.archivo)

    def guardar(self) -> None:
        with self._lock:
            datos = [vars(i) for i in self._instancias.values()]

        self.archivo.parent.mkdir(parents=True, exist_ok=True)
        # Escritura atomica: si el proceso muere a medias no queda un JSON roto.
        temporal = self.archivo.with_suffix(".json.tmp")
        temporal.write_text(json.dumps(datos, indent=2, ensure_ascii=False), encoding="utf-8")
        temporal.replace(self.archivo)

    def agregar(self, instancia: InstanciaConfig) -> None:
        with self._lock:
            self._instancias[instancia.nombre] = instancia
        self.guardar()

    def eliminar(self, nombre: str) -> bool:
        with self._lock:
            existia = self._instancias.pop(nombre, None) is not None
        if existia:
            self.guardar()
        return existia

    def obtener(self, nombre: str) -> InstanciaConfig | None:
        with self._lock:
            return self._instancias.get(nombre)

    def listar(self) -> list[InstanciaConfig]:
        with self._lock:
            return list(self._instancias.values())
