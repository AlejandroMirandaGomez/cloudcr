"""Punto de entrada del collector.

    python -m collector

Levanta el API local (127.0.0.1:COLLECTOR_PUERTO) y el loop de recoleccion.
"""

from __future__ import annotations

import logging
import sys

from collector.app import crear_app
from collector.config import Config, ErrorConfig


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    try:
        config = Config.desde_entorno()
    except ErrorConfig as error:
        print(f"Configuracion invalida: {error}", file=sys.stderr)
        return 1

    app = crear_app(config)

    print(f"Collector escuchando en http://127.0.0.1:{config.puerto}")
    print(f"Empujando a {config.api_url}/monitor/ingesta cada {config.intervalo}s")

    # use_reloader=False: con el reloader Flask arranca dos procesos y el loop
    # de recoleccion se duplicaria, mandando snapshots dobles.
    app.run(host="127.0.0.1", port=config.puerto, use_reloader=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
