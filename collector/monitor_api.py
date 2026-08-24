"""Cliente del API del monitor: empuja los snapshots a CloudCR.

Es el unico punto del collector que sale a la red hacia el monitor. Manda el
secreto compartido en la cabecera X-Collector-Token y no envia jamas las
credenciales de la base monitoreada, solo las mediciones ya tomadas.
"""

from __future__ import annotations

import logging
import time

import requests

from collector.config import Config

log = logging.getLogger(__name__)

CABECERA_TOKEN = "X-Collector-Token"

#: Codigos que no tiene sentido reintentar: el problema es la peticion misma.
SIN_REINTENTO = frozenset({400, 401, 403, 404, 422})


class ErrorEnvio(RuntimeError):
    """El snapshot no se pudo entregar al monitor."""


class MonitorAPI:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.sesion = requests.Session()
        self.sesion.headers.update(
            {
                "Content-Type": "application/json",
                "Accept": "application/json",
                CABECERA_TOKEN: config.token,
            }
        )

    def enviar(self, base_datos: dict[str, object], mediciones: dict[str, float]) -> dict:
        """POST /monitor/ingesta con reintentos ante fallos transitorios."""
        url = f"{self.config.api_url}/monitor/ingesta"
        cuerpo = {"base_datos": base_datos, "mediciones": mediciones}

        ultimo_error = "sin intentos"

        for intento in range(self.config.reintentos + 1):
            try:
                respuesta = self.sesion.post(url, json=cuerpo, timeout=self.config.timeout)
            except requests.RequestException as error:
                ultimo_error = f"no se pudo contactar el monitor: {error}"
            else:
                if respuesta.ok:
                    return respuesta.json().get("data", {})

                ultimo_error = f"HTTP {respuesta.status_code}: {_mensaje(respuesta)}"

                if respuesta.status_code in SIN_REINTENTO:
                    raise ErrorEnvio(ultimo_error)

            if intento < self.config.reintentos:
                # Espera creciente para no martillar un backend que esta caido
                # o despertando (Render duerme los servicios gratuitos).
                espera = 2 ** intento
                log.warning("Envio fallido (%s). Reintento en %ss.", ultimo_error, espera)
                time.sleep(espera)

        raise ErrorEnvio(ultimo_error)

    def marcar_caida(self, nombre: str, motivo: str) -> dict:
        """Avisa al monitor que una base no se pudo leer (POST /monitor/estado-caida)."""
        url = f"{self.config.api_url}/monitor/estado-caida"
        cuerpo = {"nombre": nombre, "caida": True, "motivo": motivo}
        respuesta = self.sesion.post(url, json=cuerpo, timeout=self.config.timeout)
        if not respuesta.ok:
            raise ErrorEnvio(f"HTTP {respuesta.status_code}: {_mensaje(respuesta)}")
        return respuesta.json().get("data", {})

    def cerrar(self) -> None:
        self.sesion.close()


def _mensaje(respuesta: requests.Response) -> str:
    """Saca el mensaje de error del formato JSON del backend."""
    try:
        cuerpo = respuesta.json()
    except ValueError:
        return respuesta.text[:200]

    error = cuerpo.get("error", {})
    mensaje = error.get("mensaje", respuesta.text[:200])
    errores = error.get("errores")

    return f"{mensaje} {errores}" if errores else mensaje
