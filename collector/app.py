"""API HTTP local del collector.

Solo escucha en 127.0.0.1: es la superficie que consume el agente local para
registrar bases y ver el estado de los ciclos. Nunca se expone a internet, y
por eso no lleva autenticacion propia — quien pueda hablarle ya esta dentro de
la maquina.

Las credenciales de Oracle entran por aqui (POST /bases) y se quedan aqui: al
monitor de CloudCR solo salen las mediciones.
"""

from __future__ import annotations

import logging

from flask import Flask, jsonify, request

from collector.colectores.oracle import probar_conexion
from collector.config import Config
from collector.monitor_api import MonitorAPI
from collector.recolector import Recolector
from collector.registro import ErrorRegistro, InstanciaConfig, Registro

log = logging.getLogger(__name__)

#: El agente local corre en otro puerto de la misma maquina, asi que el
#: navegador lo trata como otro origen y exige CORS.
ORIGENES_LOCALES = ("http://127.0.0.1", "http://localhost")


def crear_app(config: Config) -> Flask:
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False

    registro = Registro()
    registro.cargar()

    api = MonitorAPI(config)
    recolector = Recolector(config=config, registro=registro, api=api)
    recolector.arrancar()

    app.extensions["recolector"] = recolector
    app.extensions["registro"] = registro

    @app.after_request
    def cors(respuesta):
        origen = request.headers.get("Origin", "")
        if origen.startswith(ORIGENES_LOCALES):
            respuesta.headers["Access-Control-Allow-Origin"] = origen
            respuesta.headers["Access-Control-Allow-Headers"] = "Content-Type"
            respuesta.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        return respuesta

    @app.errorhandler(ErrorRegistro)
    def registro_invalido(error: ErrorRegistro):
        return jsonify({"error": str(error)}), 422

    # ------------------------------------------------------------- consultas

    @app.get("/salud")
    def salud():
        return jsonify(
            {
                "collector": "ok",
                "monitor_api": config.api_url,
                "intervalo_segundos": config.intervalo,
                "instancias": len(registro.listar()),
            }
        )

    @app.get("/bases")
    def listar_bases():
        return jsonify([i.publico() for i in registro.listar()])

    @app.get("/estado")
    def estado():
        return jsonify(recolector.estados())

    # ------------------------------------------------------------- registro

    @app.post("/bases")
    def registrar_base():
        datos = request.get_json(silent=True)
        if not isinstance(datos, dict):
            return jsonify({"error": "Se esperaba un cuerpo JSON."}), 400

        instancia = InstanciaConfig.desde_dict(datos)

        # Se prueba la conexion antes de guardar: es mejor que el formulario
        # avise "credenciales invalidas" a que el dashboard quede vacio sin
        # explicacion durante el demo.
        try:
            prueba = probar_conexion(instancia)
        except Exception as error:  # noqa: BLE001 - cualquier fallo del driver
            return jsonify({"error": f"No se pudo conectar a Oracle: {error}"}), 422

        registro.agregar(instancia)
        log.info("Instancia registrada: %s (%s)", instancia.nombre, instancia.dsn())

        return jsonify({"instancia": instancia.publico(), "prueba": prueba}), 201

    @app.delete("/bases/<nombre>")
    def eliminar_base(nombre: str):
        if not registro.eliminar(nombre):
            return jsonify({"error": f"No hay una instancia registrada con el nombre '{nombre}'."}), 404
        recolector.olvidar(nombre)
        return "", 204

    # ---------------------------------------------------------------- ciclo

    @app.post("/ciclo")
    def ciclo():
        """Fuerza una lectura inmediata, sin esperar el intervalo.

        La usa el agente local despues de disparar un stress, para que el
        dashboard refleje el cambio en el acto durante la demostracion.
        """
        return jsonify(recolector.ciclo_ahora())

    @app.post("/caida/<nombre>")
    def simular_caida(nombre: str):
        """Simula la caida de una instancia (demo). Deja de leerla y la reporta caida."""
        if registro.obtener(nombre) is None:
            return jsonify({"error": f"No hay una instancia registrada con el nombre '{nombre}'."}), 404
        recolector.forzar_caida(nombre, True)
        recolector.ciclo_ahora()  # refleja la caida de inmediato
        return jsonify({"nombre": nombre, "caida": True})

    @app.delete("/caida/<nombre>")
    def restaurar(nombre: str):
        """Levanta la caida simulada: el proximo ciclo vuelve a leer la instancia."""
        recolector.forzar_caida(nombre, False)
        recolector.ciclo_ahora()
        return jsonify({"nombre": nombre, "caida": False})

    return app
