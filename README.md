# Plataforma de Voto Electrónico Basada en Blockchain

Una plataforma segura, transparente y descentralizada para realizar elecciones electrónicas utilizando tecnología blockchain.

## Características

- **Autenticación de Votantes**: Sistema seguro basado en wallets y firmas criptográficas.
- **Emisión y Registro de Votos**: Interfaz intuitiva para votar con privacidad garantizada.
- **Almacenamiento en Blockchain**: Registros inmutables y verificables de cada voto.
- **Conteo y Verificación**: Resultados transparentes y auditables por cualquier persona.
- **Panel Administrativo**: Gestión de elecciones, candidatos y supervisión del proceso.

## Tecnologías Utilizadas

- **Frontend**: React, Bootstrap
- **Backend**: Express.js, Node.js
- **Blockchain**: Ethereum, Solidity
- **Herramientas de Desarrollo**: Hardhat, Ethers.js
- **Autenticación**: MetaMask (Web3)

## Estructura del Proyecto

```
blockchain-voting-platform/
├── client/              # Aplicación frontend en React
├── server/              # API backend en Express
├── contracts/           # Smart contracts en Solidity
├── scripts/             # Scripts de despliegue
└── test/                # Pruebas para smart contracts
```

## Requisitos Previos

- Node.js (v14 o superior)
- npm o yarn
- MetaMask u otra wallet de Ethereum
- Ganache (para desarrollo local)

## Instalación

1. Clonar el repositorio:
   ```
   git clone <url-del-repositorio>
   cd blockchain-voting-platform
   ```

2. Instalar dependencias:
   ```
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. Configurar variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto
   - Añadir las siguientes variables:
     ```
     CONTRACT_ADDRESS=<dirección-del-contrato-desplegado>
     ADMIN_PRIVATE_KEY=<clave-privada-del-administrador>
     JWT_SECRET=<secreto-para-jwt>
     ```

## Despliegue del Smart Contract

1. Iniciar una red local de Ethereum (con Ganache):
   ```
   npx hardhat node
   ```

2. Desplegar el contrato:
   ```
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. Copiar la dirección del contrato desplegado al archivo `.env`

## Ejecución

1. Iniciar el servidor backend:
   ```
   cd server
   npm run dev
   ```

2. Iniciar la aplicación frontend:
   ```
   cd client
   npm start
   ```

3. Acceder a la aplicación en `http://localhost:3000`

## Guía de Uso del Sistema

Esta sección proporciona una guía sobre cómo utilizar la Aplicación Web de Votación Electrónica Blockchain desde la perspectiva de diferentes roles de usuario: Administradores y Votantes.

### Para Administradores

Los administradores son responsables de configurar, gestionar y finalizar elecciones, así como de gestionar los usuarios y las configuraciones del sistema. El acceso al Panel de Administración es típicamente a través de un inicio de sesión seguro (nombre de usuario/contraseña) y también puede estar restringido por la dirección de la billetera.

#### Acceso al Panel de Administración

1.  **Navegar:** Abra la URL proporcionada para el Panel de Administración en su navegador web.
2.  **Iniciar Sesión:**
    *   Ingrese su `nombre de usuario` y `contraseña` de administrador.
    *   Si el sistema utiliza acceso de administrador basado en billetera, asegúrese de que su billetera MetaMask configurada esté conectada y en la red correcta.
3.  Tras un inicio de sesión exitoso, será dirigido al Panel de Control del Administrador.

#### Gestión de Elecciones

##### Creación de una Nueva Elección

1.  **Navegación:** Desde el Panel de Control del Administrador, busque la sección "Elecciones" y haga clic en "Crear Nueva Elección" o un botón similar.
2.  **Completar Detalles de la Elección:**
    *   **Título:** Un título claro y descriptivo para la elección (ej., "Elección Presidencial 2024").
    *   **Descripción:** Información detallada sobre el propósito de la elección.
    *   **Nivel:** Especifique el nivel de la elección (ej., 'presidencial', 'senatorial', 'municipal').
    *   **Provincia/Municipalidad:** (Si aplica) Especifique el ámbito geográfico.
    *   **Fecha y Hora de Inicio:** La fecha y hora exactas en que comenzará la votación.
    *   **Fecha y Hora de Finalización:** La fecha y hora exactas en que la votación se cerrará automáticamente.
    *   **Fecha Límite de Registro:** (Si aplica) La fecha límite para que los votantes se registren para esta elección.
    *   **(Configuraciones Avanzadas - puede estar en una sección o pestaña separada)**
        *   **Pública/Privada:** Defina si la elección está abierta a todos los votantes elegibles o restringida a una lista específica.
        *   **Requiere Registro:** Si los votantes necesitan ser añadidos explícitamente a una lista de permitidos.
        *   **Permitir Abstinencia:** Si una opción para abstenerse debe estar disponible.
