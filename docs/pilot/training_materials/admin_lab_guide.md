# Guía de Laboratorio Práctico para Administradores del Piloto JCE
# Sistema de Votación Electrónica Blockchain

## Introducción
Este laboratorio práctico le guiará a través del ciclo de vida completo de una elección en el sistema piloto de votación electrónica. Utilizará el Panel de Administración en un entorno de prueba para realizar cada paso.

**Objetivos:**
*   Familiarizarse con todas las funciones del Panel de Administración.
*   Comprender el flujo de trabajo para configurar y gestionar una elección piloto.
*   Practicar la resolución de problemas simulados.

**Entorno:**
*   URL del Panel de Administración del Piloto (Entorno de Pruebas): `[URL_DEL_PANEL_DE_PRUEBAS]`
*   Credenciales/Wallet de Administrador de Pruebas: `[INFO_ACCESO_ADMIN_PRUEBAS]`
*   Red de Prueba Blockchain: `[NOMBRE_RED_PRUEBA]` (Ej. Sepolia, Hardhat Local)
*   Explorador de Bloques de Prueba: `[URL_EXPLORADOR_BLOQUES_PRUEBA]`

---
## Módulo 1: Configuración Inicial del Contrato (Realizado una vez por el Admin Principal/Técnico)

*   **Ejercicio 1.1: Desplegar y Configurar Dirección del Contrato Verificador**
    1.  **Contexto:** El contrato `VotingSystem.sol` necesita conocer la dirección del contrato `Verifier.sol` desplegado para la verificación de pruebas ZK (aunque en el piloto el `Verifier.sol` sea un stub).
    2.  **Acción (Simulada o Real):**
        *   Si aún no está desplegado, el equipo técnico despliega `Verifier.sol`. Anote su dirección.
        *   En el Panel de Admin (o mediante un script/herramienta especial), acceda a la función para configurar la dirección del Verificador.
        *   **Panel:** Navegue a "Configuración del Sistema" -> "Parámetros ZK" (o similar).
        *   Ingrese la dirección del `Verifier.sol` desplegado.
        *   Guarde/Envíe la transacción (esto llama a `setVerifier` en `VotingSystem.sol`).
    3.  **Verificación:**
        *   Confirme en el panel que la dirección fue guardada.
        *   Opcional: Verifique en el explorador de bloques leyendo la variable `verifier` del contrato `VotingSystem.sol`.
    4.  **Notas del Participante:**
        *   Dirección del `Verifier.sol` utilizada: _________________________
        *   Hash de la transacción (si aplica): _________________________
        *   Observaciones:

---
## Módulo 2: Creación y Configuración de una Elección Piloto

*   **Ejercicio 2.1: Crear una Nueva Elección**
    1.  **Acción:**
        *   En el Panel de Admin, vaya a "Elecciones" -> "Crear Nueva Elección".
        *   Complete el formulario:
            *   Título: `Elección Piloto de Prueba - [Su Nombre]`
            *   Descripción: `Ejercicio práctico del taller de administradores.`
            *   Fecha y Hora de Inicio: Elija una fecha/hora para dentro de 1 hora.
            *   Fecha y Hora de Fin: Elija una fecha/hora para dentro de 3 horas.
        *   Envíe el formulario para crear la elección.
    2.  **Verificación:**
        *   La elección debe aparecer en la lista de elecciones. Anote el ID de la elección asignado.
        *   Verifique los detalles en el panel.
        *   Opcional: Verifique en el explorador de bloques que la elección fue creada (evento `ElectionCreated`).
    3.  **Notas del Participante:**
        *   ID de la Elección Piloto: _________________________
        *   Hash de la transacción: _________________________
        *   Observaciones:

*   **Ejercicio 2.2: Añadir Candidatos a la Elección**
    1.  **Acción:**
        *   Seleccione la elección creada en el ejercicio anterior.
        *   Vaya a la sección "Gestionar Candidatos".
        *   Añada al menos 3 candidatos ficticios. Ejemplo:
            *   Candidato A: `Nombre: "Partido de la Innovación"`, `Descripción: "Propuestas enfocadas en tecnología."`
            *   Candidato B: `Nombre: "Alianza por la Educación"`, `Descripción: "Priorizando el desarrollo educativo."`
            *   Candidato C: `Nombre: "Frente Verde Sostenible"`, `Descripción: "Iniciativas para el medio ambiente."`
    2.  **Verificación:**
        *   Los candidatos deben aparecer listados bajo la elección en el panel.
        *   Opcional: Verifique los eventos `CandidateAdded` en el explorador de bloques.
    3.  **Notas del Participante:**
        *   Observaciones:

