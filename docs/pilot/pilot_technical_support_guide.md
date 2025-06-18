# Guía de Soporte Técnico del Piloto - Sistema de Votación Electrónica

## Tabla de Contenidos

1.  Introducción
    *   Propósito de esta guía
    *   Niveles de soporte (L1, L2)
    *   Herramientas de soporte (Consola del navegador, Logs del servidor, Explorador de Bloques)
2.  Arquitectura del Sistema (Versión Piloto)
    *   2.1. Componentes Principales
        *   Frontend (React PWA)
        *   Backend (Node.js/Express API)
        *   Smart Contracts (VotingSystem.sol, Verifier.sol - con stubs ZK)
        *   Blockchain (Red de prueba Ethereum - ej. Sepolia, Goerli, o local Hardhat)
        *   Base de Datos (MongoDB)
        *   ZK Assets (WASM, ZKey - placeholders en esta fase)
    *   2.2. Flujo de Datos Clave
        *   Flujo de registro de votantes (Admin)
        *   Flujo de voto anónimo (Votante)
        *   Flujo de revelación de voto (Votante)
        *   Flujo de configuración de elección (Admin)
3.  Checklist de Despliegue del Piloto
    *   Contratos desplegados (VotingSystem, Verifier) y direcciones actualizadas en `.env` (cliente y servidor).
    *   Backend API funcional y conectada a la base de datos y al nodo blockchain.
    *   Frontend PWA desplegado y configurado para apuntar al backend API y contratos correctos.
    *   ZK Assets (`.wasm`, `.zkey` - placeholders) en `client/public/zk/`.
    *   Configuraciones iniciales del contrato `VotingSystem` realizadas:
        *   Dirección del `Verifier` establecida (`setVerifier`).
    *   Cuentas de prueba (votantes, admin) con fondos en la red de prueba.
4.  Troubleshooting Común
    *   4.1. Problemas del Votante
        *   **Error: "MetaMask no se conecta" / "Billetera no detectada"**
            *   Verificar instalación de MetaMask.
            *   Verificar que MetaMask está desbloqueado y en la red correcta.
            *   Pedir al usuario refrescar la página.
        *   **Error: "Identificador de votante no encontrado" (al intentar votar)**
            *   Verificar que el `voterIdentifier` del usuario (mockeado en `App.js` -> `getMockVoterIdentifierForUser` para el piloto) corresponde a uno registrado en la elección y presente en el árbol de Merkle.
            *   Consultar (via admin) la lista de `voterIdentifiers` registrados para la elección en el backend/contrato.
        *   **Error: "Fallo al obtener prueba de Merkle" (API)**
            *   Verificar logs del backend (`merkleController.js`).
            *   Asegurar que el backend tiene la lista de `voterIdentifier`s para la elección y puede construir el árbol.
            *   Verificar que el `merkleRoot` en el contrato para la elección coincide con el que el backend está usando.
        *   **Error: "Error generando prueba ZK: snarkjs no encontrado / error en fullProve" (Consola del Votante)**
            *   Verificar que `snarkjs` está cargado en el cliente (global `window.snarkjs`).
            *   Verificar que los archivos `/zk/vote.wasm` y `/zk/vote_final.zkey` son accesibles desde el cliente.
            *   **Nota Piloto:** Con los placeholders, `snarkjs.fullProve` fallará. El error esperado es sobre formato de clave/wasm inválido o similar. Documentar este error esperado.
            *   Verificar formato de inputs a `fullProve` (todos deben ser strings decimales).
        *   **Error: "VotingSystem: Prueba ZK invalida" (Revert de Contrato en MetaMask)**
            *   Este es el error esperado si la prueba ZK es inválida o si el `Verifier.sol` (con VK placeholders) la rechaza. Durante el piloto con placeholders, si se llega a este punto, el flujo hasta el contrato es correcto.
        *   **Error: "VotingSystem: Voto ya emitido con este nulificador"**
            *   El usuario ya votó con la misma cuenta secreta para esa elección.
        *   **Error: "Fallo al revelar voto" / "Compromiso de voto inválido" (API o Contrato)**
            *   Verificar que el `voteCommitment` y `candidateId` que el usuario intenta revelar coinciden con los datos almacenados/esperados.
            *   Revisar logs del backend y del contrato.
        *   **Transacciones de MetaMask fallan o se quedan pendientes:**
            *   Fondos insuficientes para gas.
            *   Congestión de la red de prueba.
            *   Error de nonce en MetaMask (pedir resetear cuenta en MetaMask).
    *   4.2. Problemas del Administrador/Operador
        *   **Error al crear elección / añadir candidato (API/Contrato):**
            *   Verificar logs del backend (`electionAdminController.js`).
            *   Asegurar que la cuenta admin (`ADMIN_SIGNER_PRIVATE_KEY`) tiene ETH para gas y permisos en el contrato.
        *   **Error al registrar votantes (`batchRegisterVoters`):**
            *   Formato incorrecto de `voterIdentifier`s.
            *   Error de conexión con el contrato.
        *   **Error al establecer Raíz de Merkle (`setMerkleRoot`):**
            *   Raíz ya establecida.
            *   Raíz en formato incorrecto (debe ser `bytes32`).
            *   Error de permisos.
        *   **Error al establecer Dirección del Verificador (`setVerifier`):**
            *   No es el `owner` del contrato `VotingSystem`.
            *   Dirección inválida.
    *   4.3. Problemas Generales del Sistema
        *   **API Backend no responde:**
            *   Verificar estado del proceso del servidor Node.js.
            *   Consultar logs del servidor (stdout, stderr, archivos de log).
        *   **Error de conexión a MongoDB:**
            *   Verificar string de conexión y estado del servidor MongoDB.
        *   **Error de conexión al Nodo Ethereum:**
            *   Verificar URL RPC y estado del nodo.
