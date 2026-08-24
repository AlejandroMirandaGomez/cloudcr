"""Configuracion del agente local (agente_local/.env o entorno)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent

load_dotenv(RAIZ / ".env", override=False)


@dataclass(frozen=True)
class Config:
    collector_url: str
    puerto: int
    timeout: float
    permitir_remoto: bool

    @staticmethod
    def desde_entorno() -> "Config":
        return Config(
            collector_url=os.getenv("COLLECTOR_URL", "http://127.0.0.1:8100").rstrip("/"),
            puerto=int(os.getenv("AGENTE_LOCAL_PUERTO", "8200")),
            timeout=float(os.getenv("TIMEOUT_SEGUNDOS", "20")),
            # Salvaguarda: por defecto el stress solo corre contra una base local.
            permitir_remoto=os.getenv("PERMITIR_REMOTO", "").strip().lower()
            in ("1", "true", "yes", "si"),
        )
