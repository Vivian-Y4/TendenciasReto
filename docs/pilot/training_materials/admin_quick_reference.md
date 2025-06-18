# Guía de Referencia Rápida para Administradores del Piloto JCE
# Sistema de Votación Electrónica Blockchain

---
## Flujo Esencial de Gestión de Elección Piloto

1.  **Crear Elección:**
    *   Panel Admin -> "Elecciones" -> "Crear Nueva Elección".
    *   **Campos:** Título, Descripción, Fecha/Hora Inicio, Fecha/Hora Fin.
    *   **Contrato:** Llama a `createElection`.
    *   **Importante:** Definir fechas/horas con cuidado.

2.  **Añadir Candidatos:**
    *   Panel Admin -> Elección específica -> "Gestionar Candidatos".
    *   **Campos:** Nombre, Descripción.
    *   **Contrato:** Llama a `addCandidate`.
    *   **Importante:** Hacer ANTES de iniciar la elección.

3.  **Registrar Votantes (`voterIdentifier`s):**
    *   Panel Admin -> Elección específica -> "Gestión de Votantes" -> "Registro por Lotes".
    *   **Input:** Lista de `voterIdentifier`s (formato `0x...` de 64 caracteres hexadecimales).
    *   **Contrato:** Llama a `batchRegisterVoters`. Backend también guarda en BD.
    *   **Importante:** Completar ANTES de calcular/fijar la Raíz de Merkle. Este es el padrón.

4.  **Calcular y Fijar Raíz de Merkle:**
    *   Panel Admin -> Elección específica -> "Configurar Merkle Tree" / "Padrón Anónimo".
    *   Paso 1: Botón "Calcular Raíz de Merkle" (acción backend, usa `voterIdentifier`s de BD).
    *   Paso 2: Botón "Establecer Raíz en Contrato" (envía la raíz calculada).
    *   **Contrato:** Llama a `setMerkleRoot`.
    *   **CRÍTICO:** Hacer DESPUÉS del registro de votantes y ANTES del inicio de la votación. No se puede cambiar.

5.  **(Setup Único) Establecer Dirección del Verificador ZK:**
    *   Panel Admin -> "Configuración del Sistema" (o similar) -> "Parámetros ZK".
    *   **Input:** Dirección del contrato `Verifier.sol` desplegado.
    *   **Contrato:** Llama a `setVerifier` (requiere rol de Propietario).
    *   **Importante:** Se hace una sola vez para el sistema, a menos que el Verificador cambie.

6.  **Monitorear Votación:**
    *   Panel Admin -> Elección específica -> "Monitor" o "Dashboard".
    *   Ver `totalVotes` (compromisos anónimos) incrementarse.

7.  **Cerrar Período de Votación:**
    *   Panel Admin -> Elección específica.
    *   Botón "Cerrar Período de Votación".
    *   **Contrato:** Llama a `endElection`.
    *   **Importante:** Hacer cuando `endTime` se haya alcanzado, o manualmente si es necesario.

8.  **Supervisar Período de Revelación:**
    *   Comunicar a votantes cuándo inicia y termina.
    *   Panel Admin: (Opcional) Monitorear votos revelados si el backend provee esta data.

9.  **Finalizar Resultados:**
    *   Panel Admin -> Elección específica.
    *   Botón "Finalizar y Publicar Resultados".
    *   **Contrato:** Llama a `finalizeResults`.
    *   **Importante:** Hacer DESPUÉS del período de revelación. Congela los conteos.

10. **Ver Resultados:**
    *   Panel Admin -> Elección específica -> "Resultados".
    *   Ver conteos por candidato.

---
## Troubleshooting Rápido (Admin)

*   **Transacción Falla en MetaMask (o desde backend):**
    *   **Gas Insuficiente:** La cuenta admin del backend (`ADMIN_SIGNER_PRIVATE_KEY`) necesita ETH de prueba.
    *   **Revert de Contrato:** El mensaje de error en el panel o en el explorador de bloques puede dar una pista (ej. "Merkle root ya establecido", "La eleccion ya ha comenzado").
*   **Raíz de Merkle no se puede establecer:**
    *   ¿Ya se estableció antes? (Solo se permite una vez).
    *   ¿Se intenta después de que la elección inició? (Algunos sistemas lo previenen).
*   **Votantes no pueden votar anónimamente:**
    *   ¿Se estableció la Raíz de Merkle en el contrato ANTES del inicio?
    *   ¿Está la dirección del `Verifier.sol` correcta en `VotingSystem.sol`?
    *   ¿Está la elección activa (`isActive == true` y dentro de `startTime`/`endTime`)?
*   **Resultados no se actualizan tras revelación:**
    *   Verificar que las llamadas a `revealVote` en el backend están siendo exitosas (logs del backend, eventos `VoteRevealed` en blockchain).
    *   Asegurar que no se ha llamado a `finalizeResults` prematuramente.

---
## Contactos de Soporte Piloto

*   **Soporte Técnico Nivel 1 (Panel/Flujo):** `[Email o Sistema de Tickets]` / `[Teléfono]`
*   **Soporte Técnico Nivel 2 (Contrato/Blockchain):** `[Email Escalación]`
*   **Coordinador del Piloto JCE:** `[Nombre y Contacto]`

---
## Muestras de Contenido Específico

### Flujo Esencial: 3. Registrar Votantes (`voterIdentifier`s)
*   **Panel:** Elección -> "Gestión Votantes" -> "Registro Lotes".
*   **Acción:** Pegar lista de `0x...` (IDs de 32 bytes) o subir archivo.
*   **Click:** "Iniciar Registro".
*   **Verificar:** Mensaje de éxito. Backend guarda en DB. Contrato emite eventos `VoterRegistered`.
*   **Clave:** ANTES de fijar Raíz Merkle.

### Troubleshooting: Votantes no pueden votar anónimamente
*   **Check #1: Raíz de Merkle.** ¿Se fijó en `VotingSystem.sol` para esta elección? Use el Panel Admin para verificar el estado de la raíz o un explorador de bloques para ver `elections(ID).merkleRoot`. Debe ser un valor `bytes32` distinto de cero.
*   **Check #2: Verifier.** ¿La dirección del `Verifier.sol` está configurada en `VotingSystem.sol`? Use el Panel o explorador para ver `votingSystem.verifier()`.
*   **Check #3: Estado Elección.** ¿Está la elección activa? (Panel o `elections(ID).isActive` y comparar `block.timestamp` con `startTime`/`endTime`).
---