*   **Ejercicio 2.3: Registrar Votantes (Identificadores `voterIdentifier`)**
    1.  **Contexto:** Para este piloto, usaremos una lista predefinida de `voterIdentifier`s de prueba.
        *   Lista de `voterIdentifier`s de prueba (ejemplos, usar los provistos en el taller):
            *   `0x1111111111111111111111111111111111111111111111111111111111111111`
            *   `0x2222222222222222222222222222222222222222222222222222222222222222`
            *   `0x3333333333333333333333333333333333333333333333333333333333333333`
    2.  **Acción:**
        *   En el panel, seleccione su elección piloto.
        *   Vaya a "Gestión de Votantes" -> "Registro por Lotes".
        *   Copie y pegue la lista de `voterIdentifier`s de prueba en el campo correspondiente.
        *   Inicie el proceso de registro por lotes.
    3.  **Verificación:**
        *   El panel debe indicar que el proceso fue exitoso y cuántos votantes se registraron.
        *   El backend debe haber almacenado estos identificadores en su base de datos para esta elección.
        *   Opcional: Verifique los eventos `VoterRegistered` en el explorador de bloques.
    4.  **Notas del Participante:**
        *   Número de votantes registrados: _________
        *   Observaciones:

*   **Ejercicio 2.4: Generar y Establecer la Raíz de Merkle**
    1.  **Contexto:** Este paso es crucial y debe realizarse DESPUÉS de que TODOS los votantes hayan sido registrados y ANTES de que la elección inicie.
    2.  **Acción:**
        *   En el panel, dentro de la gestión de su elección piloto, busque la opción "Gestionar Padrón Anónimo" o "Configurar Merkle Tree".
        *   Active la función "Calcular Raíz de Merkle" (esto es una acción del backend).
        *   El sistema mostrará la raíz calculada. Anótela.
        *   Active la función "Establecer Raíz de Merkle en Contrato".
    3.  **Verificación:**
        *   El panel debe confirmar que la raíz fue establecida en el contrato.
        *   Anote el hash de la transacción.
        *   Opcional: Verifique en el explorador de bloques que `elections(ID_PILOTO).merkleRoot` ahora tiene el valor que anotó.
    4.  **Notas del Participante:**
        *   Raíz de Merkle Calculada/Establecida: `0x_________________________________`
        *   Hash de la transacción: _________________________
        *   Observaciones:

---
## Módulo 3: Simulación de Votación y Revelación (Requiere Interacción con PWA de Votante)

*   **Ejercicio 3.1: Emitir Votos Anónimos (como votante de prueba)**
    1.  **Contexto:** Use la PWA de Votante y el `Manual de Usuario del Votante del Piloto`. Necesitará MetaMask configurado con cuentas de votantes de prueba cuyos `voterIdentifier`s fueron registrados y ETH de prueba.
    2.  **Acción:**
        *   Para cada `voterIdentifier` de prueba que registró, simule el proceso de votación:
            *   Conecte la wallet correspondiente al `voterIdentifier` (el frontend simula este enlace).
            *   Seleccione su elección piloto.
            *   Elija un candidato diferente para cada voto de prueba.
            *   Complete el proceso de `anonymousVote`. Observe los pasos en la UI y MetaMask.
            *   Anote el `voteCommitment` y el `candidateId` que el frontend indica que guardó en `localStorage` (o simule guardarlos).
    3.  **Verificación (Admin Panel):**
        *   En el Panel de Admin, monitoree su elección. El número de "Votos Anónimos Emitidos" (o `voteCommitments` registrados) debe incrementar.
    4.  **Notas del Participante:**
        *   Voto 1: Candidato ID ___, Commitment `0x_________________`
        *   Voto 2: Candidato ID ___, Commitment `0x_________________`
        *   Voto 3: Candidato ID ___, Commitment `0x_________________`
        *   Observaciones durante la votación:

*   **Ejercicio 3.2: Finalizar el Período de Votación**
    1.  **Contexto:** Espere (o simule que ha pasado el tiempo) hasta que la `endTime` de su elección piloto haya llegado.
    2.  **Acción:**
        *   En el Panel de Admin, seleccione su elección.
        *   Active la función "Cerrar Período de Votación" (llama a `endElection`).
    3.  **Verificación:**
        *   El estado de la elección en el panel debe cambiar a "Cerrada" o "Inactiva".
        *   La PWA de Votante ya no debe permitir votar en esta elección.
    4.  **Notas del Participante:**
        *   Observaciones:

*   **Ejercicio 3.3: Revelar Votos (como votante de prueba)**
    1.  **Contexto:** Ahora comienza el período de revelación (simulado).
    2.  **Acción:**
        *   Para cada voto de prueba que emitió:
            *   Acceda a la PWA de Votante con la wallet correspondiente.
            *   Navegue a la elección piloto.
            *   Use la función "Revelar mi Voto".
            *   El sistema debería usar el `candidateId` y `voteCommitment` guardados para llamar a la API de revelación.
            *   Observe el proceso y confirme la transacción si es necesario (depende del método de firma para revelación).
    3.  **Verificación (Admin Panel):**
        *   En el Panel de Admin, el conteo de votos para los candidatos correspondientes debería empezar a actualizarse a medida que se revelan los votos.
        *   Opcional: Verifique eventos `VoteRevealed` en el explorador de bloques.
    4.  **Notas del Participante:**
        *   Observaciones durante la revelación:

