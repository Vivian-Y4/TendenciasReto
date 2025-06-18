# Preguntas Frecuentes (FAQ) para Votantes del Piloto
# Sistema de Votación Electrónica Blockchain JCE

---
## Sobre el Piloto y la Participación

*   **P1: ¿Qué es este "piloto" y por qué debería participar?**
    *   R: Este es un programa de prueba para un nuevo sistema de votación electrónica que utiliza tecnología blockchain y criptografía avanzada (pruebas de conocimiento cero o ZK-SNARKs) para mejorar la seguridad, transparencia y el anonimato del voto. Tu participación es voluntaria pero muy valiosa, ya que nos ayuda a probar el sistema, identificar mejoras y entender la experiencia del usuario antes de considerar su uso a mayor escala.

*   **P2: ¿Mis datos personales están seguros en este piloto?**
    *   R: Para este piloto, la JCE te pre-registra usando un `Identificador de Votante` (`voterIdentifier`) que es un código pseudoanónimo. No se almacena tu cédula directamente en la blockchain junto con tu voto. El objetivo es probar el flujo de votación anónima. Las medidas de seguridad de datos estándar aplican a cualquier información manejada por el backend (servidor) según las políticas de la JCE para el piloto.

*   **P3: ¿Este voto piloto cuenta para una elección real?**
    *   R: No, los votos emitidos en este programa piloto son únicamente para fines de prueba y evaluación del sistema. No tienen impacto en ninguna elección oficial real.

---
## Sobre la Tecnología (Simplificado)

*   **P4: ¿Qué es Blockchain y por qué se usa?**
    *   R: Imagina un libro de contabilidad digital que es compartido y verificado por muchas computadoras. Una vez que algo se anota (como un voto anónimo), es muy difícil de cambiar o borrar. Esto aporta transparencia (todos pueden verificar el proceso, no los votos individuales) y seguridad.

*   **P5: ¿Qué es el `Identificador de Votante` (`voterIdentifier`)? ¿Necesito saber el mío?**
    *   R: Es un código único (`bytes32`) que te representa en el sistema de votación para una elección específica sin revelar tu identidad personal. Para el piloto, este identificador es asignado por la JCE y se vincula a tu cuenta de billetera MetaMask durante el proceso de login en la plataforma de votación. No necesitas memorizarlo; el sistema lo maneja internamente.

*   **P6: ¿Cómo funciona el voto anónimo con "Pruebas ZK" (ZK-SNARKs)?**
    *   R: Es una técnica criptográfica avanzada. Piensa que es como demostrar que tienes una llave que abre una puerta (tu derecho a votar y tu elección), pero sin mostrar la llave misma (tu identidad o por quién votaste). La "prueba ZK" es una pequeña firma digital que el sistema verifica.
    *   **Importante para el Piloto:** En esta fase piloto, la generación real de estas complejas pruebas ZK y su verificación completa en la blockchain están **simuladas o utilizan componentes placeholder (plantillas)**. Estamos probando todo el flujo de la aplicación, pero la validación criptográfica completa de la prueba ZK no es el foco principal de *este* piloto específico.

*   **P7: ¿Qué es un "Compromiso de Voto" (`voteCommitment`)?**
    *   R: Cuando votas anónimamente, tu elección (ej. Candidato A) se combina con un número secreto aleatorio (llamado "nonce") y se le aplica una función hash (como una huella digital). El resultado es el `voteCommitment`. Es único para tu voto y no revela por quién votaste directamente. Este `voteCommitment` se registra en la blockchain.
    *   `Compromiso = Hash(ID_Candidato, NonceSecreto)`

*   **P8: ¿Por qué necesito "revelar" mi voto en este piloto? ¿No contradice el anonimato?**
    *   R: Es una excelente pregunta. El sistema de voto anónimo con ZK-SNARKs registra tu voto de forma que nadie pueda vincularlo contigo en ese momento. Sin embargo, para que ese voto se cuente en el resultado final de la elección (el tally), el sistema necesita saber a qué candidato corresponde cada voto anónimo.
    *   En este **piloto simplificado**, la "revelación" es un mecanismo donde tú, después de votar, le dices al sistema: "Este `compromiso de voto` que envié anónimamente corresponde a este `candidato`". El sistema verifica que el compromiso es válido (fue emitido anónimamente) y que no ha sido revelado antes, y luego suma el voto al candidato.
    *   Tu identidad (dirección de wallet) al momento de revelar *podría* ser conocida por el backend que procesa la revelación, pero el voto original en la blockchain (`anonymousVote`) sigue siendo anónimo en su emisión. Este modelo de revelación es una simplificación para el piloto. Sistemas más avanzados podrían tener otros métodos de conteo que preserven aún más el anonimato incluso en la fase de tally.

---
## Sobre el Proceso de Votación y Revelación

*   **P9: ¿Qué necesito para votar en el piloto?**
    *   R: Un computador o smartphone con acceso a internet, un navegador web compatible (Chrome, Firefox, Edge, Brave), la extensión de billetera digital MetaMask instalada y configurada, y un poco de criptomoneda de prueba (ej. Sepolia ETH) para las tarifas de gas.