3.  **Enviar:** Revise todos los detalles y haga clic en "Crear Elección" o "Guardar Borrador".
    *   Esta acción típicamente almacena los detalles de la elección en la base de datos del backend.
    *   Dependiendo del diseño del sistema, también podría desencadenar una transacción inicial al contrato inteligente `VotingSystem.sol` para registrar la elección en la blockchain. Generalmente, el contrato emite un evento `ElectionCreated`.

##### Añadir Candidatos a una Elección

1.  **Seleccionar Elección:** De la lista de elecciones, elija la que desea gestionar.
2.  **Navegar a Candidatos:** Encuentre la sección "Gestionar Candidatos" o "Añadir Candidatos" para esa elección.
3.  **Añadir Detalles del Candidato:** Para cada candidato, proporcione:
    *   **Nombre y Apellido**
    *   **Afiliación Partidaria** (si existe)
    *   **Cargo al que Aspira/Categoría:** El rol específico o lista para la que se postulan dentro de esta elección.
    *   **Biografía/Manifiesto:** (Opcional) Información detallada.
    *   **URL de Foto:** (Opcional) Enlace a una foto del candidato.
4.  **Enviar:** Añada cada candidato. Esta información se almacena típicamente en la base de datos del backend y también puede estar vinculada a la elección en el contrato inteligente si el diseño incluye el registro de candidatos en la cadena.

##### Gestión de Votantes (Registro de Votantes)

Este es un paso crítico, especialmente para elecciones que utilizan ZK-SNARKs para el anonimato, ya que implica crear la lista de votantes elegibles cuyos identificadores formarán el árbol de Merkle.

1.  **Seleccionar Elección:** Elija la elección para la cual desea gestionar votantes.
2.  **Navegar a Gestión de Votantes:** Busque secciones como "Gestionar Votantes," "Registrar Votantes," o "Subir Lista de Votantes."
3.  **Registrar Votantes:**
    *   **Método 1: Carga Masiva:**
        *   Prepare una lista de `voterIdentifier`s. Un `voterIdentifier` es un ID único y pseudoanónimo para cada votante (ej., un hash de un ID nacional, o un ID único generado aleatoriamente). Estos identificadores son los que se incluirán en el árbol de Merkle.
        *   La lista es típicamente un archivo CSV o TXT con un `voterIdentifier` por línea.
        *   Suba el archivo a través del Panel de Administración.
        *   El backend procesa esta lista, almacena los identificadores en la base de datos y los asocia con la elección.
    *   **Método 2: Registro Individual:** (Menos común para listas grandes) Ingrese manualmente los `voterIdentifier`s.
4.  **Confirmación:** El sistema debería confirmar el número de votantes registrados exitosamente (es decir, añadidos a la lista de la base de datos fuera de la cadena para esta elección).
5.  **Importante:** Este proceso de registro debe completarse *antes* de que se genere y establezca la raíz de Merkle para la elección.

##### Generación y Establecimiento de la Raíz de Merkle

Este paso es esencial para la votación anónima basada en ZK-SNARK. La raíz de Merkle "congela" la lista de votantes elegibles para la elección.

1.  **Asegurar que el Registro de Votantes esté Completo:** Verifique que todos los `voterIdentifier`s elegibles para la elección hayan sido registrados en el sistema (según el paso anterior).
2.  **Seleccionar Elección:** Elija la elección relevante.
3.  **Navegar:** Encuentre una opción como "Establecer Raíz de Merkle," "Finalizar Lista de Votantes," o "Preparar Votación Anónima."
4.  **Desencadenar Cálculo de la Raíz de Merkle:**
    *   Haga clic en un botón como "Calcular Raíz de Merkle."
    *   El **Backend** hará lo siguiente:
        *   Obtendrá todos los `voterIdentifier`s registrados para esta elección de la base de datos.
        *   Construirá un árbol de Merkle utilizando estos identificadores como hojas (típicamente hasheándolos primero, ej., con Poseidon).
        *   Calculará la raíz de Merkle final.
    *   El Panel de Administración puede mostrar la raíz de Merkle calculada para verificación.
