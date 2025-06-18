# Guía Paso a Paso para Votantes del Piloto
# Sistema de Votación Electrónica Blockchain JCE

---
## ¡Bienvenido/a al Piloto de Votación Electrónica!

Esta guía te ayudará a participar fácilmente. ¡Tu opinión es muy importante!

---
## Parte 1: Preparación (Si es tu primera vez usando MetaMask)

*   **¿Qué es MetaMask?** Es una billetera digital segura que usarás para identificarte y votar. Funciona como una extensión en tu navegador (Chrome, Firefox, Edge, Brave).
*   **1. Instala MetaMask:**
    *   Ve a [metamask.io](https://metamask.io).
    *   Sigue las instrucciones para instalar la extensión en tu navegador.
    *   *(Captura de pantalla: Página de Metamask.io, botón de descarga)*
*   **2. Crea tu Billetera:**
    *   Abre MetaMask y selecciona "Crear una nueva billetera".
    *   Crea una contraseña segura.
    *   **¡MUY IMPORTANTE!** Anota tu "Frase Secreta de Recuperación" (12 palabras). Guárdala en un lugar MUY SEGURO y NUNCA la compartas con nadie. Es la única forma de recuperar tu cuenta si olvidas tu contraseña o cambias de computadora.
    *   *(Captura de pantalla: MetaMask pidiendo crear contraseña y luego mostrando la frase secreta)*
*   **3. (Solo para el Piloto) Obtén ETH de Prueba:**
    *   Este piloto usa una red de prueba, no dinero real. Necesitas "ETH de prueba" para pagar las pequeñas tarifas de transacción (gas).
    *   Asegúrate que MetaMask esté conectado a la red de prueba indicada por la JCE (Ej: Sepolia).
    *   Solicita ETH de prueba en un "faucet" (grifo) para la red de prueba. Ejemplo para Sepolia: [sepoliafaucet.com](https://sepoliafaucet.com/) u otros indicados por el equipo del piloto.
    *   *(Captura de pantalla: MetaMask mostrando selección de red y un faucet)*

---
## Parte 2: Acceder a la Plataforma de Votación del Piloto

*   **1. Abre la Plataforma:**
    *   Ingresa la dirección web de la PWA del piloto en tu navegador: `[URL_PWA_PILOTO]`
    *   *(Captura de pantalla: Página de inicio de la PWA)*
*   **2. Conecta tu Billetera MetaMask:**
    *   Busca y haz clic en el botón "Conectar Wallet" o "Iniciar Sesión con MetaMask".
    *   MetaMask se abrirá y te pedirá permiso para conectar tu cuenta con el sitio. Aprueba la conexión.
    *   *(Captura de pantalla: Pop-up de MetaMask pidiendo conectar cuenta)*
    *   Una vez conectado, verás parte de tu dirección de wallet en la aplicación.

---
## Parte 3: Emitir tu Voto Anónimo

*   **1. Selecciona la Elección:**
    *   En la página principal, verás una lista de elecciones disponibles.
    *   Busca y haz clic en la elección del piloto: `[NOMBRE_ELECCION_PILOTO]`
    *   *(Captura de pantalla: Lista de elecciones, resaltando la del piloto)*
*   **2. Elige tu Candidato:**
    *   Verás la lista de candidatos para esta elección. Lee sus propuestas si es necesario.
    *   Haz clic en la opción del candidato de tu preferencia para seleccionarlo.
    *   *(Captura de pantalla: Lista de candidatos, con uno seleccionado)*
*   **3. Confirma y Emite tu Voto:**
    *   Aparecerá un botón como "Emitir Voto Anónimo" o "Confirmar y Votar". Haz clic en él.
    *   **Proceso Automático:** La aplicación mostrará un mensaje como "Preparando su voto seguro..." o "Generando prueba...".
        *   *Explicación simple:* En este paso, tu computadora está haciendo cálculos criptográficos para asegurar que tu voto sea anónimo y verificable. Para este piloto, parte de este proceso es simulado para ser más rápido.
    *   *(Captura de pantalla: Mensaje "Preparando voto seguro...")*
*   **4. Aprueba en MetaMask:**
    *   MetaMask se abrirá y te pedirá confirmar una transacción. Esta es la acción de enviar tu voto anónimo a la blockchain.
    *   Revisa que la interacción es con el contrato correcto (si se muestra) y confirma. Necesitarás un poco de ETH de prueba para el "gas".
    *   *(Captura de pantalla: Pop-up de MetaMask pidiendo confirmar transacción de `anonymousVote`)*
*   **5. ¡Voto Emitido! Guarda tus Datos para Revelar:**
    *   Después de unos segundos, la aplicación te mostrará un mensaje: "¡Voto anónimo registrado exitosamente!".
    *   **MUY IMPORTANTE (Solo para el Piloto):**
        *   Para que tu voto cuente, deberás "revelarlo" después de que termine la elección.
        *   La aplicación guardará automáticamente en tu navegador (LocalStorage) los siguientes datos:
            *   ID de la Elección (`electionId`)
            *   ID del Candidato que elegiste (`candidateId`)
            *   Tu Compromiso de Voto (`voteCommitment` - una huella digital de tu voto)
        *   Verás un mensaje confirmando que estos datos se guardaron. Ejemplo: "Detalles del voto guardados para la fase de revelación."
        *   **Acción:** Asegúrate de usar ESTE MISMO NAVEGADOR Y PERFIL cuando regreses a revelar tu voto.
    *   *(Captura de pantalla: Mensaje de éxito de voto anónimo y notificación de datos guardados)*

---
## Parte 4: Revelar tu Voto (Después de que termine la Elección)

*   **1. Verifica el Período de Revelación:**
    *   La JCE anunciará cuándo inicia y termina el período para revelar votos. Asegúrate de hacerlo dentro de ese plazo.
*   **2. Accede a la Elección:**
    *   Abre la PWA del piloto (`[URL_PWA_PILOTO]`) en el MISMO NAVEGADOR que usaste para votar.
    *   Conecta tu billetera MetaMask (la misma cuenta).
    *   Selecciona la elección del piloto en la que votaste.
*   **3. Busca la Opción "Revelar mi Voto":**
    *   Si estás en el período correcto y la aplicación encuentra tus datos de voto guardados, verás un botón o sección que dice "Revelar mi Voto para el Conteo" o similar. Haz clic.
    *   *(Captura de pantalla: Botón/sección de revelación en la página de detalles de la elección ya cerrada)*
*   **4. Confirma los Detalles de tu Voto:**
    *   La aplicación te mostrará el candidato que elegiste (según los datos guardados) y tu `voteCommitment`.
    *   Verifica que es correcto (especialmente el candidato).
    *   Haz clic en "Confirmar y Revelar mi Voto".
    *   *(Captura de pantalla: Modal/formulario de revelación mostrando el candidato y el commitment)*
*   **5. Aprueba en MetaMask (si es necesario):**
    *   El backend procesará tu revelación. Puede que MetaMask te pida una firma o transacción si el diseño lo requiere (para el piloto, es probable que el backend use una cuenta admin para enviar la transacción `revealVote` por simplicidad). Sigue las instrucciones.
*   **6. ¡Revelación Exitosa!**
    *   Verás un mensaje "¡Voto revelado exitosamente y será contado!".
    *   Los datos guardados en tu navegador para esta elección serán eliminados.
    *   *(Captura de pantalla: Mensaje de éxito de revelación)*

---
## Parte 5: Ayuda

*   **¿Problemas?** Consulta la sección "Solución de Problemas Comunes" en el `Manual de Usuario del Votante - Programa Piloto` completo en `[LINK_MANUAL_COMPLETO]`.
*   **Contacto:** Si necesitas más ayuda, contacta a Soporte del Piloto:
    *   Email: `[EMAIL_SOPORTE_PILOTO]`
    *   Teléfono: `[TELEFONO_SOPORTE_PILOTO]` (Horario: ____)

---
## Muestras de Contenido Específico (Simulando Capturas)

### Parte 3, Paso 2: Elige tu Candidato
*   **Visual:** *(Simulación de captura de pantalla de la PWA)*
    ```
    -------------------------------------------
    | Elección Piloto Presidencial            |
    -------------------------------------------
    | Candidato Alpha (Partido Sol)      [ ]  |  <- Opción sin seleccionar
    |   [Foto Alpha] [Descripción breve...]   |
    |-----------------------------------------|
    | Candidato Beta (Partido Luna)       [X]  |  <- Opción seleccionada
    |   [Foto Beta] [Descripción breve...]    |
    |-----------------------------------------|
    | Candidato Gamma (Partido Estrella)  [ ]  |
    |   [Foto Gamma] [Descripción breve...]   |
    -------------------------------------------
    |                [Emitir Voto Anónimo]    |
    -------------------------------------------
    ```

### Parte 4, Paso 4: Confirma los Detalles de tu Voto
*   **Visual:** *(Simulación de captura de pantalla de un modal o sección en la PWA)*
    ```
    -------------------------------------------
    | Confirmar Revelación de Voto            |
    -------------------------------------------
    | Elección: Elección Piloto Presidencial  |
    |                                         |
    | Usted votó por:                         |
    |   Candidato Beta (Partido Luna)         |
    |                                         |
    | Su Compromiso de Voto (Prueba):         |
    |   0xabcdef1234567890deadbeef...         |
    |                                         |
    | [Confirmar y Revelar mi Voto] [Cancelar]|
    -------------------------------------------
    ```
---
