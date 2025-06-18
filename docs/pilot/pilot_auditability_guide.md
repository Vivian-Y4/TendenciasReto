# Guía Simplificada de Auditabilidad del Piloto - Sistema de Votación Electrónica

## Tabla de Contenidos

1.  Introducción
    *   Propósito de esta guía
    *   Conceptos clave: Blockchain, Smart Contracts, Transparencia
    *   Herramientas necesarias: Explorador de Bloques de la red de prueba
2.  Información Esencial de la Elección Piloto
    *   Dirección del Contrato Principal (`VotingSystem.sol`)
    *   Dirección del Contrato Verificador (`Verifier.sol`)
    *   Enlace al Explorador de Bloques de la Red de Prueba
3.  Auditoría de la Configuración de la Elección
    *   3.1. Verificación de Parámetros de la Elección
        *   Cómo consultar `elections(electionId)` en el contrato `VotingSystem.sol`.
        *   Campos a observar: `title`, `description`, `startTime`, `endTime`, `isActive`, `resultsFinalized`, `merkleRoot`.
    *   3.2. Verificación de la Lista de Candidatos
        *   Cómo consultar `getCandidate(electionId, candidateId)` para cada candidato.
        *   Campos a observar: `name`, `description`.
    *   3.3. Verificación de la Raíz de Merkle (`merkleRoot`)
        *   Importancia de la `merkleRoot` para el padrón anónimo.
        *   Cómo verificar que fue establecida antes del inicio de la votación.
    *   3.4. Verificación de la Dirección del Contrato Verificador
        *   Cómo consultar la variable `verifier` en `VotingSystem.sol`.
4.  Auditoría Durante el Período de Votación Anónima
    *   4.1. Seguimiento de Votos Anónimos Emitidos (Compromisos)
        *   Escuchar/filtrar el evento `AnonymousVoteCast(electionId, nullifierHash, voteCommitment)`.
        *   Cada evento representa un voto anónimo emitido y aceptado por el sistema.
        *   Conteo de `voteCommitments` únicos para verificar `totalVotes` en el contrato.
    *   4.2. Verificación de Nulificadores Usados
        *   Observar que los `nullifierHash` en los eventos `AnonymousVoteCast` son únicos por elección.
        *   El contrato previene el doble voto usando el mapping `usedNullifiers`.
5.  Auditoría Durante la Fase de Revelación de Votos
    *   5.1. Seguimiento de Votos Revelados
        *   Escuchar/filtrar el evento `VoteRevealed(electionId, voteCommitment, candidateId)`.
        *   Cada evento indica que un compromiso de voto previamente anónimo ha sido asociado a un candidato.
    *   5.2. Verificación de la Consistencia de la Revelación
        *   El `voteCommitment` en `VoteRevealed` debe coincidir con un `voteCommitment` de un evento `AnonymousVoteCast` previo para la misma elección.
        *   El contrato previene la doble revelación del mismo `voteCommitment` usando el mapping `revealedVoteCommitments`.
6.  Auditoría de los Resultados Finales
    *   6.1. Conteo Manual de Votos Revelados
        *   Agrupar los eventos `VoteRevealed` por `candidateId`.
        *   Sumar los votos para cada candidato.
    *   6.2. Comparación con Resultados del Contrato
        *   Consultar `getElectionResults(electionId)` en el contrato.
        *   Los resultados del contrato (basados en `candidates[candidateId].voteCount`) deben coincidir con el conteo manual de eventos `VoteRevealed`.
    *   6.3. Verificación del Estado `resultsFinalized`
        *   Confirmar que la elección está marcada como `resultsFinalized = true` después del conteo y publicación.
7.  Limitaciones de Auditabilidad en el Piloto
    *   Pruebas ZK-SNARK (Verificación de Pruebas):
        *   El contrato `Verifier.sol` en el piloto utiliza stubs/placeholders para la verificación de pruebas ZK. No realiza una validación criptográfica completa de la prueba de voto anónimo.
        *   Por lo tanto, la validez individual de cada voto anónimo (más allá de la unicidad del nulificador y la pertenencia al Merkle tree) no puede ser auditada criptográficamente en esta fase piloto.
    *   Generación de Claves ZK (Trusted Setup):
        *   El piloto utiliza claves de prueba (`.zkey` placeholder) o un setup de desarrollador. No se ha realizado una ceremonia de "trusted setup" multipartita para generar las claves de producción.
8.  Conclusión y Próximos Pasos (Conceptuales para un sistema real)

---
## Muestras de Contenido

### Sección 3.1: Verificación de Parámetros de la Elección

Para verificar los detalles de una elección específica del piloto, necesitará el `ID de la Elección` (un número, por ejemplo, `0` para la primera elección) y la dirección del contrato `VotingSystem.sol`.

