SET client_encoding TO 'UTF8';

BEGIN;

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.2',
    'Derechos de acceso privilegiado',
    'Garantizar que solo los usuarios, componentes y servicios autorizados reciban derechos de acceso privilegiado.',
    'La asignación y el uso de derechos de acceso privilegiado deben restringirse y gestionarse.',
    9,
    'Primario',
    'Primario',
    'Secundario',
    'La asignación de derechos de acceso privilegiado debe controlarse mediante un proceso de autorización formal, conforme a la política específica de control de acceso.
Identificar qué usuarios necesitan derechos privilegiados en cada sistema o proceso (sistemas operativos, gestores de bases de datos, aplicaciones).
Asignar los privilegios caso por caso, solo a personas con la competencia necesaria y limitados al mínimo que exija su rol funcional.
Definir quién puede aprobar los derechos privilegiados y no otorgarlos hasta que el proceso de autorización se haya completado; mantener un registro de todos los privilegios asignados.
Definir requisitos de expiración para estos derechos y otorgar acceso privilegiado temporal solo durante el tiempo necesario para ejecutar cambios o actividades aprobadas, en lugar de concederlo de forma permanente; este procedimiento se conoce como "rotura de cristal" y suele automatizarse con tecnologías de gestión de acceso privilegiado (PAM).
Asegurar que los usuarios sepan cuándo están operando en modo privilegiado, mediante identidades de usuario específicas, configuraciones de interfaz o equipos dedicados.
Los requisitos de autenticación para el acceso privilegiado pueden ser más altos que los del acceso normal, exigiendo reautenticación o autenticación reforzada antes de trabajar con estos derechos.
Revisar periódicamente, y tras cualquier cambio organizacional, si los deberes, roles, responsabilidades y competencia de los usuarios privilegiados siguen justificando esos derechos.
Establecer reglas para evitar el uso de identidades genéricas de administración (como "root"), según las capacidades de configuración de cada sistema, y gestionar y proteger su información de autenticación.
Registrar todos los accesos privilegiados a los sistemas con fines de auditoría.
Asignar a cada persona su propia identidad privilegiada, sin compartirla ni vincularla a varios usuarios —aunque pueden agruparse, por ejemplo en un grupo de administradores, para simplificar la gestión— y usarla únicamente para tareas administrativas: para actividades cotidianas como correo o navegación web cada usuario debe contar con una identidad de red normal e independiente.',
    'Los derechos privilegiados se otorgan a una identidad, rol o proceso para realizar actividades vedadas a los usuarios típicos; los administradores de sistema normalmente los requieren.
Su uso inapropiado —anular controles del sistema o de la aplicación— es un factor importante de fallas y violaciones de seguridad.
ISO/IEC 29146 amplía lo relativo a gestión de acceso.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.2'), 1, '¿La asignación de derechos de acceso privilegiado se realiza mediante un proceso de autorización formal, con aprobadores definidos, otorgando solo el mínimo que exige el rol funcional, y queda constancia en un registro central y actualizado de todos los privilegios asignados —incluidas cuentas de servicio, de aplicación y de terceros o proveedores?'),
    ((SELECT id FROM Controles WHERE codigo = '8.2'), 2, '¿Cada usuario privilegiado cuenta con una identidad propia y no compartida, distinta de la que usa para actividades cotidianas como correo o navegación, evitando el uso de identidades genéricas de administración (root, sa, sys, postgres), y su acceso exige requisitos de autenticación más estrictos que los del acceso normal (MFA o reautenticación)?'),
    ((SELECT id FROM Controles WHERE codigo = '8.2'), 3, '¿Los derechos privilegiados se otorgan de forma temporal y con expiración, solo durante el tiempo necesario para la actividad aprobada (esquema de "rotura de cristal" o herramienta PAM), y se revisan periódicamente y tras cambios de rol, salidas de personal o cambios organizacionales, revocándolos cuando ya no se justifican, con evidencia de dichas revisiones?'),
    ((SELECT id FROM Controles WHERE codigo = '8.2'), 4, '¿Se registran todos los accesos y actividades privilegiadas con fines de auditoría —identificando usuario, fecha, origen y acción ejecutada— en registros protegidos que el propio administrador no puede alterar ni eliminar?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.2'), id FROM Tipos_Control WHERE nombre IN ('Preventivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.2'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.2'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.2'), id FROM Capacidades_Operativas WHERE nombre IN ('Gestión de identidades y accesos');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.5',
    'Autenticación segura',
    'Garantizar que un usuario o entidad se autentique de forma segura al otorgarle acceso a sistemas, aplicaciones y servicios.',
    'Las tecnologías y procedimientos de autenticación segura deben implementarse en función de las restricciones de acceso a la información y la política temática de control de acceso.',
    9,
    'Primario',
    'Primario',
    'Secundario',
    'Elegir una técnica de autenticación adecuada para corroborar la identidad de un usuario, software, mensajes u otras entidades, con una fuerza acorde a la clasificación de la información a la que se accede.