5.  **Establecer Raíz de Merkle en la Blockchain:**
    *   Haga clic en un botón como "Establecer Raíz de Merkle en Contrato."
    *   El **Backend** (o la billetera conectada del Administrador si está diseñado así) envía una transacción al contrato inteligente `VotingSystem.sol`, llamando a la función `setMerkleRoot(electionId, merkleRoot)`.
6.  **Confirmación:** El Panel de Administración debería indicar que la raíz de Merkle ha sido establecida exitosamente en la blockchain. Esta acción es usualmente irreversible para una elección.

##### Monitoreo de una Elección Activa

1.  **Navegar al Panel de Control de la Elección:** Seleccione la elección activa.
2.  **Ver Estadísticas:** El panel puede mostrar:
    *   Número total de votos anónimos (compromisos) emitidos hasta el momento.
    *   Otras métricas o registros relevantes si están disponibles.
    *   Estado de la conexión a la red blockchain.

##### Finalización del Período de Elección

1.  **Cierre Automático:** Las elecciones típicamente finalizan automáticamente según la `endDate` establecida en el contrato inteligente y el sistema.
2.  **Cierre Manual (si es necesario/soportado):**
    *   Si la elección necesita ser finalizada antes de su `endDate` programada (debido a circunstancias excepcionales y con la autorización adecuada), podría haber una función de administrador.
    *   Esto implicaría llamar a una función como `endElection(electionId)` en el contrato `VotingSystem.sol`. Esto cambia el estado de la elección en la blockchain, impidiendo más votos.

##### Gestión de la Revelación de Votos (Si Aplica)

Algunos protocolos de votación ZK pueden tener una fase separada donde los votos se "revelan" para ser contados, manteniendo aún el anonimato del votante desde la emisión inicial. La documentación del piloto sugirió tal fase.

1.  **Anunciar Período de Revelación:** Informe a los votantes cuándo comienza y termina el período de revelación.
2.  **Monitorear Revelación:** El Panel de Administración podría mostrar estadísticas sobre cuántos votos han sido revelados.
3.  **Cerrar Período de Revelación:** Similar a finalizar el período de votación, esto podría ser automático o requerir intervención manual.

##### Finalización de Resultados y Conteo

1.  **Asegurar que la Votación (y Revelación, si hay) esté Cerrada:** Verifique que el período de elección haya concluido.
2.  **Desencadenar Finalización:**
    *   En el Panel de Administración, para la elección específica, encuentre una opción como "Finalizar Resultados," "Contar Votos," o "Publicar Resultados."
    *   Esta acción típicamente llama a una función como `finalizeResults(electionId)` o `tallyVotes(electionId)` en el contrato inteligente `VotingSystem.sol`.
3.  **Acción del Contrato Inteligente:**
    *   El contrato realiza el conteo final de votos basado en los compromisos (y datos revelados, si aplica).
    *   Los resultados se almacenan en la blockchain.
    *   Se emite un evento como `ElectionFinalized` o `ResultsPublished`.
4.  **Ver Resultados:** El Panel de Administración ahora debería mostrar los resultados finales y oficiales de la elección tal como se registraron en la blockchain.
5.  **Publicar (Opcional):** Podría haber un paso adicional para publicar formalmente los resultados en una vista pública o generar informes.

#### Otras Tareas Administrativas

*   **Gestión de Configuraciones del Sistema:** Configurar parámetros globales, permisos predeterminados, etc.
*   **Gestión de Otros Administradores:** Añadir, eliminar o modificar permisos de otros administradores (si el administrador conectado tiene suficientes derechos).
*   **Visualización de Registros de Actividad:** Rastrear acciones importantes realizadas dentro del sistema para fines de auditoría.
*   **Establecer Dirección del Contrato Verificador:** Una configuración única (o actualización si el Verificador cambia) donde la dirección del `Verifier.sol` desplegado (para pruebas ZK) se establece en el contrato principal `VotingSystem.sol` usando una función como `setVerifier(address)`.

### Para Votantes

Los votantes interactúan con el sistema para ver elecciones, probar su elegibilidad de forma anónima y emitir sus votos de manera segura.

#### Requisitos Previos para Votar