1.  **Acceda al Explorador de Bloques:** Abra el explorador de bloques de la red de prueba (ej. Etherscan para Sepolia, o el explorador de su nodo Hardhat local).
2.  **Busque el Contrato:** Ingrese la dirección del contrato `VotingSystem.sol` en la barra de búsqueda del explorador.
3.  **Pestaña "Contract" o "Read Contract":** Navegue a la sección que le permite interactuar con las funciones de lectura del contrato.
4.  **Función `elections`:** Busque la función o mapeo público `elections`. Ingrese el `ID de la Elección` que desea auditar.
    *   *(Captura de pantalla mostrando cómo interactuar con la función `elections(ID)` en Etherscan o similar).*
5.  **Revise los Datos:** El explorador mostrará los valores almacenados para esa elección. Compare los siguientes campos con la información oficial publicada para el piloto:
    *   `title` (string): Nombre de la elección.
    *   `description` (string): Descripción.
    *   `startTime` (uint256): Timestamp Unix del inicio. Conviértalo a fecha/hora legible.
    *   `endTime` (uint256): Timestamp Unix del fin.
    *   `isActive` (bool): `true` si la votación está en curso, `false` si no ha iniciado o ya terminó.
    *   `resultsFinalized` (bool): `true` si los resultados ya fueron cerrados y publicados.
    *   `merkleRoot` (bytes32): La raíz del árbol de Merkle de los votantes registrados. Este valor es crucial para la votación anónima. Verifique que se haya establecido antes del `startTime`.

### Sección 4.1: Seguimiento de Votos Anónimos Emitidos (Compromisos)

Durante el período de votación, cada vez que un votante emite un voto anónimo de manera exitosa, el contrato `VotingSystem.sol` emite un evento `AnonymousVoteCast`.

1.  **Acceda al Contrato en el Explorador de Bloques:** Como en la sección anterior.
2.  **Pestaña "Events" o "Logs":** Busque la sección de eventos del contrato.
3.  **Filtre por Evento `AnonymousVoteCast`:**
    *   Seleccione el evento `AnonymousVoteCast` de la lista de eventos disponibles del contrato.
    *   Puede filtrar por `electionId` para ver solo los votos de la elección del piloto.
    *   *(Captura de pantalla mostrando el filtro de eventos y la lista de eventos `AnonymousVoteCast`)*.
4.  **Datos por Evento:** Cada evento `AnonymousVoteCast` registrado mostrará:
    *   `electionId` (uint256): El ID de la elección.
    *   `nullifierHash` (bytes32): Un valor único que previene que el mismo votante (secreto) vote dos veces. Todos estos deben ser distintos para una misma elección.
    *   `voteCommitment` (bytes32): Un "compromiso" criptográfico con el voto emitido. Este valor es secreto y no revela el voto, pero se usará en la fase de revelación.
5.  **Conteo:** El número total de eventos `AnonymousVoteCast` para una `electionId` dada representa el número total de votos anónimos recibidos y aceptados por el contrato hasta el momento. Este número puede compararse con el campo `totalVotes` de la elección.

### Sección 7: Limitaciones de Auditabilidad en el Piloto

Es importante que los observadores y auditores del programa piloto comprendan las siguientes limitaciones inherentes a esta fase específica, especialmente en relación con las pruebas de conocimiento cero (ZK-SNARKs):

*   **Verificación de Pruebas ZK:** El contrato `Verifier.sol` desplegado para este piloto **es una plantilla estructural o un stub**. No contiene las claves de verificación criptográficas reales ni la lógica completa de apareamiento de curvas elípticas necesaria para validar las pruebas ZK-SNARKs generadas por los votantes. En su lugar, puede devolver `true` por defecto o realizar comprobaciones muy básicas.
    *   **Implicación:** No se puede verificar criptográficamente en la cadena de bloques que cada "prueba ZK" enviada durante la función `anonymousVote` sea válida y corresponda a un voto legítimo según las reglas del circuito `vote.circom`. La confianza se deposita en que el flujo de la aplicación y la generación simulada de la prueba se están probando, no la validez criptográfica completa de cada prueba individual.
*   **Activos ZK (WASM y Clave de Prueba):** Los archivos `.wasm` (circuito compilado para el navegador) y `.zkey` (clave de prueba) que utiliza el frontend para la generación de pruebas (simulada o real con `snarkjs`) son también **placeholders o activos generados en un entorno de desarrollo no ceremonial**.
    *   **Implicación:** La generación de la prueba en el cliente, incluso si se ejecutara `snarkjs.fullProve`, no sería contra un sistema de claves de producción con un "trusted setup" multipartito.

Estas limitaciones son intencionadas para simplificar el despliegue y las pruebas del flujo general del sistema en la fase piloto. Una implementación de producción requeriría la generación segura y ceremonial de claves ZK y el despliegue de un contrato `Verifier.sol` completamente funcional y específico para el circuito.
---