Usar alternativas a las contraseñas, como certificados digitales, tarjetas inteligentes, tokens o medios biométricos, según el nivel de seguridad requerido.
Exigir autenticación multifactor para acceder a sistemas de información crítica, combinando factores como lo que el usuario sabe, tiene y es; esta combinación se puede exigir en circunstancias específicas, como acceso desde ubicación, dispositivo u horario inusuales.
Invalidar la información de autenticación biométrica si se ve comprometida, y acompañarla siempre de al menos una técnica alternativa, dado que puede no estar disponible en ciertas condiciones de uso.
Diseñar el procedimiento de inicio de sesión para minimizar el riesgo de acceso no autorizado, sin mostrar información confidencial del sistema hasta completarlo con éxito, y exhibiendo un aviso general de que el acceso es solo para usuarios autorizados.
No dar mensajes de ayuda durante el inicio de sesión que puedan asistir a un usuario no autorizado, y validar los datos de entrada solo una vez completados en su totalidad.
Proteger contra intentos de inicio de sesión por fuerza bruta (por ejemplo, CAPTCHA, restablecimiento de contraseña o bloqueo tras cierto número de intentos fallidos), registrando los intentos fallidos y exitosos.
Generar un evento de seguridad ante un intento potencial o una violación exitosa de los controles de inicio de sesión, por ejemplo alertando al usuario y a los administradores al alcanzar cierto número de intentos incorrectos.
Mostrar o enviar por un canal separado, al completar un inicio de sesión exitoso, la fecha y hora del inicio de sesión exitoso anterior y los detalles de cualquier intento fallido desde entonces.
No mostrar la contraseña en texto claro al ingresarla, salvo excepciones necesarias (por ejemplo, por accesibilidad), y no transmitirla en texto claro por la red para evitar su captura mediante programas "sniffer".
Finalizar las sesiones inactivas tras un período definido, especialmente en ubicaciones de alto riesgo como áreas públicas o externas, y restringir la duración de la conexión en aplicaciones de alto riesgo para reducir la ventana de acceso no autorizado.',
    'ISO/IEC 29115 ofrece información adicional sobre la garantía de autenticación de entidades.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.5'), 1, '¿La forma de comprobar la identidad de los usuarios es acorde a lo sensible de la información a la que acceden, y se exige más de un factor (contraseña más código, token, tarjeta o huella) para entrar a los sistemas críticos como la base de datos?'),
    ((SELECT id FROM Controles WHERE codigo = '8.5'), 2, '¿El sistema frena o bloquea los intentos de adivinar contraseñas después de varios fallos, guarda registro de los intentos fallidos y de los exitosos, y avisa al usuario o al administrador cuando algo parece un ataque?'),
    ((SELECT id FROM Controles WHERE codigo = '8.5'), 3, '¿La pantalla de inicio de sesión evita dar pistas a quien intenta entrar sin permiso (no muestra datos del sistema ni indica cuál dato estuvo mal) y advierte que el acceso es solo para personas autorizadas?'),
    ((SELECT id FROM Controles WHERE codigo = '8.5'), 4, '¿Las contraseñas nunca se muestran en pantalla al escribirlas ni viajan por la red sin cifrar, y las sesiones que quedan inactivas se cierran solas después de un tiempo definido?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.5'), id FROM Tipos_Control WHERE nombre IN ('Preventivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.5'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.5'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.5'), id FROM Capacidades_Operativas WHERE nombre IN ('Gestión de identidades y accesos');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.13',
    'Copia de seguridad de la información',
    'Permitir la recuperación ante la pérdida de datos o sistemas.',
    'Deben mantenerse y probarse regularmente copias de respaldo de la información, el software y los sistemas conforme a la política temática de respaldo acordada.',
    9,
    NULL,
    'Primario',
    'Primario',
    'Establecer una política de respaldo específica del tema que aborde los requisitos de seguridad de la información y de retención de datos, y proporcionar instalaciones adecuadas para garantizar que toda la información y el software esenciales se puedan recuperar tras un incidente, falla o pérdida de medios de almacenamiento.