---
## Módulo 4: Finalización y Resultados

*   **Ejercicio 4.1: Finalizar Resultados de la Elección**
    1.  **Contexto:** Una vez concluido el período de revelación.
    2.  **Acción:**
        *   En el Panel de Admin, seleccione su elección piloto.
        *   Active la función "Finalizar y Publicar Resultados" (llama a `finalizeResults`).
    3.  **Verificación:**
        *   El estado de la elección debe cambiar a "Resultados Finalizados".
        *   La PWA de Votante ya no debe permitir revelar votos para esta elección.
        *   Los conteos de votos para los candidatos deben estar fijos.
    4.  **Notas del Participante:**
        *   Observaciones:

*   **Ejercicio 4.2: Ver y Exportar Resultados**
    1.  **Acción:**
        *   En el Panel de Admin, vea la sección de resultados para su elección piloto.
        *   Si la opción está disponible, intente exportar los resultados.
    2.  **Verificación:**
        *   Compare los resultados mostrados con los votos que usted simuló y reveló. Deben coincidir.
    3.  **Notas del Participante:**
        *   Resultados finales observados: _________________________

---
## Módulo 5: Conclusión del Laboratorio
*   Discusión de observaciones.
*   Preguntas y respuestas.
*   Feedback sobre el proceso y el panel.

---
## Muestras de Contenido Específico

### Ejercicio 2.4: Generar y Establecer la Raíz de Merkle
**Acción (Detallada):**
1.  **Confirmar Cierre de Registro:** Antes de proceder, asegúrese de que no se añadirán más `voterIdentifier`s a esta elección. En un escenario real, esto sería un punto de corte definido. Para el laboratorio, simplemente asegúrese de haber completado el Ejercicio 2.3.
2.  **Navegar:** En el Panel de Administración, seleccione su "Elección Piloto de Prueba". Diríjase a la sub-sección "Configuración de Voto Anónimo" o "Padrón ZK".
3.  **Calcular Raíz (Backend):** Verá un botón etiquetado como "Preparar Padrón Anónimo" o "Calcular Raíz de Merkle". Al hacer clic:
    *   El sistema backend tomará todos los `voterIdentifier`s que usted registró para ESTA elección en la base de datos.
    *   Utilizará la librería `merkleTreeUtils.js` (con Poseidon) para construir el árbol y obtener su raíz.
    *   **Nota:** Este proceso es solo en el backend; no hay transacción blockchain aún.
4.  **Visualizar y Confirmar Raíz:** El panel mostrará la Raíz de Merkle calculada (ej. `0x123abc...789def`). Anote este valor exacto. Es una huella digital única de su padrón.
    *   *(Simulación de captura de pantalla: [Panel mostrando ID Elección: XX, Raíz Calculada: 0x123abc...789def, Botón: "Establecer Raíz en Contrato"])*
5.  **Establecer Raíz en Contrato:** Haga clic en el botón "Establecer Raíz en Contrato".
    *   El backend ahora tomará esta raíz y llamará a la función `setMerkleRoot(ID_PILOTO, SU_RAIZ_ANOTADA)` del contrato `VotingSystem.sol`.
    *   Se le podría pedir confirmación adicional. Apruebe.
    *   Se enviará una transacción a la blockchain.

### Ejercicio 3.1: Emitir Votos Anónimos (como votante de prueba)
**Anote el `voteCommitment` y el `candidateId`...**
*   Después de que la transacción `anonymousVote` sea confirmada por MetaMask y la PWA de Votante muestre "¡Voto anónimo registrado exitosamente!", la aplicación (según fue diseñada en el paso anterior) habrá guardado ciertos datos en el `localStorage` de su navegador.
*   **Para fines del laboratorio y entender el flujo:**
    1.  Abra las herramientas de desarrollador de su navegador (F12).
    2.  Vaya a la pestaña "Aplicación" (o "Storage" en Firefox).
    3.  Busque "Almacenamiento Local" y seleccione el dominio de la PWA.
    4.  Busque una clave similar a `pendingReveal_IDDELAELECCION_DIRECCIONDELWALLET`. Ejemplo: `pendingReveal_0_0xf39...2266`.
    5.  El valor será un JSON. Cópielo y péguelo en sus notas. Debería lucir así:
        `{"electionId":"0","candidateId":"1","voteCommitment":"0xCOMMITMENT_GENERADO"}`
    *   Anote el `candidateId` y el `voteCommitment` para cada uno de sus votos de prueba. Estos serán necesarios para simular la revelación. En un escenario real, el usuario no necesitaría hacer esto manualmente, pero es útil para que usted como administrador entienda qué se guarda.
---