*   **P10: ¿Qué pasa si cometo un error al seleccionar mi candidato? ¿Puedo cambiar mi voto?**
    *   R: Una vez que tu voto anónimo es enviado a la blockchain (después de confirmar la transacción en MetaMask), **no se puede cambiar ni cancelar**. Esto es similar a depositar una boleta física en una urna. Por favor, revisa bien tu selección antes de confirmar.

*   **P11: ¿Qué es el `localStorage` donde se guardan los datos para la revelación? ¿Es seguro?**
    *   R: `localStorage` es un espacio de almacenamiento dentro de tu propio navegador web. La aplicación de votación guarda ahí temporalmente tu `electionId`, `candidateId` elegido, y `voteCommitment` después de que votas anónimamente.
    *   **Seguridad:** Es razonablemente seguro para datos temporales en tu propia computadora, pero no es un almacenamiento de alta seguridad a largo plazo. Por eso, después de una revelación exitosa, la aplicación elimina esos datos del `localStorage`. Es importante que realices la fase de revelación desde el mismo navegador y perfil de usuario que usaste para votar. No se recomienda votar en computadoras públicas o compartidas si te preocupa la privacidad de estos datos temporales.

*   **P12: ¿Qué pasa si olvido revelar mi voto o pierdo los datos guardados en `localStorage`?**
    *   R: En este sistema piloto simplificado, si no revelas tu voto durante el período establecido, o si los datos necesarios (principalmente tu `voteCommitment` y el `candidateId` que elegiste) se pierden y no puedes proporcionarlos, tu voto anónimo **no podrá ser incluido en el conteo final**. Es una limitación del mecanismo de revelación simple de este piloto.

*   **P13: ¿Cómo sé que mi voto anónimo fue emitido o que mi revelación fue procesada?**
    *   R: La aplicación te mostrará mensajes de confirmación. Además, para cada acción que interactúa con la blockchain (como `anonymousVote` y `revealVote`), MetaMask te mostrará la transacción. Podrás ver el hash de esa transacción y buscarla en un explorador de bloques de la red de prueba para ver su estado. La aplicación también te notificará el éxito.

---
## Soporte y Ayuda

*   **P14: Tengo problemas con MetaMask (instalación, conexión, fondos de prueba). ¿Qué hago?**
    *   R: Consulta la documentación oficial de MetaMask ([metamask.io](https://metamask.io)) para guías detalladas. Para fondos de prueba, busca "faucets" para la red de prueba específica del piloto (ej. "Sepolia faucet"). Si el problema es conectar MetaMask a la PWA, revisa los tips en el `Manual de Usuario del Votante del Piloto`.

*   **P15: La aplicación muestra un error que no entiendo. ¿A quién contacto?**
    *   R: Por favor, toma una captura de pantalla del error (incluyendo mensajes en la consola del navegador si es posible). Luego, contacta al equipo de soporte del piloto a través de:
        *   Email: `[EMAIL_SOPORTE_PILOTO]`
        *   Teléfono/WhatsApp (si se provee): `[TELEFONO_SOPORTE_PILOTO]`
        *   Horario de atención: `[HORARIO_SOPORTE]`

---
## Muestras de Contenido Específico

### P6: ¿Cómo funciona el voto anónimo con "Pruebas ZK" (ZK-SNARKs)?
*   **Analogía Simple:** Imagina que tienes una tarjeta especial (`voterIdentifier`) que prueba que estás en la lista de votantes. Quieres demostrarle al sistema que tienes esta tarjeta sin mostrarla directamente. Con ZK-SNARKs, puedes generar una "prueba" (como una foto muy cleverly-taken de una sombra de tu tarjeta) que convence al sistema de que tienes la tarjeta correcta, pero la foto es tal que nadie puede deducir de ella cuál es tu tarjeta específica.
*   **Para tu Voto:** De forma similar, pruebas que tu voto es válido (para un candidato real, no has votado antes) sin revelar por quién votaste.
*   **Piloto:** En esta prueba, la "foto mágica" (la prueba ZK) es simulada por el sistema para agilizar las cosas. El objetivo es probar que todo el proceso funciona bien.

### P8: ¿Por qué necesito "revelar" mi voto en este piloto? ¿No contradice el anonimato?
*   **Voto Anónimo:** Cuando emites tu voto con `anonymousVote`, se registra en la blockchain un "compromiso" (`voteCommitment`). Este compromiso es como un sobre sellado y numerado. Nadie sabe qué hay dentro (tu candidato) ni de quién es el sobre (tu identidad). Solo se sabe que un voto válido fue emitido.
*   **Conteo para el Piloto:** Para contar los votos en este piloto, necesitamos "abrir los sobres" de forma controlada. En la fase de revelación, tú le dices al sistema: "El sobre sellado número XYZ (tu `voteCommitment`) contenía un voto para el Candidato A".
*   **¿Y el Anonimato?**
    *   La emisión inicial de tu voto (el sobre sellado) fue anónima.
    *   Cuando revelas, el sistema asocia ese sobre sellado (compromiso) a un candidato. La conexión entre *tú* (tu wallet de MetaMask) y ese sobre sellado podría ser visible para el backend que procesa la revelación.
    *   Este es un modelo **simplificado para el piloto**. El objetivo es probar el flujo de comprometer un voto anónimamente y luego poder contarlo. Sistemas ZK más avanzados pueden realizar el conteo sin necesidad de que cada individuo revele su voto de esta manera.
---
