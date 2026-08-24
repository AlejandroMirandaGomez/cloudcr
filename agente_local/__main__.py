"""Punto de entrada del agente local.

    python -m agente_local

Sirve la pagina en http://127.0.0.1:8200. Requiere que el collector este
corriendo (python -m collector) para poder registrar bases.
"""

from __future__ import annotations

import logging

from agente_local.app import crear_app
from agente_local.config import Config


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    config = Config.desde_entorno()
    app = crear_app(config)

    print(f"Agente local en http://127.0.0.1:{config.puerto}")
    print(f"Collector esperado en {config.collector_url}")
    if config.permitir_remoto:
        print("AVISO: PERMITIR_REMOTO esta activo, el stress puede correr contra un host remoto.")

    app.run(host="127.0.0.1", port=config.puerto, use_reloader=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
