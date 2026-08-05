	-- =========================================================
	-- Modelo Relacional: Cuestionario de Control Interno
	-- Motor: PostgreSQL
	-- =========================================================
	
	CREATE TYPE nivel_control AS ENUM ('P', 'S', 'N-A');
	CREATE TYPE respuesta_control AS ENUM ('Si', 'No', 'N-A');
	CREATE TYPE si_no AS ENUM ('si', 'no');
	
	-- Tablas Principales ========================================================
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
	
	CREATE TABLE Normas (
	    id SERIAL PRIMARY KEY,
	    nombre VARCHAR(150) NOT NULL UNIQUE
	);
	
	CREATE TABLE Controles (
	    id SERIAL PRIMARY KEY,
	    tipo_control VARCHAR(100) NOT NULL,
	    nombre_control VARCHAR(255) NOT NULL UNIQUE,
	    detalle TEXT,
	    integridad nivel_control NOT NULL,
	    disponibilidad nivel_control NOT NULL,
	    confidencialidad nivel_control NOT NULL
	);
	
	-- Tablas con Relacion ========================================================
	CREATE TABLE Cuestionarios_Control_Interno (
	    id SERIAL PRIMARY KEY,
	    organizacion_id INT NOT NULL,
	    evaluador_id INT NOT NULL,
	    fecha DATE NOT NULL,
	    FOREIGN KEY (organizacion_id) REFERENCES Organizaciones(id),
	    FOREIGN KEY (evaluador_id) REFERENCES Evaluadores(id)
	);
	
	-- Tablas puente (N:M)
	CREATE TABLE Controles_Normas (
	    id SERIAL PRIMARY KEY,
	    control_id INT NOT NULL,
	    norma_id INT NOT NULL,
	    FOREIGN KEY (control_id) REFERENCES Controles(id),
	    FOREIGN KEY (norma_id) REFERENCES Normas(id),
	    UNIQUE (control_id, norma_id)
	);
	
	CREATE TABLE Respuestas_Controles (
	    id SERIAL PRIMARY KEY,
	    cuestionario_id INT NOT NULL,
	    control_id INT NOT NULL,
	    respuesta respuesta_control NOT NULL,
	    documentado si_no NOT NULL,
	    repetible si_no NOT NULL,
	    evidencia si_no NOT NULL,
	    FOREIGN KEY (cuestionario_id) REFERENCES Cuestionarios_Control_Interno(id),
	    FOREIGN KEY (control_id) REFERENCES Controles(id),
	    UNIQUE (cuestionario_id, control_id)
	);