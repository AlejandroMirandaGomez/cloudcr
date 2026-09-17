FROM python:3.12-slim

WORKDIR /app

COPY collector/requirements.txt collector-requirements.txt
COPY agente_local/requirements.txt agente-requirements.txt
RUN pip install --no-cache-dir -r collector-requirements.txt -r agente-requirements.txt

COPY collector collector
COPY agente_local agente_local