1.  **Navegador Web:** Un navegador web moderno (Chrome, Firefox, Brave, Edge).
2.  **MetaMask:** La extensión de navegador MetaMask instalada y configurada.
    *   **Creación/Importación de Billetera:** Necesita una billetera Ethereum en MetaMask. Si no tiene una, cree una y **respalde de forma segura su frase semilla (frase de recuperación)**.
    *   **Configuración de Red:** Asegúrese de que MetaMask esté conectado a la red Ethereum correcta especificada para la elección (ej., red de prueba Sepolia, red local Hardhat, o red principal).
    *   **Fondos en la Cuenta (para Tarifas de Gas):** Su cuenta de MetaMask necesitará una pequeña cantidad de la moneda nativa de la red (ej., ETH en Ethereum, SepoliaETH en Sepolia) para pagar las tarifas de gas al enviar transacciones (como emitir un voto). Para redes de prueba, puede obtener fondos de un "faucet."
3.  **Elegibilidad:** Debe estar registrado para la elección específica por un administrador (es decir, su `voterIdentifier` debe ser parte del árbol de Merkle para esa elección).

#### Acceso a la Aplicación de Votación (PWA)

1.  **Navegar:** Abra la URL de la aplicación web para votantes en su navegador.
2.  **Conectar Billetera:**
    *   Haga clic en el botón "Conectar Billetera" o "Iniciar Sesión con MetaMask".
    *   MetaMask aparecerá y le pedirá que elija una cuenta y apruebe la conexión a la aplicación. Seleccione su cuenta deseada y apruebe.
    *   La aplicación ahora debería mostrar la dirección de su billetera conectada.

#### Emisión de un Voto Anónimo

Este proceso aprovecha ZK-SNARKs para permitirle votar sin revelar su identidad o elección específica directamente en el momento de la emisión.

1.  **Seleccionar Elección:**
    *   De la lista de elecciones disponibles, elija aquella en la que desea participar.
    *   La aplicación mostrará detalles sobre la elección seleccionada, incluidos los candidatos.
2.  **Elegir Candidato:**
    *   Revise la lista de candidatos para la elección.
    *   Seleccione su candidato preferido.
3.  **Iniciar Voto Anónimo:**
    *   Haga clic en el botón "Emitir Voto Anónimo," "Enviar Voto," o similar.
4.  **Generación de Prueba ZK (Lado del Cliente):**
    *   La aplicación ahora preparará su voto para la sumisión anónima. Esto sucede en su navegador.
    *   Puede ver un mensaje como "Preparando su voto seguro..." o "Generando prueba..."
    *   **Qué sucede en segundo plano:**
        *   La aplicación necesita su `voterSecret` y `voterIdentifier`. El `voterSecret` es un dato privado que solo usted debería conocer o que su cliente puede derivar. El `voterIdentifier` es su ID registrado.
        *   También necesita la ruta de Merkle que prueba que su `voterIdentifier` es parte de la raíz de Merkle oficial de la elección. El frontend usualmente obtiene esta ruta del backend proporcionando su `voterIdentifier`.
        *   Toma su `candidateId` elegido y un `voteNonce` aleatorio generado recientemente.
        *   Usando estas entradas, la biblioteca SnarkJS del lado del cliente (con el probador WASM para `vote.circom`) calcula:
            *   `leaf`: Hash de su `voterIdentifier`.
            *   `nullifierHash`: Un valor único `Hash(voterSecret, electionId)` para evitar que vote dos veces en esta elección.
            *   `voteCommitment`: Un compromiso con su elección `Hash(candidateId, voteNonce)`.
            *   **Prueba ZK:** Una prueba criptográfica de que todos estos cálculos son correctos, que su hoja está en el árbol de Merkle y que conoce las entradas privadas, *sin revelar las entradas privadas mismas*.
5.  **Enviar Transacción vía MetaMask:**
    *   Una vez generada la prueba, MetaMask aparecerá pidiéndole que confirme una transacción.
    *   Esta transacción llama a la función `anonymousVote(...)` en el contrato inteligente `VotingSystem.sol`. Los parámetros incluirán la prueba ZK generada y las señales públicas (merkleRoot, nullifierHash, voteCommitment).
    *   Revise los detalles de la transacción (especialmente la tarifa de gas) y haga clic en "Confirmar."
6.  **Confirmación:**
    *   Después de que la transacción sea minada en la blockchain, la aplicación mostrará un mensaje de confirmación (ej., "¡Voto emitido exitosamente!" o "¡Voto anónimo enviado!").
    *   **Importante para la Revelación (si aplica):** Si el sistema utiliza una fase de revelación separada (como se describe en los documentos del piloto), la aplicación probablemente guardará su `candidateId` y `voteNonce` (o el `voteCommitment`) en el `localStorage` de su navegador. Esto es necesario para que revele su voto más tarde. Asegúrese de usar el mismo navegador y perfil para la fase de revelación.

