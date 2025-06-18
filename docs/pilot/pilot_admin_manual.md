# Manual del Administrador/Operador del Piloto - Sistema de Votación Electrónica JCE

## Tabla de Contenidos

1.  Introducción
    *   Propósito de este manual
    *   Roles y responsabilidades del administrador/operador del piloto
    *   Descripción general del sistema y flujo de trabajo del piloto
2.  Acceso al Panel de Administración
    *   URL del panel de administración
    *   Credenciales de acceso (si aplica, o vía wallet específica)
    *   Medidas de seguridad para cuentas de administrador
3.  Gestión de Elecciones (Contrato y Backend)
    *   3.1. Creación de una Nueva Elección Piloto
        *   Acceder a la sección "Crear Elección".
        *   Campos: Título, Descripción, Fecha/Hora de Inicio, Fecha/Hora de Fin.
        *   Confirmación y envío de la transacción al contrato (vía backend API).
    *   3.2. Adición de Candidatos a una Elección
        *   Seleccionar la elección a modificar.
        *   Acceder a la gestión de candidatos.
        *   Formulario para añadir candidato (Nombre, Descripción).
        *   Confirmación y envío (vía backend API).
    *   3.3. Registro de Votantes (Proceso Clave del Piloto)
        *   Entendiendo el `voterIdentifier` (identificador anónimo).
        *   Recepción de la lista de `voterIdentifier`s de la JCE (proceso externo al software, pero input para él).
        *   Uso de la función "Registro por Lotes" (`batchRegisterVoters`) a través del panel/API:
            *   Seleccionar la elección.
            *   Cargar/ingresar la lista de `voterIdentifier`s.
            *   Ejecución y monitoreo de la transacción de registro en la blockchain.
    *   3.4. Configuración del Árbol de Merkle para Votación Anónima
        *   Explicación de la raíz de Merkle.
        *   Paso 1: Confirmar cierre de registro de votantes para la elección.
        *   Paso 2: Activar cálculo de la raíz de Merkle (acción en el backend que toma los `voterIdentifier`s registrados en BD para la elección y genera la raíz).
        *   Paso 3: Enviar la Raíz de Merkle al Contrato (`setMerkleRoot`)
            *   Visualizar la raíz calculada.
            *   Confirmar y enviar la transacción al contrato (vía backend API).
            *   Verificar que la raíz fue aceptada por el contrato.
    *   3.5. Configuración del Verificador ZK-SNARK (Setup Inicial)
        *   Explicación del contrato `Verifier.sol`.
        *   Obtención de la dirección del contrato `Verifier.sol` desplegado.
        *   Uso de la función/API para `setVerifier` en `VotingSystem.sol` (normalmente tarea del Propietario del Contrato/Admin Técnico Principal).
4.  Monitoreo de la Elección
    *   Panel de estado de la elección.
    *   Número de votos anónimos emitidos (conteo de `voteCommitments`).
    *   Actividad de la red (si el panel lo muestra).
5.  Gestión Post-Votación
    *   5.1. Finalización del Período de Votación (`endElection`)
        *   Verificar que la fecha/hora de finalización ha llegado.
        *   Usar la función "Finalizar Período de Votación" en el panel (vía backend API).
    *   5.2. Gestión del Período de Revelación de Votos
        *   Anunciar el inicio del período de revelación a los votantes.
        *   Monitorear el número de votos revelados (conteo de eventos `VoteRevealed` o datos agregados).
    *   5.3. Finalización de Resultados (`finalizeResults`)
        *   Verificar que el período de revelación ha concluido.
        *   Usar la función "Finalizar y Publicar Resultados" en el panel (vía backend API).
        *   Impacto: El contrato marca los resultados como definitivos y ya no se pueden revelar más votos.
6.  Visualización y Auditoría de Resultados
    *   Acceder a los resultados finales de la elección en el panel.
    *   Exportar datos (si la funcionalidad existe).
    *   Comparar con datos de auditoría pública (ver Guía de Auditabilidad del Piloto).
7.  Troubleshooting y Soporte
    *   Problemas comunes del panel de administración.
    *   Errores de transacción y cómo interpretarlos (básicos).
    *   Canales de comunicación con el equipo técnico del piloto.

---
## Muestras de Contenido

### Sección 3.3: Registro de Votantes

