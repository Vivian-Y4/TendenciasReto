# Manual de Usuario del Votante - Programa Piloto de Votación Electrónica

## Tabla de Contenidos

1.  Introducción al Programa Piloto
    *   ¿Qué es este piloto?
    *   Objetivos del piloto
    *   Importancia de su participación
2.  Antes de Votar
    *   Requisitos (Navegador, Extensión MetaMask)
    *   Cómo se protege su anonimato (Explicación simplificada)
    *   Verificación de su Identificador de Votante (Conceptual)
3.  Instalación y Configuración de MetaMask
    *   Descarga e instalación de MetaMask
    *   Creación de una nueva billetera (si es necesario)
    *   Importar una billetera existente (opcional)
    *   Obtención de fondos de prueba (ETH en red de prueba)
4.  Acceso a la Plataforma de Votación
    *   Dirección web de la PWA del piloto
    *   Conectar su billetera MetaMask
5.  Proceso de Votación Anónima (Paso a Paso)
    *   5.1. Inicio de Sesión
        *   Conectar billetera.
        *   Confirmación de identidad (automática con billetera).
    *   5.2. Selección de Elección
        *   Ver lista de elecciones activas.
        *   Seleccionar la elección del piloto.
    *   5.3. Selección de Candidato
        *   Ver la lista de candidatos.
        *   Seleccionar su candidato preferido.
    *   5.4. Emisión del Voto Anónimo
        *   Confirmar selección.
        *   Proceso "Preparando su voto seguro..." (Explicación de alto nivel: prueba de Merkle, cálculos ZK).
        *   Aprobar la transacción en MetaMask (para `anonymousVote`).
        *   Notificación de voto emitido y almacenamiento de datos para revelación.
6.  Fase de Revelación del Voto (Paso a Paso)
    *   6.1. ¿Por qué es necesaria la revelación? (Para el conteo en este piloto)
    *   6.2. Cuándo y Cómo Acceder a la Revelación
        *   Periodo de revelación (después del cierre de la votación).
        *   Acceder a la sección "Revelar mi Voto" en la elección.
    *   6.3. Confirmación de Detalles del Voto
        *   Visualización del candidato seleccionado y el compromiso de voto (almacenado localmente).
        *   Confirmar para proceder.
    *   6.4. Envío de la Revelación
        *   Aprobar la transacción en MetaMask (para `revealVote`, si la firma es del usuario, o notificación si el backend la envía).
        *   Confirmación de voto revelado.
7.  Verificación del Estado de su Voto (Opcional/Conceptual)
    *   Cómo usar herramientas de auditoría pública (si aplica en el piloto).
8.  Solución de Problemas Comunes
    *   MetaMask no se conecta.
    *   Transacción falla (fondos insuficientes, error de red).
    *   No encuentro la opción para revelar mi voto.
9.  Seguridad y Privacidad
    *   Recordatorio sobre la seguridad de su frase semilla de MetaMask.
    *   Cómo el sistema (con ZK) busca proteger su anonimato.
10. Contacto para Soporte del Piloto
    *   Correo electrónico o número de ayuda.
    *   Horarios de atención.

---
## Muestras de Contenido

### Sección 1: Introducción al Programa Piloto

**¿Qué es este piloto?**

Bienvenido/a al programa piloto del nuevo sistema de votación electrónica. Esta es una prueba diseñada para evaluar la funcionalidad, seguridad y experiencia de usuario de una plataforma de votación que utiliza tecnología blockchain y pruebas de conocimiento cero (ZK-SNARKs) para permitir un voto anónimo y verificable. Su participación es fundamental para ayudarnos a mejorar el sistema antes de una posible implementación a mayor escala.

### Sección 5.4: Emisión del Voto Anónimo

**Proceso "Preparando su voto seguro..."**

Una vez que haya confirmado su selección de candidato, la aplicación comenzará a "preparar su voto seguro". Durante este breve proceso (usualmente unos segundos), ocurren varias operaciones criptográficas importantes en su dispositivo:
*   **Prueba de Pertenencia:** Se genera una prueba de Merkle. Esto es como una firma digital que demuestra que su `Identificador de Votante` está en la lista oficial de votantes registrados para esta elección, pero sin revelar cuál es su identificador específico.
*   **Cálculos ZK (Prueba de Conocimiento Cero):** Se preparan los datos para una prueba criptográfica especial. Esta prueba demostrará que usted tiene derecho a votar, que no ha votado antes en esta elección y que el voto que está emitiendo es para el candidato que seleccionó, ¡todo sin revelar su identidad o su voto directamente! En esta versión piloto, la generación completa de la prueba ZK compleja se simula para agilizar el proceso, pero los datos se preparan como si fuera real.
*   Usted verá un mensaje indicando que este proceso está en curso.

**Notificación de voto emitido y almacenamiento de datos para revelación:**

Tras aprobar la transacción en MetaMask para la función `anonymousVote`, su voto anónimo (representado por un "compromiso de voto") será enviado y registrado en la blockchain. ¡Felicidades, ha votado anónimamente!

*   **Importante para el Piloto:** Para que su voto sea contado en esta versión piloto, deberá participar en una "fase de revelación" después de que termine el período de votación. La aplicación guardará de forma segura en el almacenamiento local de su navegador el `ID del candidato` que eligió y el `compromiso de voto` generado. Necesitará esta información para la fase de revelación. Por favor, asegúrese de usar el mismo navegador y perfil para la revelación.

### Sección 6.2: Cuándo y Cómo Acceder a la Revelación

**Periodo de revelación:**

La fase de revelación de votos comenzará una vez que el período de votación haya finalizado oficialmente y antes de que los resultados finales sean publicados. Las fechas exactas para este período serán comunicadas por la Junta Central Electoral (JCE) del piloto.

**Acceder a la sección "Revelar mi Voto":**

1.  Abra la aplicación de votación PWA en el mismo navegador que usó para votar.
2.  Conecte su billetera MetaMask.
3.  Navegue a la elección en la que participó.
4.  Si el período de revelación está activo y usted tiene un voto pendiente de revelar para esa elección (detectado por la información guardada en su navegador), verá una sección o botón claramente identificado como "Revelar mi Voto para el Conteo". Haga clic en él.

    *(Captura de pantalla de ejemplo mostrando el botón/sección de revelación en la página de detalles de la elección)*
---