#### Revelación de su Voto (Si Aplica)

Este paso es específico para los protocolos de votación que requieren una acción separada para que el voto cuente para un candidato después del compromiso anónimo.

1.  **Esperar Período de Revelación:** Los administradores de la elección anunciarán cuándo comienza el período de revelación de votos (generalmente después de que haya finalizado el período de votación).
2.  **Acceder a la Aplicación:** Abra la aplicación de votación y conecte la misma billetera MetaMask que usó para emitir el voto anónimo.
3.  **Navegar a la Sección de Revelación:**
    *   Seleccione la elección en la que votó.
    *   Busque una opción como "Revelar Mi Voto" o "Completar Votación."
4.  **Confirmar Detalles:**
    *   La aplicación debería recuperar el `candidateId` y `voteNonce` (o `voteCommitment`) que guardó localmente cuando votó por primera vez.
    *   Probablemente mostrará el candidato que eligió (basado en los datos guardados) para que lo confirme.
5.  **Enviar Transacción de Revelación:**
    *   Haga clic en "Revelar Voto" o "Confirmar Revelación."
    *   MetaMask puede aparecer nuevamente para pedirle que firme un mensaje o envíe otra transacción. Esta transacción llama a una función como `revealVote(...)` en el contrato inteligente, proporcionando su `candidateId`, `voteNonce`, y el `voteCommitment` original.
    *   El contrato inteligente verifica que el `candidateId` y `voteNonce` proporcionados hashean al `voteCommitment` almacenado. Si es válido, el voto se cuenta para ese candidato.
6.  **Confirmación:** La aplicación le notificará que su voto ha sido revelado exitosamente y será contado. Los datos almacenados localmente para este voto pueden ser eliminados.

#### Verificación de Resultados de la Elección

Una vez que la elección es finalizada y los resultados son publicados por los administradores, debería poder verlos en la aplicación de votación. Esto típicamente muestra los conteos de votos para cada candidato.

#### Solución de Problemas para Votantes

*   **Problemas de Conexión con MetaMask:**
    *   Asegúrese de que MetaMask esté desbloqueado y conectado a la red correcta.
    *   Intente desconectar y reconectar desde el botón "Conectar Billetera" de la aplicación.
    *   Verifique los permisos del navegador para MetaMask.
*   **Fallos en Transacciones:**
    *   **Gas Insuficiente:** Asegúrese de tener suficiente moneda nativa de la red (ETH, SepoliaETH) en su cuenta para cubrir las tarifas de transacción.
    *   **Congestión de Red:** La red podría estar ocupada. Podría necesitar esperar o intentar con una tarifa de gas más alta (si MetaMask permite el ajuste).
    *   **Errores de Contrato:** La transacción podría ser revertida por el contrato inteligente (ej., elección no activa, votante no elegible, nulificador ya usado, prueba inválida). La aplicación o MetaMask podrían mostrar un mensaje de error.
*   **Fallos en la Generación de Pruebas ZK:**
    *   Esto es menos común si la aplicación está bien probada, pero podría deberse a problemas del navegador o datos inesperados. Intente refrescar la página o reiniciar el navegador.
*   **Datos para Revelación No Encontrados:** Si limpió el `localStorage` de su navegador o está usando un navegador/perfil diferente, los datos necesarios para la fase de revelación podrían estar ausentes.

Siga siempre las instrucciones proporcionadas dentro de la aplicación y por los administradores de la elección. Para problemas críticos, contacte los canales de soporte proporcionados para la elección.

## Seguridad

- Los votos son anónimos mediante técnicas de hashing.
- Las transacciones son firmadas criptográficamente por cada votante.
- El sistema previene votos duplicados.
- Los resultados son inmutables y verificables públicamente.

## Pruebas

Ejecución de pruebas:
```
npx hardhat test
```

## Contribuir

1. Fork del repositorio
2. Crear una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de los cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto está licenciado bajo MIT License.

## Notas de Implementación

- Para un entorno de producción, usar una red de Ethereum real o una red privada como Polygon.
- Implementar métodos adicionales de seguridad como autenticación de dos factores.
- Considerar el uso de zk-SNARKs para una mayor privacidad de los votos.
