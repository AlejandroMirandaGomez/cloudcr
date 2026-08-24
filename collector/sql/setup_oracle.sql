-- ===========================================================================
-- Preparacion de la instancia Oracle para el Monitor de Salud (Fase 2).
--
-- Ejecutar como SYSDBA sobre la PDB donde vive la base de prueba:
--
--     sqlplus / as sysdba
--     SQL> ALTER SESSION SET CONTAINER = XEPDB1;
--     SQL> @collector/sql/setup_oracle.sql
--
-- Crea dos usuarios con responsabilidades separadas a proposito:
--
--   MONITOR_USER   solo lectura del catalogo. Es el que usa el collector.
--   CLOUDCR_STRESS escritura acotada. Solo lo usa el mock client para degradar
--                  la base durante la demostracion.
--
-- Cambie las contrasenas antes de ejecutarlo.
-- ===========================================================================

DEFINE monitor_pwd = 'CAMBIE_ESTA_CLAVE_1'
DEFINE stress_pwd  = 'CAMBIE_ESTA_CLAVE_2'

-- ------------------------------------------------- usuario de monitoreo
CREATE USER monitor_user IDENTIFIED BY "&monitor_pwd";

GRANT CREATE SESSION TO monitor_user;

-- SELECT_CATALOG_ROLE cubre V$SESSION, V$PROCESS, V$PARAMETER, V$SGASTAT,
-- V$PGASTAT, V$BH, V$DATAFILE, V$LOG, DBA_DATA_FILES y
-- DBA_TABLESPACE_USAGE_METRICS: las 25 variables que lee
-- collector/colectores/oracle.py. No da ningun permiso de escritura.
GRANT SELECT_CATALOG_ROLE TO monitor_user;

-- ---------------------------------------------------- usuario de stress
-- OJO: este usuario degrada la base a proposito. Crearlo unicamente en la
-- instancia de prueba, nunca en una con datos reales.
CREATE USER cloudcr_stress IDENTIFIED BY "&stress_pwd";

GRANT CREATE SESSION, CREATE TABLE TO cloudcr_stress;

-- Lee dba_tablespaces / dba_ts_quotas para verificar su propio entorno.
GRANT SELECT_CATALOG_ROLE TO cloudcr_stress;

-- ------------------------------------------- tablespace para el stress
-- Se crea aca, como DBA, y NO desde el codigo del stress. Motivo: crear un
-- tablespace no otorga cuota sobre el, asi que el stress fallaba con
-- ORA-01950. La alternativa (darle al usuario de stress ALTER USER o
-- UNLIMITED TABLESPACE para que se autoasigne cuota) le permitiria llenar
-- cualquier tablespace, incluido SYSTEM. Preparandolo aqui, el usuario de
-- stress solo puede escribir donde tiene cuota: estos 50 MB y nada mas.
--
-- AUTOEXTEND OFF es lo que acota el dano: al llenarse, Oracle devuelve
-- ORA-01653 sobre este tablespace sin tocar el resto de la instancia.
DECLARE
    v_existe NUMBER;
    v_ruta   VARCHAR2(400);
BEGIN
    SELECT COUNT(*) INTO v_existe
    FROM dba_tablespaces WHERE tablespace_name = 'CLOUDCR_STRESS_TS';

    IF v_existe = 0 THEN
        -- El datafile se coloca junto a los que ya existen, sin adivinar rutas.
        SELECT SUBSTR(file_name, 1, INSTR(file_name, '\', -1)) || 'cloudcr_stress_ts.dbf'
          INTO v_ruta
          FROM dba_data_files
         WHERE ROWNUM = 1;

        EXECUTE IMMEDIATE 'CREATE TABLESPACE CLOUDCR_STRESS_TS DATAFILE '''
                          || v_ruta || ''' SIZE 50M AUTOEXTEND OFF';
        DBMS_OUTPUT.PUT_LINE('Tablespace creado en ' || v_ruta);
    ELSE
        DBMS_OUTPUT.PUT_LINE('El tablespace CLOUDCR_STRESS_TS ya existia.');
    END IF;
END;
/

-- Cuota SOLO en el tablespace de stress. Sin cuota en ningun otro, el usuario
-- no puede escribir fuera de esos 50 MB aunque se lo pidan.
ALTER USER cloudcr_stress QUOTA UNLIMITED ON CLOUDCR_STRESS_TS;

-- La tabla de lock contention son unas pocas filas y vive en el mismo lugar.
ALTER USER cloudcr_stress DEFAULT TABLESPACE CLOUDCR_STRESS_TS;

-- ------------------------------------------------------------ verificacion
SET SERVEROUTPUT ON
DECLARE
    v_usuarios NUMBER;
    v_cuota    NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_usuarios
    FROM dba_users WHERE username IN ('MONITOR_USER', 'CLOUDCR_STRESS');

    SELECT COUNT(*) INTO v_cuota
    FROM dba_ts_quotas
    WHERE username = 'CLOUDCR_STRESS' AND tablespace_name = 'CLOUDCR_STRESS_TS';

    DBMS_OUTPUT.PUT_LINE('Usuarios creados: ' || v_usuarios || ' de 2');
    DBMS_OUTPUT.PUT_LINE('Cuota de stress:  ' || v_cuota || ' de 1');
END;
/