5.  Recolección de Logs
    *   **Frontend:** Capturas de pantalla de la consola del navegador. Archivos HAR.
    *   **Backend:** Logs de la aplicación Node.js (configurados en `server.js` o gestor de procesos). Logs de MongoDB. Logs del nodo Ethereum.
    *   **Blockchain:** Hashes de transacción para análisis en explorador de bloques.
6.  Escalación de Problemas
    *   Nivel 1 (Help Desk Piloto): Recopilación inicial de información, guías básicas.
    *   Nivel 2 (Equipo Técnico Piloto): Análisis de logs, interacción con backend/contrato.
    *   Nivel 3 (Desarrolladores Principales): Problemas de código, bugs profundos.
7.  Lista de Contactos del Equipo Técnico del Piloto
    *   Nombre | Rol | Email | Teléfono (interno)

---
## Muestras de Contenido

### Sección 2.2: Flujo de Datos Clave - Flujo de voto anónimo (Votante)

1.  **Autenticación:** Votante conecta MetaMask -> Frontend obtiene `userAddress` y `voterIdentifier` (mockeado/obtenido del backend post-login).
2.  **Selección:** Votante selecciona elección y candidato en la UI.
3.  **Preparación ZK (Cliente):**
    *   Frontend (UI) solicita prueba de Merkle al Backend (`GET /api/voters/:electionId/merkle-proof`) enviando JWT.
    *   Backend (`merkleController`):
        *   Obtiene `voterIdentifier` del usuario (del JWT o BD).
        *   Recupera todos los `voterIdentifier`s de la elección (de BD).
        *   Construye árbol de Merkle (con Poseidon, usando `merkleTreeUtils.js`).
        *   Genera prueba de Merkle (hermanos + índices de posición) para el `voterIdentifier` del usuario.
        *   Responde con `{ merklePath, merklePathIndices, merkleRoot }`.
    *   Frontend (`zkService.js`):
        *   Genera `voteNonce` (aleatorio).
        *   Calcula `nullifierHash = Poseidon(voterSecret, electionId)`. (Usa `voterSecret` mockeado).
        *   Calcula `voteCommitment = Poseidon(candidateId, voteNonce)`.
        *   Prepara inputs para `snarkjs.fullProve` (todos como strings decimales).
4.  **Generación de Prueba ZK (Cliente - Simulado en Piloto):**
    *   Frontend (`zkService.js`): Llama a `snarkjs.groth16.fullProve` con inputs y paths a `vote.wasm`, `vote_final.zkey` (placeholders).
    *   **Resultado Esperado Piloto:** `snarkjs.fullProve` fallará debido a placeholders. Si pasara, se verificarían `publicSignals`.
5.  **Envío de Transacción (Cliente):**
    *   Frontend (`VotingInterface.js`): Prepara la llamada a `VotingSystem.anonymousVote` con la prueba ZK (simulada) y los `publicInputs` (merkleRoot, nullifierHash, voteCommitment como `bytes32`).
    *   Usuario firma y envía la transacción vía MetaMask.
6.  **Validación (Contrato):**
    *   `VotingSystem.sol`:
        *   Verifica `merkleRoot` contra el almacenado.
        *   Verifica que `nullifierHash` no haya sido usado.
        *   Llama a `Verifier.sol#verifyProof` con la prueba y los `publicInputs` (convertidos a `uint256`).
    *   `Verifier.sol` (Placeholder): Ejecuta lógica de verificación stub (retorna `true`).
    *   **Resultado Esperado Piloto:** Si `snarkjs.fullProve` no falló antes, la transacción probablemente revertirá aquí con "Prueba ZK invalida" si el Verifier tuviera lógica real, o pasará si el Verifier es un simple stub `true`. Si el verifier es el placeholder actual, es más probable que "pase" si los inputs no son cero.
