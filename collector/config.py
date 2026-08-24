"""Configuracion del collector, leida de collector/.env o del entorno.

El entorno real gana sobre el archivo, igual que hace Config.php en el backend.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent

# override=False: si la variable ya existe en el entorno, el .env no la pisa.
load_dotenv(RAIZ / ".env", override=False)

#: Limites del intervalo. Menos de 1s satura Oracle con las consultas de v$bh;
#: mas de 5 min hace que el dashboard se vea congelado.
INTERVALO_MINIMO = 1
INTERVALO_MAXIMO = 300


class ErrorConfig(RuntimeError):
    """Falta configuracion obligatoria para arrancar el collector."""


@dataclass(frozen=True)
class Config:
    api_url: str
    token: str
    intervalo: int
    puerto: int
    reintentos: int
    timeout: float

    @staticmethod
    def desde_entorno() -> "Config":
        api_url = os.getenv("MONITOR_API_URL", "").strip().rstrip("/")
        token = os.getenv("MONITOR_COLLECTOR_TOKEN", "").strip()

        if not api_url:
            raise ErrorConfig(
                "Falta MONITOR_API_URL. Copie collector/.env.example a collector/.env "
                "y apunte a la URL del backend de CloudCR."
            )
        if not token:
            raise ErrorConfig(
                "Falta MONITOR_COLLECTOR_TOKEN. Debe ser el mismo valor configurado "
                "en el backend (variable de entorno del servicio en Render)."
            )
        if not api_url.startswith(("http://", "https://")):
            raise ErrorConfig("MONITOR_API_URL debe empezar con http:// o https://")

        # El token viaja en cada push: sobre http:// va en claro. Se permite
        # para pruebas contra un backend local, pero se avisa.
        if api_url.startswith("http://") and "localhost" not in api_url and "127.0.0.1" not in api_url:
            raise ErrorConfig(
                "MONITOR_API_URL usa http:// contra un host remoto: el token viajaria "
                "en claro. Use https:// o apunte a localhost."
            )

        return Config(
            api_url=api_url,
            token=token,
            intervalo=_entero("INTERVALO_SEGUNDOS", 5, INTERVALO_MINIMO, INTERVALO_MAXIMO),
            puerto=_entero("COLLECTOR_PUERTO", 8100, 1, 65535),
            reintentos=_entero("REINTENTOS", 2, 0, 10),
            timeout=float(_entero("TIMEOUT_SEGUNDOS", 15, 1, 120)),
        )


def _entero(nombre: str, por_defecto: int, minimo: int, maximo: int) -> int:
    crudo = os.getenv(nombre, "").strip()
    if not crudo:
        return por_defecto
    try:
        valor = int(crudo)
    except ValueError as error:
        raise ErrorConfig(f"{nombre} debe ser un numero entero, se recibio '{crudo}'.") from error
    if not minimo <= valor <= maximo:
        raise ErrorConfig(f"{nombre} debe estar entre {minimo} y {maximo}, se recibio {valor}.")
    return valor
