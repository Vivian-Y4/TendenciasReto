# Diapositivas del Taller para Administradores/Operadores del Piloto JCE
# Sistema de Votación Electrónica Blockchain

---
## Sección 1: Introducción y Objetivos del Piloto (Diapositivas 1-5)

*   **Diapositiva 1: Título**
    *   Bienvenida al Taller de Administradores del Piloto de Votación Electrónica
    *   Logo JCE / Nombre del Proyecto
    *   Fecha
*   **Diapositiva 2: Introducción al Piloto**
    *   ¿Qué es el Sistema de Votación Electrónica Piloto?
        *   Breve descripción: Prueba de concepto, uso de blockchain, ZK-SNARKs (mencionar a alto nivel).
    *   Contexto y Motivación.
*   **Diapositiva 3: Objetivos del Piloto**
    *   Evaluar viabilidad técnica de la solución.
    *   Probar funcionalidad de voto anónimo y revelación para conteo.
    *   Recoger feedback de administradores y votantes.
    *   Identificar desafíos y áreas de mejora.
*   **Diapositiva 4: Alcance del Piloto**
    *   Número limitado de votantes y elecciones simuladas.
    *   Uso de red de prueba (testnet), no dinero real.
    *   Activos ZK son placeholders (explicar implicación: flujo se prueba, no seguridad criptográfica completa de ZK).
*   **Diapositiva 5: Su Rol como Administrador del Piloto**
    *   Responsabilidades clave: configuración de elecciones, gestión de votantes (identificadores), supervisión, finalización y reporte.
    *   Importancia de su feedback.

---
## Sección 2: Arquitectura del Sistema y Componentes (Diapositivas 6-8)

*   **Diapositiva 6: Arquitectura Simplificada**
    *   Diagrama de alto nivel: Frontend (PWA Votante, Panel Admin) -> Backend API -> Smart Contracts -> Blockchain.
    *   Base de Datos (MongoDB) para datos off-chain.
*   **Diapositiva 7: Smart Contracts Clave**
    *   `VotingSystem.sol`: Orquestador principal (elecciones, votantes, votos anónimos, revelación).
    *   `Verifier.sol`: Responsable de la verificación de pruebas ZK (en piloto, es un stub/plantilla).
*   **Diapositiva 8: Flujo General del Voto Anónimo (Conceptual)**
    *   Registro (Admin) -> Voto Anónimo (Votante con ZK) -> Revelación (Votante) -> Conteo (Automático por contrato).

---
## Sección 3: Panel de Administración - Visión General (Diapositivas 9-12)

*   **Diapositiva 9: Acceso al Panel**
    *   URL, credenciales/método de login (wallet específica).
    *   Recordatorio de seguridad.
*   **Diapositiva 10: Navegación Principal**
    *   Dashboard.
    *   Sección de Elecciones.
    *   Sección de Configuración del Sistema (si aplica).
    *   *(Captura de pantalla del dashboard principal del admin panel)*
*   **Diapositiva 11: Módulos Principales del Panel**
    *   Gestión de Elecciones.
    *   Gestión de Votantes (Identificadores).
    *   Configuración de Parámetros ZK (Raíz Merkle, Verifier).
    *   Monitoreo y Resultados.
*   **Diapositiva 12: Interacción Backend-Contrato**
    *   Explicar que la mayoría de las acciones en el panel resultan en llamadas API que luego interactúan con los smart contracts.
    *   Importancia del gas (ETH de prueba) para la cuenta administradora del backend.

---
## Sección 4: Gestión Detallada de Elecciones (Diapositivas 13-25)

*   **Diapositiva 13: Módulo de Configuración de Elección - Intro**
*   **Diapositiva 14: Creando una Nueva Elección**
    *   Campos: Título, Descripción, Fechas de Inicio/Fin.
    *   Consideraciones sobre la duración de los periodos.
    *   *(Captura de pantalla del formulario de creación de elección)*
*   **Diapositiva 15: Transacción de Creación**
    *   Confirmación -> Llamada API -> Transacción a `VotingSystem.createElection`.
    *   Verificación en explorador de bloques.
*   **Diapositiva 16: Añadiendo Candidatos**
    *   Seleccionar elección existente.
    *   Formulario: Nombre del candidato, descripción.
    *   *(Captura de pantalla del formulario de añadir candidato)*
    *   Llamada API -> Transacción a `VotingSystem.addCandidate`.
*   **Diapositiva 17: Gestión de Votantes - `voterIdentifier`**
    *   Explicación del `voterIdentifier`: cadena `bytes32` única por votante, pseudoanónima.
    *   Proceso de obtención de esta lista (conceptual, provista por JCE).
*   **Diapositiva 18: Registro por Lotes de `voterIdentifier`s**
    *   Importancia de registrar ANTES de generar la Raíz de Merkle.
    *   Panel: Selección de elección, carga de lista de `voterIdentifier`s.
    *   *(Captura de pantalla de la interfaz de carga de lote)*
    *   Llamada API (`/api/jce-registry/register-voter` o similar) -> `VotingSystem.batchRegisterVoters`.
*   **Diapositiva 19: Generación y Establecimiento de Raíz de Merkle**
    *   ¿Qué es la Raíz de Merkle? (Ancla para el padrón anónimo).
    *   Paso 1: Confirmar que el registro de votantes para la elección está CERRADO.
    *   Paso 2 (Backend): El backend calcula la raíz a partir de los `voterIdentifier`s registrados en la BD para esa elección.
    *   Paso 3 (Panel Admin): Interfaz para ver la raíz calculada y botón para enviarla al contrato.
    *   *(Captura de pantalla de la interfaz de `setMerkleRoot`)*
    *   Llamada API (`POST /api/admin/elections/:electionId/merkle-root`) -> `VotingSystem.setMerkleRoot`.
    *   **CRÍTICO:** La raíz debe establecerse ANTES de que inicie el período de votación.