7.  **Almacenamiento Post-Voto (Cliente):** Si la transacción es exitosa, el frontend guarda `electionId`, `candidateId`, `voteCommitment` en `localStorage` para la fase de revelación.

### Sección 4.1: Problemas del Votante - Error: "Error generando prueba ZK: snarkjs no encontrado / error en fullProve"

**Causa Raíz:**
*   El error "snarkjs not found" indica que la librería `snarkjs` no está disponible en el entorno del navegador del votante. Esto puede ocurrir si el script que carga `snarkjs` (usualmente desde `index.html` o un import dinámico) falló o no está configurado.
*   Un error "error in fullProve" (o un error más específico arrojado por `snarkjs.groth16.fullProve`) generalmente significa que `snarkjs` sí se cargó, pero falló al intentar generar la prueba.

**Pasos de Diagnóstico y Solución (Piloto):**
1.  **Verificar Carga de `snarkjs`:**
    *   Pedir al votante que abra la consola de desarrollador del navegador (usualmente F12).
    *   En la consola, escribir `window.snarkjs` y presionar Enter. Si devuelve `undefined` o un error, la librería no se cargó.
    *   **Acción L1/L2:** Verificar la conexión a internet del usuario. Pedir refrescar la página. Si persiste, escalar a L3 para revisar la configuración de carga de `snarkjs` en la PWA.
2.  **Error en `fullProve` (Esperado en Piloto con Placeholders):**
    *   **Contexto del Piloto:** En la fase actual del piloto, los archivos `vote.wasm` y `vote_final.zkey` son **placeholders** y no contienen datos criptográficos reales. Por lo tanto, `snarkjs.groth16.fullProve` **está destinado a fallar**.
    *   **Mensaje de Error Típico:** El error puede variar, pero podría ser sobre "invalid key format", "wasm structure error", "failed to compile circuit", o un error más genérico de `snarkjs`.
    *   **Acción L1/L2:**
        *   Informar al votante que este es un comportamiento esperado en la fase actual del piloto debido al uso de activos de prueba simulados para la generación de pruebas ZK.
        *   Explicar que el propósito es probar el flujo de la aplicación y la interacción con el contrato hasta el punto de la generación de la prueba.
        *   Asegurar al votante que en un entorno de producción, con los activos ZK reales, este error no ocurriría.
        *   **NO escalar como bug** a menos que el error sea "snarkjs not found" (ver punto 1).
3.  **Verificar Inputs a `fullProve` (Diagnóstico L2/L3):**
    *   Si se sospecha un error más allá de los placeholders (ej. en una fase posterior con activos reales), los logs de la consola del cliente son cruciales. El `zkService.js` debería loguear los `circuitInputs` justo antes de llamar a `snarkjs.groth16.fullProve`.
    *   Verificar que todos los inputs (especialmente los hashes y números grandes) estén formateados como **strings decimales**. Los paths a `.wasm` y `.zkey` deben ser correctos (`/zk/vote.wasm`, `/zk/vote_final.zkey`).

### Sección 5: Recolección de Logs - Frontend

*   **Consola del Navegador:** Es la fuente principal de información para errores del lado del cliente.
    *   Pedir al usuario que abra la consola (F12 en la mayoría de navegadores, ir a la pestaña "Consola").
    *   Buscar mensajes de error (en rojo), warnings (en amarillo) y logs informativos (azules o blancos) que son emitidos por la aplicación (ej. `[zkService] ...`, `[VotingInterface] ...`).
    *   **Captura de Pantalla:** Solicitar una captura de pantalla completa de la consola, asegurándose de que los mensajes de error sean visibles.
    *   **Copiar Texto:** Si es posible, pedir al usuario que copie y pegue los mensajes de error relevantes como texto.
*   **Network Tab:** Para problemas de API (ej. "Fallo al obtener prueba de Merkle").
    *   En herramientas de desarrollador, ir a la pestaña "Red" o "Network".
    *   Reproducir el error.
    *   Buscar la llamada API fallida (usualmente en rojo). Seleccionarla y ver las pestañas "Headers", "Payload" (o "Request"), y "Response" para entender el error.
    *   **Captura de Pantalla:** De la fila de la API fallida y su detalle de respuesta.
*   **LocalStorage Data (para problemas de revelación):**
    *   En herramientas de desarrollador, ir a la pestaña "Aplicación" (o "Storage" en Firefox).
    *   Navegar a "Almacenamiento Local" -> dominio de la aplicación.
    *   Buscar claves como `pendingReveal_ELECTIONID_USERADDRESS`.
    *   **Captura de Pantalla:** Del valor almacenado si es relevante para el problema.
---
