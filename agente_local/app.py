"""Agente Local del Monitor de Salud.

Dos responsabilidades, deliberadamente separadas segun el diseno de la Fase 2:

1. Registrar una base para monitoreo. El formulario le pega a ESTE backend,
   que reenvia los datos al collector local (POST /bases). El collector es
   quien se conecta a Oracle y quien guarda las credenciales de monitoreo.

2. Disparar el stress. Ese boton NO pasa por el collector ni por el monitor:
   le pega a este mismo backend, que ejecuta el stress directo contra Oracle
   con un usuario aparte (el de monitoreo no tiene privilegios de escritura).

No se deploya: corre solo en la maquina donde esta la base de prueba.
"""

from __future__ import annotations

import logging

import requests
from flask import Flask, jsonify, render_template, request

from agente_local.config import Config
from agente_local.stress import ErrorStress, Objetivo, Stress

log = logging.getLogger(__name__)


def crear_app(config: Config) -> Flask:
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False

    # El objetivo del stress se fija al registrar la base y vive solo en
    # memoria: si se reinicia el agente local hay que volver a registrarla.
    estado: dict[str, object] = {"stress": None, "base": None}

    @app.errorhandler(ErrorStress)
    def stress_invalido(error: ErrorStress):
        return jsonify({"error": str(error)}), 422

    def stress_actual() -> Stress:
        actual = estado.get("stress")
        if actual is None:
            raise ErrorStress(
                "Todavia no hay una base registrada con usuario de stress. "
                "Complete el formulario antes de disparar un stress."
            )
        return actual  # type: ignore[return-value]

    # ------------------------------------------------------------- pagina

    @app.get("/")
    def inicio():
        return render_template("index.html", collector_url=config.collector_url)

    # ------------------------------------------------------------ registro

    @app.post("/registrar")
    def registrar():
        datos = request.get_json(silent=True)
        if not isinstance(datos, dict):
            return jsonify({"error": "Se esperaba un cuerpo JSON."}), 400

        # 1. La base se registra en el collector con el usuario de monitoreo.
        cuerpo = {
            "nombre": datos.get("nombre"),
            "motor": datos.get("motor", "Oracle"),
            "host": datos.get("host"),
            "puerto": datos.get("puerto"),
            "servicio": datos.get("servicio"),
            "usuario": datos.get("usuario"),
            "contrasena": datos.get("contrasena"),
        }

        try:
            respuesta = requests.post(
                f"{config.collector_url}/bases", json=cuerpo, timeout=config.timeout
            )
        except requests.RequestException as error:
            return jsonify(
                {
                    "error": f"No se pudo contactar el collector en {config.collector_url}. "
                    f"Verifique que este corriendo (python -m collector). Detalle: {error}"
                }
            ), 502

        if not respuesta.ok:
            detalle = _error_de(respuesta)
            return jsonify({"error": f"El collector rechazo el registro: {detalle}"}), respuesta.status_code

        resultado = {"collector": respuesta.json(), "stress": "no configurado"}

        # El nombre se recuerda siempre (lo usa la caida simulada, que no
        # necesita usuario de stress).
        estado["base"] = datos.get("nombre")

        # 2. El usuario de stress es opcional y se queda solo aqui.
        usuario_stress = (datos.get("usuario_stress") or "").strip()
        if usuario_stress:
            objetivo = Objetivo(
                host=str(datos.get("host") or "localhost"),
                puerto=int(datos.get("puerto") or 1521),
                servicio=str(datos.get("servicio") or ""),
                usuario=usuario_stress,
                contrasena=str(datos.get("contrasena_stress") or ""),
                permitir_remoto=config.permitir_remoto,
            )
            estado["stress"] = Stress(objetivo)
            resultado["stress"] = f"listo contra {objetivo.dsn()} como {objetivo.usuario}"

        return jsonify(resultado), 201

    @app.get("/bases")
    def bases():
        """Espejo del listado del collector, para pintarlo en la pagina."""
        try:
            respuesta = requests.get(f"{config.collector_url}/bases", timeout=config.timeout)
            estados = requests.get(f"{config.collector_url}/estado", timeout=config.timeout)
        except requests.RequestException as error:
            return jsonify({"error": f"Collector no disponible: {error}"}), 502

        return jsonify({"bases": respuesta.json(), "estado": estados.json()})

    # -------------------------------------------------------------- stress

    @app.get("/stress")
    def ver_stress():
        actual = estado.get("stress")
        return jsonify(
            {
                "base": estado.get("base"),
                "configurado": actual is not None,
                "mecanismos": actual.estados() if actual else [],
            }
        )

    @app.post("/stress/<tipo>")
    def lanzar_stress(tipo: str):
        datos = request.get_json(silent=True) or {}
        resultado = stress_actual().lanzar(
            tipo,
            duracion=int(datos.get("duracion", 60)),
            intensidad=int(datos.get("intensidad", 3)),
        )
        _pedir_ciclo(config)
        return jsonify(resultado), 202

    @app.post("/stress/detener")
    def detener_stress():
        detenidos = stress_actual().detener()
        _pedir_ciclo(config)
        return jsonify({"detenidos": detenidos})

    @app.post("/stress/limpiar")
    def limpiar_stress():
        resultado = stress_actual().limpiar()
        _pedir_ciclo(config)
        return jsonify(resultado)

    # ---------------------------------------------------------- caida simulada

    @app.post("/caida")
    def simular_caida():
        """Simula que la base se cayo: el collector deja de leerla y la reporta caida."""
        nombre = estado.get("base")
        if not nombre:
            return jsonify({"error": "No hay una base registrada."}), 422
        try:
            respuesta = requests.post(
                f"{config.collector_url}/caida/{requests.utils.quote(str(nombre))}",
                timeout=config.timeout,
            )
        except requests.RequestException as error:
            return jsonify({"error": f"Collector no disponible: {error}"}), 502
        return jsonify(respuesta.json()), respuesta.status_code

    @app.post("/restaurar")
    def restaurar():
        """Levanta la caida simulada: el collector vuelve a leer la base."""
        nombre = estado.get("base")
        if not nombre:
            return jsonify({"error": "No hay una base registrada."}), 422
        try:
            respuesta = requests.delete(
                f"{config.collector_url}/caida/{requests.utils.quote(str(nombre))}",
                timeout=config.timeout,
            )
        except requests.RequestException as error:
            return jsonify({"error": f"Collector no disponible: {error}"}), 502
        return jsonify(respuesta.json()), respuesta.status_code

    return app


def _pedir_ciclo(config: Config) -> None:
    """Pide al collector un ciclo inmediato para que el dashboard refleje el cambio."""
    try:
        requests.post(f"{config.collector_url}/ciclo", timeout=config.timeout)
    except requests.RequestException as error:
        log.warning("No se pudo forzar un ciclo en el collector: %s", error)


def _error_de(respuesta: requests.Response) -> str:
    try:
        return str(respuesta.json().get("error", respuesta.text[:200]))
    except ValueError:
        return respuesta.text[:200]