**Uso de la función "Registro por Lotes" (`batchRegisterVoters`) a través del panel/API:**

Una vez que la JCE ha provisto la lista final de `voterIdentifier`s para los ciudadanos habilitados en el padrón del piloto para una elección específica, el Administrador del Piloto procederá a registrarlos en el contrato inteligente. Esto se realiza mediante una función de registro por lotes para eficiencia.

1.  **Acceso:** En el Panel de Administración, navegue a "Elecciones", seleccione la elección activa para la cual desea registrar votantes. Busque la pestaña o sección "Gestión de Votantes" o "Registro de Votantes".
2.  **Carga de Identificadores:**
    *   Encontrará una opción para "Registrar Votantes por Lote" o "Cargar Archivo de Votantes".
    *   El sistema aceptará una lista de `voterIdentifier`s. Estos deben ser cadenas hexadecimales de 32 bytes (64 caracteres) con el prefijo `0x`. Ejemplo: `0x123abc...def`.
    *   Puede pegar la lista directamente en un campo de texto (un identificador por línea) o cargar un archivo `.csv` o `.txt` simple con el mismo formato. *(Captura de pantalla del formulario de carga de lote)*
3.  **Ejecución:** Una vez cargada la lista, revise la cantidad de identificadores a procesar. Haga clic en "Iniciar Registro por Lote". El sistema backend enviará esta información al contrato `VotingSystem.sol` a través de la función `batchRegisterVoters`.
4.  **Monitoreo:** El panel mostrará el progreso de la transacción. Puede incluir un enlace al explorador de bloques de la red de prueba para ver la transacción en tiempo real. Una vez confirmada, el sistema indicará cuántos votantes fueron registrados exitosamente en la blockchain. Es importante verificar que este número coincida con la cantidad enviada.

### Sección 3.4: Configuración del Árbol de Merkle para Votación Anónima

**Paso 3: Enviar la Raíz de Merkle al Contrato (`setMerkleRoot`)**

Después de que el backend haya calculado la raíz del árbol de Merkle para la elección (basado en todos los `voterIdentifier`s registrados para esa elección), esta raíz debe ser almacenada en el contrato inteligente `VotingSystem.sol`. Esto "congela" el padrón para la votación anónima.

1.  **Visualización:** En la sección de "Gestión de Votantes" o una pestaña específica de "Voto Anónimo" para la elección, el sistema debería mostrar la Raíz de Merkle calculada por el backend (ej. `0xABCDEF123...`). *(Captura de pantalla mostrando la raíz calculada y el botón para enviarla)*
2.  **Confirmación y Envío:** Verifique que esta acción se realiza *antes* del inicio programado de la votación. Haga clic en el botón "Establecer Raíz de Merkle en Contrato".
3.  **Transacción:** El backend invocará la función `setMerkleRoot(electionId, merkleRoot)` en el contrato `VotingSystem.sol`, usando la cuenta de administrador/operador configurada.
4.  **Verificación:** El panel debe actualizarse para mostrar que la raíz de Merkle ha sido establecida para la elección. Puede verificar esto también en un explorador de bloques, consultando el estado de la elección en el contrato. Una vez establecida, la raíz no puede ser modificada para esa elección.

### Sección 5.1: Finalización del Período de Votación (`endElection`)

**Usar la función "Finalizar Período de Votación" en el panel (vía backend API):**

Al llegar la fecha y hora de finalización estipuladas para la elección, el sistema puede o no cerrar automáticamente la votación en el contrato. Para asegurar que la votación se detiene, o para cerrarla manualmente si es necesario (por ejemplo, si la hora de cierre automático fallara o se adelantara por alguna razón justificada y aprobada):

1.  Navegue a los detalles de la elección en el Panel de Administración.
2.  Verifique el estado actual y la hora de finalización programada.
3.  Busque el botón o la opción "Cerrar Período de Votación" o "Ejecutar `endElection`". *(Captura de pantalla del botón)*
4.  Al activarlo, el backend enviará una transacción al contrato inteligente llamando a la función `endElection(electionId)`. Esto cambiará el estado `isActive` de la elección a `false` y actualizará `election.endTime` al momento actual si se cierra manualmente antes.
5.  El panel deberá reflejar que la elección ya no está activa para votar. Los votantes ya no podrán emitir votos anónimos.
---
