SET client_encoding TO 'UTF8';

-- Estructura: tipos y tablas ================================================

CREATE TYPE nivel_relacion AS ENUM ('Primario', 'Secundario');

CREATE TYPE respuesta_pregunta AS ENUM ('Sí', 'No', 'N/A');

CREATE TABLE Normas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Dominios_Norma (
    id SERIAL PRIMARY KEY,
    clausula SMALLINT NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Tipos_Control (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE Conceptos_Ciberseguridad (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE Dominios_Seguridad (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE Capacidades_Operativas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE Controles (
    id SERIAL PRIMARY KEY,
    norma_id INT NOT NULL,
    dominio_norma_id INT NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    proposito TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    peso SMALLINT NOT NULL,
    confidencialidad nivel_relacion,
    integridad nivel_relacion,
    disponibilidad nivel_relacion,
    guia TEXT,
    otra_informacion TEXT,
    FOREIGN KEY (norma_id) REFERENCES Normas(id),
    FOREIGN KEY (dominio_norma_id) REFERENCES Dominios_Norma(id),
    CHECK (peso BETWEEN 1 AND 10),
    UNIQUE (norma_id, codigo)
);

CREATE TABLE Preguntas (
    id SERIAL PRIMARY KEY,
    control_id INT NOT NULL,
    orden SMALLINT NOT NULL,
    texto TEXT NOT NULL,
    FOREIGN KEY (control_id) REFERENCES Controles(id) ON DELETE CASCADE,
    UNIQUE (control_id, orden)
);

-- Tabla puente (N:M) entre Controles y Tipos_Control
CREATE TABLE Controles_Tipos (
    control_id INT NOT NULL,
    tipo_id INT NOT NULL,
    PRIMARY KEY (control_id, tipo_id),
    FOREIGN KEY (control_id) REFERENCES Controles(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_id) REFERENCES Tipos_Control(id)
);

-- Tabla puente (N:M) entre Controles y Conceptos_Ciberseguridad
CREATE TABLE Controles_Conceptos (
    control_id INT NOT NULL,
    concepto_id INT NOT NULL,
    PRIMARY KEY (control_id, concepto_id),
    FOREIGN KEY (control_id) REFERENCES Controles(id) ON DELETE CASCADE,
    FOREIGN KEY (concepto_id) REFERENCES Conceptos_Ciberseguridad(id)
);

-- Tabla puente (N:M) entre Controles y Dominios_Seguridad
CREATE TABLE Controles_Dominios_Seguridad (
    control_id INT NOT NULL,
    dominio_seguridad_id INT NOT NULL,
    PRIMARY KEY (control_id, dominio_seguridad_id),
    FOREIGN KEY (control_id) REFERENCES Controles(id) ON DELETE CASCADE,
    FOREIGN KEY (dominio_seguridad_id) REFERENCES Dominios_Seguridad(id)
);

-- Tabla puente (N:M) entre Controles y Capacidades_Operativas
CREATE TABLE Controles_Capacidades (
    control_id INT NOT NULL,
    capacidad_id INT NOT NULL,
    PRIMARY KEY (control_id, capacidad_id),
    FOREIGN KEY (control_id) REFERENCES Controles(id) ON DELETE CASCADE,
    FOREIGN KEY (capacidad_id) REFERENCES Capacidades_Operativas(id)
);

CREATE TABLE Organizaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Evaluadores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Cuestionarios_Control_Interno (
    id SERIAL PRIMARY KEY,
    organizacion_id INT NOT NULL,
    evaluador_id INT NOT NULL,
    fecha DATE NOT NULL,
    FOREIGN KEY (organizacion_id) REFERENCES Organizaciones(id),
    FOREIGN KEY (evaluador_id) REFERENCES Evaluadores(id)
);

CREATE TABLE Respuestas (
    id SERIAL PRIMARY KEY,
    cuestionario_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    cumple respuesta_pregunta NOT NULL,
    documentado respuesta_pregunta NOT NULL,
    repetible respuesta_pregunta NOT NULL,
    evidencia respuesta_pregunta NOT NULL,
    justificacion_no_aplica TEXT,
    FOREIGN KEY (cuestionario_id) REFERENCES Cuestionarios_Control_Interno(id),
    FOREIGN KEY (pregunta_id) REFERENCES Preguntas(id),
    UNIQUE (cuestionario_id, pregunta_id),
    -- Marcar una pregunta como no aplicable exige justificarlo; si aplica, no se guarda texto.
    CHECK (
        (cumple = 'N/A' AND justificacion_no_aplica IS NOT NULL AND btrim(justificacion_no_aplica) <> '')
        OR (cumple <> 'N/A' AND justificacion_no_aplica IS NULL)
    )
);

-- Datos: valores fijos de la norma ==========================================
-- De aqui en adelante no se crea estructura, solo se cargan filas. Son los
-- catalogos cerrados de ISO/IEC 27002:2022; los controles van en otro script.

INSERT INTO Normas (nombre) VALUES
    ('27002');

INSERT INTO Dominios_Norma (clausula, nombre) VALUES
    (5, 'Organizacionales'),
    (6, 'Personas'),
    (7, 'Físicos'),
    (8, 'Tecnológicos');

INSERT INTO Tipos_Control (nombre) VALUES
    ('Preventivo'),
    ('Detectivo'),
    ('Correctivo');

INSERT INTO Conceptos_Ciberseguridad (nombre) VALUES
    ('Identificar'),
    ('Proteger'),
    ('Detectar'),
    ('Responder'),
    ('Recuperar');

INSERT INTO Dominios_Seguridad (nombre) VALUES
    ('Gobernanza y Ecosistema'),
    ('Protección'),
    ('Defensa'),
    ('Resiliencia');

INSERT INTO Capacidades_Operativas (nombre) VALUES
    ('Gobernanza'),
    ('Gestión de activos'),
    ('Protección de la información'),
    ('Seguridad de recursos humanos'),
    ('Seguridad física'),
    ('Seguridad de sistemas y redes'),
    ('Seguridad de aplicaciones'),
    ('Configuración segura'),
    ('Gestión de identidades y accesos'),
    ('Gestión de amenazas y vulnerabilidades'),
    ('Continuidad'),
    ('Seguridad de relaciones con proveedores'),
    ('Legal y cumplimiento'),
    ('Gestión de eventos de seguridad de la información'),
    ('Aseguramiento de la seguridad de la información');
