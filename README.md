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
- npm 
- MetaMask u otra wallet de Ethereum
- MongoDB

## Instalación

1. Clonar el repositorio:
   ```
   git clone <url-del-repositorio>
   cd blockchain-voting-platform
   ```

2. Instalar dependencias:
   ```
   npm install
   cd client && npm install --legacy-peer-deps
   cd ../server && npm install
   ```
## Lanzar la aplicacion
1. Iniciar el servidor backend:
   ```
   cd server
   npm start
   ```

2. Iniciar la aplicación frontend:
   ```
   cd client
   npm start
   ```

3. Acceder a la aplicación en `http://localhost:3003`

## --------------- Guía de Uso del Sistema----------------------------

Esta sección proporciona una guía sobre cómo utilizar la Aplicación Web de Votación Electrónica Blockchain desde la perspectiva de diferentes roles de usuario: Administradores y Votantes.

### Para Administradores

Los administradores son responsables de configurar, gestionar y finalizar elecciones, así como de gestionar los usuarios y las configuraciones del sistema. El acceso al Panel de Administración es típicamente a través de un inicio de sesión seguro (nombre de usuario/contraseña) y también puede estar restringido por la dirección de la billetera.
**ACCEDER CON LA WALLET ADMINISTRATIVA
![image](https://github.com/user-attachments/assets/07790997-d5a8-4e92-ac9e-f7fda125c558)

#### Acceso al Panel de Administración

1.  **Navegar:** Abra la URL proporcionada para el Panel de Administración en su navegador web.
2.  **Iniciar Sesión:**
    *   Ingrese su `nombre de usuario` y `contraseña` de administrador.
3.  Tras un inicio de sesión exitoso, será dirigido al Panel de Control del Administrador.
![image](https://github.com/user-attachments/assets/bd149412-aa67-45da-aaa3-8e38503bb4df)


#### Gestión de Elecciones

##### Creación de una Nueva Elección

1.  **Navegación:** Desde el Panel de Control del Administrador, busque la sección "Gestionar Elecciones" y haga clic en "Crear Nueva Elección".
![image](https://github.com/user-attachments/assets/94c67680-2328-43c6-ac84-ed427acdaab3)

3.  **Completar Detalles de la Elección:**
    *   **Título:** Un título claro y descriptivo para la elección (ej., "Elección Presidencial 2024").
    *   **Descripción:** Información detallada sobre el propósito de la elección.
    *   **Nivel:** Especifique el nivel de la elección (ej., 'presidencial', 'senatorial', 'municipal').
    *   **Provincia/Municipalidad:** (Si aplica) Especifique el ámbito geográfico.
    *   **Fecha y Hora de Inicio:** La fecha y hora exactas en que comenzará la votación.
    *   **Fecha y Hora de Finalización:** La fecha y hora exactas en que la votación se cerrará automáticamente.
    *   **Fecha Límite de Registro:** (Si aplica) La fecha límite para que los votantes se registren para esta elección.
    *   **Gestion de Candidatos:** Aqui puedes añadir los distintos candidatos, toma en cuenta que la aplicación no te permitirá ingresar solo uno, debe ser de dos en adelante.
![image](https://github.com/user-attachments/assets/0b445907-7765-4f60-ad2b-4db39dd10d75)

4.  **Enviar:** Revise todos los detalles y haga clic en "Crear Elección y Registrar Candidatos".
    *   Esta acción típicamente almacena los detalles de la elección y los candidatos en la base de datos del backend.
    *   Desencadenar una transacción inicial al contrato inteligente `VotingSystem.sol` para registrar la elección en la blockchain. Generalmente, el contrato emite un evento `ElectionCreated`.
![image](https://github.com/user-attachments/assets/b68a50bd-28fb-4b00-8fe8-29144ad59cc9)
![image](https://github.com/user-attachments/assets/6f210c70-bd38-4cbd-ba70-2cad21931442)


##### Asignar Tokens

Este es un paso crítico, especialmente para que los votantes registrados puedan votar.
![image](https://github.com/user-attachments/assets/2f47ed7b-ae05-4216-8de5-79f2304b51f8)
Puedes asignar tokens a una wallet de Metamask en especifico y tambien asignarlo por provincia a un grupo en general. Te aparece los votantes que ya estan almacenados en la base de datos, junto con su informacion relevante.

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


### Para Votantes

Los votantes interactúan con el sistema para ver elecciones, probar su elegibilidad de forma anónima y emitir sus votos de manera segura.
![image](https://github.com/user-attachments/assets/4b45f545-9b98-4977-9f35-41149c2155bb)
#### Requisitos Previos para Votar

1.  **Navegador Web:** Un navegador web moderno (Chrome, Firefox, Brave, Edge).
2.  **MetaMask:** La extensión de navegador MetaMask instalada y configurada en la red de **SEPOLIA*.
![image](https://github.com/user-attachments/assets/1d9cfe18-a2d7-44c7-acb7-ca35bca06b20)
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
![image](https://github.com/user-attachments/assets/6da0773f-d746-4bde-a74e-6c86bfd7e63a)
1.  **Seleccionar Elección:**
    *   De la lista de elecciones disponibles, elija aquella en la que desea participar.
    *   La aplicación mostrará detalles sobre la elección seleccionada, incluidos los candidatos.

2.  **Elegir Candidato:**
![image](https://github.com/user-attachments/assets/e0401853-5a39-4b5a-83e8-8790ef82fa15)
    *   Revise la lista de candidatos para la elección.
    *   Seleccione su candidato preferido.
3.  **Iniciar Voto Anónimo:**
    *   Haga clic en el botón "Emitir Voto Anónimo," "Enviar Voto," o similar.
**DEBES TENER POR LO MENOS UN TOKEN** para poder votar
![image](https://github.com/user-attachments/assets/8cc22dd2-0c05-4552-8459-9edbddb10573)
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

## Acerca De
![image](https://github.com/user-attachments/assets/4c88ddf6-886c-4a15-88b1-3d5ca038eff5)

## Ayuda
![image](https://github.com/user-attachments/assets/a39acabf-587a-447f-99b9-c3eb30b4da3a)