Desarrollar e implementar planes de respaldo que produzcan registros precisos y completos de las copias de seguridad y procedimientos de restauración documentados.
Reflejar en el plan los requisitos comerciales (por ejemplo, el objetivo del punto de recuperación), los requisitos de seguridad de la información y la criticidad de esta, definiendo el alcance (completa o diferencial) y la frecuencia de las copias.
Almacenar las copias de seguridad en una ubicación remota segura, a distancia suficiente de un posible desastre en el sitio principal, con un nivel de protección física y ambiental acorde a los estándares del sitio principal.
Probar regularmente los medios de respaldo, incluyendo la capacidad de restaurar datos en un sistema de prueba sin sobrescribir los medios originales, para evitar daños o pérdidas irreparables si el proceso falla.
Proteger las copias de seguridad mediante cifrado según los riesgos identificados, y asegurarse de detectar cualquier pérdida inadvertida de datos antes de realizar la copia.
Monitorear la ejecución de las copias de seguridad y abordar las fallas de las copias programadas, para garantizar su integridad conforme a la política específica del tema.
Probar regularmente las medidas de respaldo de cada sistema o servicio para verificar que cumplan los objetivos de los planes de respuesta a incidentes y continuidad del negocio, combinando esta prueba con la de los procedimientos de restauración y comparándola con el tiempo de restauración requerido.
Para sistemas y servicios críticos, cubrir con las medidas de respaldo toda la información de sistemas, aplicaciones y datos necesaria para recuperar el sistema completo ante un desastre.
Al usar un servicio en la nube, realizar copias de seguridad de la información, aplicaciones y sistemas en ese entorno, y determinar si los requisitos de respaldo se cumplen cuando se usa el servicio de copia de seguridad ofrecido por el proveedor.
Determinar el período de retención de la información comercial esencial, considerando los requisitos de conservación de copias de archivo, y considerar la eliminación de la información de los medios de respaldo al expirar dicho período, conforme a la legislación aplicable.',
    'ISO/IEC 27040 amplía lo relativo a la seguridad del almacenamiento, incluida la retención.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.13'), 1, '¿Se respaldan los datos, el software y la configuración de los sistemas con un alcance, una frecuencia y un plazo de conservación definidos, incluidas las bases de datos que están en la nube?'),
    ((SELECT id FROM Controles WHERE codigo = '8.13'), 2, '¿Se prueba con regularidad que las copias realmente se pueden restaurar, haciendo la prueba en un equipo aparte para no dañar los datos reales, y queda constancia del resultado y del tiempo que tomó recuperarlos?'),
    ((SELECT id FROM Controles WHERE codigo = '8.13'), 3, '¿Se guarda al menos una copia en un sitio distinto y alejado del principal, con protección física equivalente y con la información cifrada?'),
    ((SELECT id FROM Controles WHERE codigo = '8.13'), 4, '¿Alguien vigila que los respaldos programados se ejecuten, corrige los que fallan y sabe cómo restaurar la información cuando hace falta?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.13'), id FROM Tipos_Control WHERE nombre IN ('Correctivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.13'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Recuperar');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.13'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.13'), id FROM Capacidades_Operativas WHERE nombre IN ('Continuidad');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.24',
    'Uso de criptografía',
    'Garantizar el uso adecuado y eficaz de la criptografía para proteger la confidencialidad, la autenticidad o la integridad de la información según los requisitos del negocio y de seguridad.',
    'Deben definirse e implementarse reglas para el uso eficaz de la criptografía, incluida la gestión de las claves criptográficas.',
    8,
    'Primario',
    'Primario',
    'Secundario',
    'Definir una política específica sobre el uso de la criptografía, con los principios generales para la protección de la información, que maximice sus beneficios y minimice los riesgos de un uso inapropiado o incorrecto.
Identificar el nivel de protección requerido según la clasificación de la información, y establecer en consecuencia el tipo, la fortaleza y la calidad de los algoritmos criptográficos necesarios.
Usar criptografía para proteger la información en dispositivos móviles o medios de almacenamiento de los usuarios y al transmitirla por redes hacia esos dispositivos o medios.
Definir el enfoque de gestión de claves, incluidos los métodos para generar y proteger las claves criptográficas y para recuperar información cifrada en caso de pérdida, compromiso o daño de las claves.
Asignar roles y responsabilidades para implementar las reglas de uso efectivo de la criptografía y para la gestión de claves, incluida su generación.
Definir los estándares, algoritmos, fortaleza de cifrado, soluciones y prácticas de uso aprobados o requeridos en la organización, considerando el impacto de la información cifrada sobre controles basados en inspección de contenido (por ejemplo, detección de malware o filtrado de contenido).
Considerar las regulaciones y restricciones nacionales aplicables al uso de técnicas criptográficas en distintas partes del mundo, así como los problemas del flujo transfronterizo de información cifrada; cubrir en los acuerdos con proveedores externos de servicios criptográficos (por ejemplo, una autoridad de certificación) la responsabilidad, confiabilidad y tiempos de respuesta del servicio.
Basar la gestión de claves en un conjunto acordado de normas, procedimientos y métodos seguros para generar, distribuir, almacenar, cambiar, recuperar, respaldar y destruir claves, así como para emitir y obtener certificados de clave pública.
Definir cómo tratar claves comprometidas, cómo revocarlas o retirarlas (incluso cuando un usuario deja la organización, en cuyo caso también deben archivarse), y cómo recuperar claves perdidas o dañadas.
Registrar y auditar las actividades relacionadas con la gestión de claves, y establecer fechas de activación y desactivación para que cada clave se use solo durante el período permitido según las reglas de administración de claves.
Definir el procedimiento para atender solicitudes legales de acceso a claves criptográficas, por ejemplo cuando se exige presentar información cifrada como prueba en un caso judicial.
Proteger todas las claves criptográficas contra modificación y pérdida, y en especial las claves secretas y privadas contra uso no autorizado y divulgación; proteger físicamente el equipo usado para generarlas, almacenarlas y archivarlas, y considerar también la autenticidad de las claves públicas.',
    'La autenticidad de las claves públicas suele abordarse mediante autoridades de certificación y certificados de clave pública, aunque también puede lograrse con procesos manuales para conjuntos pequeños de claves.
La criptografía sirve para distintos objetivos: confidencialidad (cifrado de información sensible), integridad o autenticidad (firmas digitales o códigos de autenticación de mensajes), no repudio (evidencia de que ocurrió o no un evento) y autenticación de usuarios y entidades.
ISO/IEC 11770 amplía lo relativo a la gestión de claves.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.24'), 1, '¿Está definido qué información debe cifrarse y con qué algoritmos y fortaleza, y se aplica a los datos sensibles de la base de datos tanto cuando están guardados como cuando viajan por la red?'),
    ((SELECT id FROM Controles WHERE codigo = '8.24'), 2, '¿Está definido quién genera, guarda, cambia y destruye las claves de cifrado, y esas claves se conservan protegidas y separadas de los datos que cifran?'),
    ((SELECT id FROM Controles WHERE codigo = '8.24'), 3, '¿Se reemplazan o anulan las claves cuando se pierden, se dañan, quedan expuestas o la persona que las manejaba deja la organización, asegurando que la información cifrada se pueda seguir recuperando?'),
    ((SELECT id FROM Controles WHERE codigo = '8.24'), 4, '¿Se registran las acciones hechas sobre las claves (creación, cambio, respaldo y eliminación) y cada clave tiene definido desde cuándo y hasta cuándo puede usarse?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.24'), id FROM Tipos_Control WHERE nombre IN ('Preventivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.24'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.24'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.24'), id FROM Capacidades_Operativas WHERE nombre IN ('Configuración segura');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.15',
    'Registro',
    'Registrar eventos, generar evidencia, garantizar la integridad de los registros, prevenir el acceso no autorizado, identificar eventos que puedan conducir a incidentes y respaldar investigaciones.',
    'Deben generarse, almacenarse, protegerse y analizarse registros de actividades, excepciones, fallas y otros eventos relevantes.',
    8,
    'Secundario',
    'Secundario',
    'Secundario',
    'Determinar el propósito para el que se crean los registros, qué datos se recopilan y los requisitos específicos para proteger y manejar esos datos, documentándolo en una política específica del tema sobre registro.
Incluir en cada registro de evento, según corresponda: identificación del usuario, actividades del sistema, fecha y hora del evento, identidad del dispositivo o sistema y su ubicación, y direcciones de red y protocolos.
Registrar eventos como intentos de acceso exitosos y rechazados (al sistema y a los recursos), cambios en la configuración del sistema, uso de privilegios y de programas de utilidad, archivos accedidos y tipo de acceso (incluida su eliminación), alarmas del control de acceso, activación y desactivación de sistemas de seguridad, creación/modificación/eliminación de identidades, y transacciones ejecutadas por los usuarios en las aplicaciones.
Sincronizar las fuentes de tiempo de todos los sistemas, para poder correlacionar registros entre sistemas al analizar, alertar o investigar un incidente.
No permitir que los usuarios, incluidos los de acceso privilegiado, eliminen o desactiven los registros de sus propias actividades, protegiéndolos y revisándolos para preservar su responsabilidad.
Proteger los registros contra alteraciones en los tipos de mensaje registrados, edición o eliminación de archivos de registro, y fallas o sobrescritura por falta de espacio de almacenamiento; considerar técnicas como hashing criptográfico, registro de solo lectura y solo agregar, o archivos de transparencia pública.
Archivar los registros de auditoría cuando lo exijan los requisitos de retención de datos o de conservación de evidencia.
Anonimizar los registros mediante técnicas de enmascaramiento antes de enviarlos a un proveedor para depuración o resolución de errores, y aplicar medidas de protección de la privacidad dado que pueden contener datos confidenciales o de identificación personal.
Analizar e interpretar los eventos de seguridad de la información para identificar actividades inusuales o comportamientos anómalos que puedan indicar un compromiso, considerando las habilidades necesarias de los analistas, el procedimiento de análisis, los atributos requeridos de cada evento, las reglas predeterminadas (SIEM, cortafuegos, IDS, firmas de malware), los patrones de comportamiento conocidos frente a los anómalos (UEBA), el análisis de tendencias y la inteligencia de amenazas disponible.
Respaldar el análisis con actividades de monitoreo específicas: revisar intentos de acceso a recursos protegidos, verificar registros DNS en busca de conexiones a servidores maliciosos, examinar informes de uso de proveedores de servicios, incluir registros de monitoreo físico, y correlacionar registros para un análisis más eficiente y preciso.
Identificar los incidentes de seguridad presuntos o reales y someterlos a mayor investigación, como parte del proceso de gestión de incidentes.',
    'Los registros del sistema suelen contener gran volumen de información ajena a la seguridad; herramientas de auditoría o SIEM ayudan a identificar eventos significativos, correlacionar y normalizar la información y generar alertas, aunque requieren configuración cuidadosa (fuentes de registro, reglas, casos de uso).
Los archivos de transparencia pública (usados por ejemplo en sistemas de transparencia de certificados) son un mecanismo adicional de detección contra la manipulación de registros.
En entornos en la nube, la responsabilidad de la gestión de registros se comparte entre cliente y proveedor según el tipo de servicio; ISO/IEC 27017 amplía este tema.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.15'), 1, '¿La base de datos y sus sistemas de apoyo guardan registros de los eventos importantes (entradas exitosas y rechazadas, uso de permisos de administrador, cambios de configuración, creación o borrado de usuarios, accesos a los datos y fallas o errores del sistema), indicando quién, qué, cuándo y desde dónde?'),
    ((SELECT id FROM Controles WHERE codigo = '8.15'), 2, '¿Esos registros están protegidos para que nadie, ni siquiera un administrador, pueda editarlos o borrarlos, con espacio suficiente para que no se sobrescriban antes de tiempo y con un plazo definido de conservación?'),
    ((SELECT id FROM Controles WHERE codigo = '8.15'), 3, '¿Todos los equipos y sistemas tienen la hora sincronizada, de manera que los registros de distintos sistemas se puedan comparar entre sí al investigar un hecho?'),
    ((SELECT id FROM Controles WHERE codigo = '8.15'), 4, '¿Alguien revisa o analiza esos registros con regularidad, de forma manual o con una herramienta que los reúne y genera alertas (SIEM), para detectar comportamientos raros y tratarlos como incidentes cuando corresponde?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.15'), id FROM Tipos_Control WHERE nombre IN ('Detectivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.15'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Detectar');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.15'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección', 'Defensa');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.15'), id FROM Capacidades_Operativas WHERE nombre IN ('Gestión de eventos de seguridad de la información');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.32',
    'Gestión de cambios',
    'Preservar la seguridad de la información al ejecutar cambios.',
    'Los cambios en las instalaciones de procesamiento de información y en los sistemas de información deben estar sujetos a procedimientos de gestión de cambios.',
    8,
    'Secundario',
    'Primario',
    'Secundario',
    'Seguir reglas acordadas y un proceso formal de documentación, especificación, prueba, control de calidad e implementación administrada para la introducción de nuevos sistemas y cambios importantes en los existentes.
Establecer responsabilidades y procedimientos de gestión que garanticen un control satisfactorio de todos los cambios, documentando y aplicando los procedimientos de control durante todo el ciclo de vida del sistema, desde el diseño hasta el mantenimiento posterior.
Integrar, siempre que sea factible, los procedimientos de control de cambios para la infraestructura y el software de las TIC.
Planificar y evaluar el impacto potencial de cada cambio, considerando todas sus dependencias, y someterlo a autorización antes de implementarlo.
Comunicar los cambios a las partes interesadas relevantes.
Probar los cambios y obtener la aceptación de las pruebas antes de su implementación.
Implementar los cambios siguiendo planes de implementación definidos, considerando situaciones de emergencia y contingencia, incluidos los procedimientos de respaldo.
Mantener registros de cada cambio que incluyan la planificación, autorización, pruebas e implementación realizadas.
Asegurar que la documentación operativa y los procedimientos de usuario se actualicen según sea necesario para seguir siendo apropiados tras el cambio.
Asegurar que los planes de continuidad de las TIC y los procedimientos de respuesta y recuperación se actualicen según sea necesario tras el cambio.',
    'El control inadecuado de los cambios es una causa común de fallas de sistema o de seguridad, especialmente al transferir software del entorno de desarrollo al operativo, ya que puede afectar la integridad y disponibilidad de las aplicaciones.
Es buena práctica probar los componentes de TIC (incluidos parches, paquetes de servicio y otras actualizaciones) en un entorno segregado de producción y desarrollo, lo que da control sobre el nuevo software y protege la información operativa usada para pruebas; el control debe aplicarse tanto a aplicaciones como a infraestructura, incluyendo sistemas operativos, bases de datos y plataformas de middleware.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.32'), 1, '¿Todo cambio en la base de datos o en los sistemas que la soportan (nuevas versiones, parches, cambios de estructura o de configuración) sigue siempre el mismo procedimiento antes de aplicarse?'),
    ((SELECT id FROM Controles WHERE codigo = '8.32'), 2, '¿Antes de aplicar un cambio se evalúa a qué puede afectar, alguien con autoridad lo aprueba y se avisa a las personas o áreas involucradas?'),
    ((SELECT id FROM Controles WHERE codigo = '8.32'), 3, '¿Los cambios se prueban en un entorno aparte y esas pruebas se aceptan antes de pasarlos a producción, existiendo además un plan para volver atrás si algo sale mal?'),
    ((SELECT id FROM Controles WHERE codigo = '8.32'), 4, '¿Queda un registro de cada cambio (qué se hizo, quién lo pidió, quién lo aprobó, cómo se probó y cuándo se aplicó) y se actualiza después la documentación de uso y los planes de recuperación?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.32'), id FROM Tipos_Control WHERE nombre IN ('Preventivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.32'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.32'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.32'), id FROM Capacidades_Operativas WHERE nombre IN ('Seguridad de aplicaciones', 'Seguridad de sistemas y redes');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.31',
    'Separación de los entornos de desarrollo, prueba y producción',
    'Proteger el entorno de producción y sus datos frente al compromiso derivado de las actividades de desarrollo y prueba.',
    'Los entornos de desarrollo, prueba y producción deben estar separados y protegidos.',
    6,
    'Primario',
    'Primario',
    'Secundario',
    'Identificar e implementar el nivel de separación necesario entre los entornos de producción, prueba y desarrollo para evitar problemas de producción.
Separar adecuadamente los sistemas de desarrollo y producción, operándolos en dominios distintos (por ejemplo, entornos físicos o virtuales separados).
Definir, documentar e implementar reglas y autorizaciones para el despliegue de software desde el estado de desarrollo al de producción.
Probar los cambios en los sistemas y aplicaciones de producción dentro de un entorno de prueba o ensayo antes de aplicarlos a producción, sin realizar pruebas en el entorno de producción salvo circunstancias definidas y aprobadas.
No dejar accesibles desde los sistemas de producción los compiladores, editores y otras herramientas de desarrollo o utilidades cuando no se requieran, y mostrar etiquetas que identifiquen claramente cada entorno para reducir el riesgo de error.
No copiar información confidencial a los entornos de desarrollo y prueba, salvo que se les proporcionen controles equivalentes a los de producción.
Proteger los entornos de desarrollo y prueba aplicando parches y actualizaciones a todas las herramientas involucradas (constructores, integradores, compiladores, sistemas de configuración y bibliotecas), manteniendo una configuración segura, controlando el acceso, monitoreando y respaldando los entornos, y dando seguimiento a los cambios en el entorno y el código almacenado.
Evitar que una sola persona pueda realizar cambios tanto en desarrollo como en producción sin revisión y aprobación previas, mediante segregación de derechos de acceso o reglas supervisadas.
En situaciones excepcionales, implementar medidas adicionales como registro detallado y monitoreo en tiempo real para detectar y actuar ante cambios no autorizados.',
    'Sin medidas adecuadas, los desarrolladores y evaluadores con acceso a producción representan un riesgo significativo (modificaciones no deseadas, fallas del sistema, ejecución de código no probado, divulgación de datos, problemas de integridad y disponibilidad), por lo que conviene mantener un entorno estable para pruebas, con roles bien diseñados, segregación de tareas y monitoreo.
Separar los entornos reduce el riesgo de cambios accidentales o acceso no autorizado al software y datos de producción; en algunos casos la distinción se difumina deliberadamente (pruebas en desarrollo, despliegues piloto controlados, o dos entornos de producción idénticos alternando cuál está en vivo), lo que requiere procesos de soporte para el uso de datos de producción en desarrollo y prueba, y puede aplicarse también a entornos de capacitación.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.31'), 1, '¿Las bases de datos de desarrollo, de prueba y de producción están en entornos o servidores separados y se identifican claramente para no confundirlos?'),
    ((SELECT id FROM Controles WHERE codigo = '8.31'), 2, '¿El paso de un cambio desde desarrollo hasta producción sigue reglas conocidas y requiere autorización, evitando que se hagan pruebas directamente en producción?'),
    ((SELECT id FROM Controles WHERE codigo = '8.31'), 3, '¿Se evita copiar datos reales y sensibles a los entornos de desarrollo y prueba y, cuando hay que hacerlo, esos datos se protegen igual que en producción o se alteran para que no identifiquen a personas?'),
    ((SELECT id FROM Controles WHERE codigo = '8.31'), 4, '¿Se impide que una misma persona pueda hacer un cambio en desarrollo y aplicarlo en producción sin que otra lo revise y apruebe?'),
    ((SELECT id FROM Controles WHERE codigo = '8.31'), 5, '¿Los entornos de desarrollo y prueba se mantienen actualizados y con acceso controlado, y las herramientas de desarrollo (compiladores, editores, utilidades) no quedan disponibles en los servidores de producción?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.31'), id FROM Tipos_Control WHERE nombre IN ('Preventivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.31'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.31'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.31'), id FROM Capacidades_Operativas WHERE nombre IN ('Seguridad de aplicaciones', 'Seguridad de sistemas y redes');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.12',
    'Prevención de fuga de datos',
    'Detectar y prevenir la divulgación y extracción no autorizada de información por parte de personas o sistemas.',
    'Deben aplicarse medidas de prevención de fuga de datos a los sistemas, redes y dispositivos que procesan, almacenan o transmiten información confidencial.',
    6,
    'Primario',
    NULL,
    NULL,
    'Identificar y clasificar la información que debe protegerse contra fugas, por ejemplo información personal, modelos de precios y diseños de productos.
Monitorear los canales por los que puede filtrarse información, como correo electrónico, transferencias de archivos, dispositivos móviles y de almacenamiento portátil.
Actuar para evitar la filtración, por ejemplo poniendo en cuarentena correos electrónicos que contengan información confidencial.
Usar herramientas de prevención de fuga de datos para identificar y monitorear información sensible en riesgo de divulgación no autorizada, incluso en datos no estructurados en el sistema de un usuario.
Detectar la divulgación de información confidencial, por ejemplo cuando se carga en servicios en la nube de terceros no confiables o se envía por correo electrónico.
Bloquear acciones de los usuarios o transmisiones de red que expongan información confidencial, como copiar entradas de una base de datos a una hoja de cálculo.
Determinar si es necesario restringir la capacidad de los usuarios para copiar, pegar o cargar datos en servicios, dispositivos o medios de almacenamiento externos, e implementar tecnología que permita ver y manipular datos remotos sin copiarlos fuera del control de la organización.
Cuando se requiera exportar datos, permitir que el propietario de los datos apruebe la exportación y responsabilizar a los usuarios por sus acciones.
Abordar la captura de pantallas o fotografías de la pantalla mediante términos y condiciones de uso, capacitación y auditoría.
Proteger la información confidencial en las copias de seguridad mediante cifrado, control de acceso y protección física de los medios que las contienen.
Considerar la prevención de fuga de datos también frente a acciones de inteligencia de un adversario, orientando las acciones a confundir sus decisiones, por ejemplo reemplazando información auténtica por información falsa, mediante ingeniería social inversa o el uso de honeypots.',
    'Las herramientas de prevención de fuga de datos identifican datos, monitorean su uso y movimiento, y actúan para evitar la fuga (alertas o bloqueo de transferencias), pero implican controlar comunicaciones del personal y de terceros, lo que plantea consideraciones legales de privacidad, protección de datos, empleo e interceptación de comunicaciones.
Puede respaldarse con controles estándar como las políticas de control de acceso y la gestión segura de documentos.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.12'), 1, '¿Está identificada y clasificada la información sensible de la base de datos que no debe salir de la organización, como datos personales, precios o diseños?'),
    ((SELECT id FROM Controles WHERE codigo = '8.12'), 2, '¿Se vigilan y controlan las vías por las que esa información podría salir (correo, exportaciones y descargas de la base de datos, memorias USB, servicios en la nube), con capacidad de detener o bloquear los envíos indebidos?'),
    ((SELECT id FROM Controles WHERE codigo = '8.12'), 3, '¿Las exportaciones o extracciones de datos sensibles requieren aprobación del responsable de esa información y quedan registradas a nombre de quien las realizó?'),
    ((SELECT id FROM Controles WHERE codigo = '8.12'), 4, '¿La información sensible que sale en copias de respaldo o en archivos exportados va cifrada y con acceso restringido?'),
    ((SELECT id FROM Controles WHERE codigo = '8.12'), 5, '¿El personal conoce y ha aceptado las reglas de uso y de vigilancia de estos canales, y esa vigilancia se hace respetando la legislación de privacidad y protección de datos?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.12'), id FROM Tipos_Control WHERE nombre IN ('Preventivo', 'Detectivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.12'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger', 'Detectar');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.12'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección', 'Defensa');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.12'), id FROM Capacidades_Operativas WHERE nombre IN ('Protección de la información');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.20',
    'Seguridad de redes',
    'Proteger la información en las redes y en sus instalaciones de procesamiento de apoyo frente al compromiso a través de la red.',
    'Las redes y los dispositivos de red deben protegerse, administrarse y controlarse para resguardar la información en los sistemas y las aplicaciones.',
    8,
    'Primario',
    'Primario',
    'Secundario',
    'Considerar el tipo y nivel de clasificación de la información que la red puede soportar al implementar controles de seguridad.
Establecer responsabilidades y procedimientos para la gestión de equipos y dispositivos de red.
Mantener documentación actualizada, incluidos diagramas de red y archivos de configuración de dispositivos (enrutadores, conmutadores).
Separar, cuando corresponda, la responsabilidad operativa de las redes de las operaciones del sistema de TIC.
Establecer controles para salvaguardar la confidencialidad e integridad de los datos que pasan por redes públicas, de terceros o inalámbricas, y para proteger los sistemas y aplicaciones conectados, considerando también controles adicionales para mantener la disponibilidad de los servicios de red y equipos conectados.
Implementar registro y monitoreo adecuados que permitan detectar acciones relevantes o que afecten la seguridad de la información.
Coordinar estrechamente las actividades de gestión de red para optimizar el servicio y garantizar que los controles se apliquen de forma coherente en toda la infraestructura de procesamiento de información.
Implementar sistemas de autenticación en la red, y restringir y filtrar la conexión de sistemas a ella, por ejemplo mediante cortafuegos.
Detectar, restringir y autenticar la conexión de equipos y dispositivos a la red.
Endurecer los dispositivos de red y segregar los canales de administración de red del resto del tráfico.
Aislar temporalmente subredes críticas si la red está bajo ataque, y deshabilitar protocolos de red vulnerables.
Aplicar los controles de seguridad adecuados al uso de redes virtualizadas, incluidas las redes definidas por software (SDN, SD-WAN), que pueden ser deseables por permitir la separación lógica de la comunicación sobre redes físicas, en particular para sistemas y aplicaciones de computación distribuida.',
    'ISO/IEC 27033 amplía lo relativo a la seguridad de red, e ISO/IEC TS 23167 lo relativo a redes virtualizadas.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.20'), 1, '¿Hay responsables definidos para los equipos de red y se conoce con precisión cómo está armada la red (diagramas y configuraciones de routers, conmutadores y cortafuegos)?'),
    ((SELECT id FROM Controles WHERE codigo = '8.20'), 2, '¿El acceso a la red y a la base de datos está filtrado, de modo que solo los equipos, servicios y usuarios autorizados puedan conectarse, y se detectan los dispositivos que se conectan sin permiso?'),
    ((SELECT id FROM Controles WHERE codigo = '8.20'), 3, '¿La información que viaja por redes públicas, inalámbricas o de terceros va cifrada, y el tráfico de administración de los equipos de red va por un canal separado del tráfico normal?'),
    ((SELECT id FROM Controles WHERE codigo = '8.20'), 4, '¿Se registra y vigila la actividad de la red para detectar conexiones o comportamientos extraños, y es posible aislar una parte de la red o desactivar protocolos inseguros si hay un ataque?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.20'), id FROM Tipos_Control WHERE nombre IN ('Preventivo', 'Detectivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.20'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger', 'Detectar');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.20'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.20'), id FROM Capacidades_Operativas WHERE nombre IN ('Seguridad de sistemas y redes');

INSERT INTO Controles
    (norma_id, dominio_norma_id, codigo, nombre, proposito, descripcion, peso,
     confidencialidad, integridad, disponibilidad, guia, otra_informacion)
VALUES (
    (SELECT id FROM Normas WHERE nombre = '27002'),
    (SELECT id FROM Dominios_Norma WHERE nombre = 'Tecnológicos'),
    '8.7',
    'Protección contra malware',
    'Garantizar que la información y otros activos asociados estén protegidos contra malware.',
    'La protección contra malware debe implementarse y respaldarse con la concientización adecuada de los usuarios.',
    9,
    'Primario',
    'Primario',
    'Primario',
    'Basar la protección contra malware en software de detección y reparación, concientización de seguridad, control de acceso adecuado y controles de gestión de cambios, ya que el software antimalware por sí solo no suele ser suficiente.
Implementar reglas y controles que prevengan o detecten el uso de software no autorizado (por ejemplo, listas de aplicaciones permitidas) y de sitios web maliciosos o sospechosos (por ejemplo, listas de bloqueo), y reducir las vulnerabilidades explotables por malware mediante la gestión técnica de vulnerabilidades.
Realizar validación automatizada periódica del software y los datos de los sistemas, especialmente en los que soportan procesos críticos, investigando la presencia de archivos no aprobados o cambios no autorizados.
Establecer medidas de protección frente a los riesgos de obtener archivos o software desde redes externas o cualquier otro medio.
Instalar y actualizar regularmente software antimalware, escaneando datos recibidos por red o medios de almacenamiento, archivos adjuntos y descargas de correo o mensajería, y páginas web al acceder a ellas, en distintos puntos (servidores de correo, equipos de escritorio, entrada a la red).
Determinar la ubicación y configuración de las herramientas antimalware según la evaluación de riesgos, aplicando principios de defensa en profundidad (puerta de enlace de red, servidores, dispositivos de usuario) y considerando técnicas evasivas de los atacantes, como el uso de archivos o protocolos cifrados.
Proteger especialmente contra la introducción de malware durante procedimientos de mantenimiento o emergencia, que pueden eludir los controles normales.
Implementar un proceso para autorizar la desactivación temporal o permanente de medidas antimalware, con autoridades de aprobación, justificación documentada y fecha de revisión.
Preparar planes de continuidad de negocio para recuperarse de ataques de malware, incluyendo copias de seguridad de datos y software (en línea y fuera de línea) y medidas de recuperación, y aislar entornos donde las consecuencias puedan ser catastróficas.
Definir procedimientos y responsabilidades para la protección contra malware, incluyendo capacitación en su uso, reporte y recuperación ante ataques.
Brindar concientización o capacitación a todos los usuarios sobre cómo identificar y mitigar la recepción, envío o instalación de correos, archivos o programas infectados con malware.
Implementar procedimientos para recopilar regularmente información sobre nuevo malware (por ejemplo, listas de correo o sitios especializados), verificando que provenga de fuentes calificadas y acreditadas y que sea precisa e informativa.',
    'No siempre es posible instalar protección antimalware en algunos sistemas (por ejemplo, ciertos sistemas de control industrial); algunas formas de malware infectan el sistema operativo o el firmware, de modo que los controles habituales no pueden limpiarlos y es necesario reimágenes completas del software y a veces del firmware para volver a un estado seguro.'
);

INSERT INTO Preguntas (control_id, orden, texto) VALUES
    ((SELECT id FROM Controles WHERE codigo = '8.7'), 1, '¿Los servidores de base de datos y los equipos que se conectan a ella cuentan con software antimalware instalado, que se actualiza con regularidad y revisa archivos, correos, descargas y medios extraíbles?'),
    ((SELECT id FROM Controles WHERE codigo = '8.7'), 2, '¿Se impide instalar o ejecutar programas no autorizados y se bloquea el acceso a sitios web peligrosos?'),
    ((SELECT id FROM Controles WHERE codigo = '8.7'), 3, '¿Desactivar o retirar la protección antimalware requiere autorización, con motivo escrito y fecha para volver a activarla?'),
    ((SELECT id FROM Controles WHERE codigo = '8.7'), 4, '¿Los usuarios reciben capacitación para reconocer correos, archivos o programas sospechosos y saben a quién reportarlos?'),
    ((SELECT id FROM Controles WHERE codigo = '8.7'), 5, '¿Se pueden recuperar los sistemas tras una infección, con respaldos disponibles, incluidos los equipos donde no se puede instalar antimalware y que deberían reinstalarse por completo?');

INSERT INTO Controles_Tipos (control_id, tipo_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.7'), id FROM Tipos_Control WHERE nombre IN ('Preventivo', 'Detectivo', 'Correctivo');

INSERT INTO Controles_Conceptos (control_id, concepto_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.7'), id FROM Conceptos_Ciberseguridad WHERE nombre IN ('Proteger', 'Detectar');

INSERT INTO Controles_Dominios_Seguridad (control_id, dominio_seguridad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.7'), id FROM Dominios_Seguridad WHERE nombre IN ('Protección', 'Defensa');

INSERT INTO Controles_Capacidades (control_id, capacidad_id)
SELECT (SELECT id FROM Controles WHERE codigo = '8.7'), id FROM Capacidades_Operativas WHERE nombre IN ('Seguridad de sistemas y redes', 'Protección de la información');

COMMIT;