*   **Diapositiva 20: Configuración del Contrato Verificador (Setup Único)**
    *   Rol del `Verifier.sol` (aunque sea un stub en el piloto).
    *   Panel Admin (o script): Interfaz para ingresar la dirección del `Verifier.sol` desplegado.
    *   Llamada API (`POST /api/admin/elections/contract/verifier`) -> `VotingSystem.setVerifier`.
    *   Verificar que la dirección quedó grabada en `VotingSystem.sol`.
*   **Diapositiva 21: Monitoreo de Elección Activa**
    *   Panel: Ver estado (`isActive`), conteo de `voteCommitments` (votos anónimos emitidos).
    *   *(Captura de pantalla del monitor de elección)*
*   **Diapositiva 22: Finalización del Período de Votación**
    *   Panel: Botón para llamar a `endElection` (vía API).
    *   Confirma el cierre de la votación.
*   **Diapositiva 23: Gestión del Período de Revelación**
    *   Comunicar a los votantes el inicio de este período.
    *   Panel: Monitorear conteo de eventos `VoteRevealed` (si el backend lo provee).
*   **Diapositiva 24: Finalización de Resultados**
    *   Panel: Botón para llamar a `finalizeResults` (vía API).
    *   Esto cierra el período de revelación y el contrato considera los `voteCount` de los candidatos como finales.
*   **Diapositiva 25: Visualización de Resultados**
    *   Panel: Ver tabla de candidatos con sus conteos finales.
    *   *(Captura de pantalla de la vista de resultados)*

---
## Sección 5: Seguridad y Troubleshooting (Diapositivas 26-29)

*   **Diapositiva 26: Buenas Prácticas de Seguridad para Admins**
    *   Manejo de credenciales/wallet de admin.
    *   Verificación doble de datos antes de enviar transacciones (fechas, IDs, direcciones).
*   **Diapositiva 27: Troubleshooting Común (Admin)**
    *   Errores de transacción (gas, revert de contrato).
    *   Inconsistencias de datos entre panel y blockchain.
    *   Referencia al `pilot_admin_manual.md` y `pilot_technical_support_guide.md`.
*   **Diapositiva 28: Proceso de Soporte del Piloto**
    *   A quién contactar.
    *   Información a proveer al solicitar ayuda.
*   **Diapositiva 29: Q&A y Próximos Pasos**
    *   Sesión de Preguntas y Respuestas.
    *   Resumen de actividades del piloto.

---
## Muestras de Contenido Específico

### Diapositiva 19: Generación y Establecimiento de Raíz de Merkle
*   **Título:** Configuración Crucial: Raíz de Merkle
*   **Contenido:**
    *   **¿Qué es?** La Raíz de Merkle es una "huella digital" criptográfica de todos los `voterIdentifier`s registrados para la elección. Es ESENCIAL para que el sistema pueda verificar anónimamente que un votante está en el padrón sin saber quién es.
    *   **Proceso:**
        1.  **CIERRE DE REGISTRO:** Primero, asegúrese de que NO se añadirán más votantes a esta elección. Este paso es irreversible para la votación anónima.
        2.  **CÁLCULO (Backend):** Desde el panel, active la opción "Calcular Raíz de Merkle". El sistema backend tomará TODOS los `voterIdentifier`s que usted registró para esta elección en la base de datos y generará la raíz.
        3.  **VISUALIZACIÓN (Panel):** El panel mostrará la raíz calculada (una larga cadena hexadecimal, ej: `0x123...def`).
        4.  **ENVÍO AL CONTRATO (Panel):** Use el botón "Establecer Raíz de Merkle en Contrato". Esto llama a la función `setMerkleRoot` del `VotingSystem.sol`.
            *   *(Captura de pantalla del panel mostrando la raíz calculada y el botón de envío)*
    *   **¡MUY IMPORTANTE!**
        *   Este paso DEBE realizarse ANTES de la fecha y hora de inicio de la votación.
        *   Una vez establecida, la Raíz de Merkle NO PUEDE ser cambiada para esta elección.
        *   Si la raíz no se establece, la función `anonymousVote` fallará para todos los votantes.

### Diapositiva 23: Gestión del Período de Revelación
*   **Título:** Fase de Revelación de Votos
*   **Contenido:**
    *   **Propósito (Piloto):** En este piloto, para que los votos anónimos (compromisos) se cuenten, los votantes deben "revelar" su elección después de que el período de votación haya terminado. Esto asocia su compromiso anónimo con el candidato que seleccionaron.
    *   **Acciones del Administrador:**
        1.  **Comunicación:** Anuncie claramente a los votantes el inicio y fin del período de revelación. (Ej. 24-48h después del cierre de la votación).
        2.  **Monitoreo (Panel):** El panel podría mostrar un conteo de cuántos de los votos anónimos emitidos (`voteCommitments`) han sido revelados (eventos `VoteRevealed`). Esto da una idea de la participación en la revelación.
            *   *(Conceptual: Captura de pantalla de un monitor de revelación si existiera)*
        3.  **Soporte:** Esté atento a consultas de votantes sobre el proceso de revelación.
    *   **Importante:** Los votantes que no revelen su voto (compromiso + candidato) durante este período no tendrán su voto contado en el resultado final para este sistema piloto simplificado.
---
