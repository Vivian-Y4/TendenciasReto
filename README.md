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

## Flujo de Uso

### Para Administradores:
1. Conectar wallet con cuenta de administrador
2. Crear una nueva elección
3. Añadir candidatos
4. Registrar votantes
5. Iniciar/finalizar la elección
6. Publicar resultados

### Para Votantes:
1. Conectar wallet
2. Autenticarse en la plataforma
3. Ver elecciones disponibles
4. Seleccionar una elección activa
5. Emitir voto
6. Verificar registro en blockchain
7. Ver resultados (cuando estén disponibles)

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
