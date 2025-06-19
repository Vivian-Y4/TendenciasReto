# Implementation and Deployment Guide

## 1. Introduction

This guide provides detailed instructions for setting up the development environment, compiling, deploying, and running all components of the "Vote with Blockchain" system. It covers smart contracts, ZK-SNARK circuits, the backend server, and the frontend client.

## 2. Prerequisites

Ensure you have the following software installed on your system:

*   **Node.js and npm:** (LTS version recommended, e.g., v18.x or later). npm is included with Node.js.
*   **Git:** For cloning the repository.
*   **MetaMask Browser Extension:** For interacting with the deployed smart contracts and frontend.
*   **(Optional) Yarn:** Alternative package manager to npm.
*   **(Optional) Docker:** For containerized deployment.
*   **Circom & SnarkJS:** For ZK circuit compilation and proof generation (see Section 5).

## 3. Project Setup (Root)

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd blockchain-voting # Or your project's root directory name
    ```

2.  **Install Root Dependencies:**
    The main `package.json` in the root contains dependencies for Hardhat, smart contract development, and potentially workspace management or concurrently running client/server.
    ```bash
    npm install
    # or
    # yarn install
    ```

## 4. Smart Contracts

### 4.1. Environment Configuration

Smart contract deployment and interaction often require sensitive information like private keys and RPC URLs.

1.  **Create `.env` file in the project root:**
    Copy `.env.example` (if provided) to `.env` or create a new one.
    ```
    SEPOLIA_RPC_URL="https_rpc_url_for_sepolia_network"
    PRIVATE_KEY="your_ethereum_account_private_key_for_deployment"
    # Optional: ETHERSCAN_API_KEY="your_etherscan_api_key_for_contract_verification"
    ```
    *   `SEPOLIA_RPC_URL`: Your node provider URL (e.g., from Infura, Alchemy) for the Sepolia testnet.
    *   `PRIVATE_KEY`: The private key of the account you'll use to deploy contracts. **Never commit this file to Git if it contains real private keys.**
    *   `ETHERSCAN_API_KEY`: If you plan to verify contracts on Etherscan.

### 4.2. Compilation

Compile the Solidity smart contracts:
```bash
npx hardhat compile
```
This command, defined in `package.json` (`scripts.compile`), will generate artifacts (ABI, bytecode) in the `artifacts/` directory and cache in `cache/`.

### 4.3. Testing

Run the automated tests for the smart contracts:
```bash
npx hardhat test
# To run specific tests (e.g., for improved system):
# npx hardhat test test/VotingSystem_Improved.test.js --config hardhat.config.enhanced.js
```
Ensure all tests pass before proceeding with deployment. The `contracts/README.md` might contain specific instructions for running tests with different configurations or coverage analysis.

### 4.4. Deployment

Deploy the smart contracts to a network (localhost, testnet, or mainnet). The `hardhat.config.js` file defines network configurations.

1.  **Deploying to Localhost (Hardhat Network or local node):**
    *   Start a local Hardhat node (if not using the default in-memory one):
        ```bash
        npx hardhat node
        ```
    *   In a new terminal, run the deployment script (example from `package.json`):
        ```bash
        # This example deploys the token, adapt for the main VotingSystem
        npx hardhat run scripts/deploy-token.js --network localhost
        # For the main system, you might have a script like:
        # npx hardhat run scripts/deploy.js --network localhost
        # Or for the improved version:
        # npx hardhat run scripts/deploy_improved.js --network localhost --config hardhat.config.enhanced.js
        ```
    *   Note the deployed contract addresses output by the script. These will be needed for the frontend and backend configuration.

2.  **Deploying to a Testnet (e.g., Sepolia):**
    Ensure your `.env` file has `SEPOLIA_RPC_URL` and `PRIVATE_KEY` (with test ETH for gas) correctly set.
    ```bash
    npx hardhat run scripts/deploy.js --network sepolia
    # Or for the improved version:
    # npx hardhat run scripts/deploy_improved.js --network sepolia --config hardhat.config.enhanced.js
    ```
    Again, save the deployed contract addresses.

### 4.5. Contract Verification (Optional, for Testnets/Mainnet)

If you deployed to a public testnet/mainnet and want to verify your contract source code on a block explorer like Etherscan:
```bash
# Example: npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "Constructor arg1" "Constructor arg2"
# Ensure ETHERSCAN_API_KEY is in .env and hardhat.config.js is set up for verification.
```
Refer to Hardhat documentation for detailed verification instructions.

## 5. ZK-SNARK Circuits (Circom & SnarkJS)

This process involves compiling the `.circom` files, performing a trusted setup to generate proving and verification keys, and generating a Solidity verifier contract.

### 5.1. Installation

*   **Circom:** Follow official Circom documentation to install the Circom compiler. ([https://docs.circom.io/getting-started/installation/](https://docs.circom.io/getting-started/installation/))
*   **SnarkJS:** Install globally or as a project dependency.
    ```bash
    npm install -g snarkjs
    # or add to devDependencies in package.json
    ```

### 5.2. Circuit Compilation & Setup Steps

These commands are typically run from the `circuits/` directory or project root, adjusting paths as needed.

1.  **Compile the Circuit (`.circom` -> `.r1cs`, `.wasm`):**
    The `.wasm` file is the WebAssembly prover.
    ```bash
    cd circuits
    circom vote.circom --r1cs --wasm --sym -o out
    # This generates vote.r1cs, vote.wasm, vote.sym in the 'out/' directory
    ```
    The `vote.circom` file includes `circomlib` circuits. Ensure `circomlib` is accessible (e.g., in `node_modules` at the project root as indicated by `../../node_modules/...` paths in `vote.circom`). If `circomlib` is not found, you might need to install it: `npm install circomlib`.

2.  **Powers of Tau Trusted Setup (Phase 1 - if not already done/downloaded):**
    This is a universal setup. You can download pre-generated files for common curves. SnarkJS documentation provides links. For example, for bn128 curve (commonly used):
    ```bash
    snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
    snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v -e="random text"
    # ... more contributions or download a prepared one.
    # A common one for up to 2^14 constraints is powersOfTau28_hez_final_14.ptau.
    # The project already contains `circuits/ptau/powersOfTau28_hez_final_14.ptau`.
    ```
    Let's assume `powersOfTau28_hez_final_14.ptau` is available in `circuits/ptau/`. The `TREE_LEVELS` in `vote.circom` is 20, meaning the circuit can be quite large. The power of tau file should support the number of constraints in your circuit. For `2^20` leaves, the constraints could be higher than what `ptau 14` supports. This needs verification. If a larger ptau file is needed, it must be sourced.

3.  **Per-Circuit Trusted Setup (Phase 2 - Groth16):**
    This generates the proving key (`.zkey`).
    ```bash
    # Assuming powersOfTau28_hez_final_14.ptau is in ptau/
    snarkjs groth16 setup out/vote.r1cs ptau/powersOfTau28_hez_final_14.ptau out/vote_0000.zkey
    snarkjs zkey contribute out/vote_0000.zkey out/vote_final.zkey --name="Test contribution" -v -e="random text"
    # In a real scenario, multiple independent contributions are essential.
    # For development, one contribution is often used.
    # The project already has `client/public/zk/vote_final.zkey`, which is likely this file.
    ```

4.  **Export Verification Key:**
    Extract the verification key from the `.zkey` file into a JSON format.
    ```bash
    snarkjs zkey export verificationkey out/vote_final.zkey out/verification_key.json
    ```
    This `verification_key.json` is used by SnarkJS to verify proofs in JavaScript and is also used to generate the Solidity verifier contract.

5.  **Generate Solidity Verifier Contract (`Verifier.sol`):**
    ```bash
    snarkjs zkey export solidityverifier out/vote_final.zkey contracts/GeneratedVerifier.sol
    ```
    This command generates a Solidity contract (e.g., `GeneratedVerifier.sol`) that can verify proofs on-chain. The project has `contracts/Verifier.sol` and `contracts/GeneratedVerifier.sol`. It's important to ensure the correct verifier is used and deployed. `GeneratedVerifier.sol` is typically the one to deploy.

6.  **Copy Assets to Frontend:**
    The WASM prover (`vote.wasm`) and the final proving key (`vote_final.zkey`) are needed by the frontend to generate proofs.
    ```bash
    cp out/vote.wasm ../client/public/zk/vote.wasm
    cp out/vote_final.zkey ../client/public/zk/vote_final.zkey
    ```
    The project structure already shows these files in `client/public/zk/`.

## 6. Backend Server

The backend is typically a Node.js application located in the `server/` directory.

### 6.1. Environment Configuration

Create a `.env` file in the `server/` directory (e.g., by copying `server/.env.example` if it exists).
```
NODE_ENV=development
PORT=3333
MONGODB_URI="your_mongodb_connection_string"
JWT_SECRET="a_very_strong_and_long_random_secret_for_jwt"
# Optional: ADMIN_SIGNER_PRIVATE_KEY="private_key_for_backend_blockchain_interactions"
# Optional: RPC_URL="ethereum_node_rpc_url_for_backend"
```
*   `PORT`: Port for the backend server.
*   `MONGODB_URI`: Connection string for your MongoDB instance (local or cloud).
*   `JWT_SECRET`: Secret key for signing and verifying JSON Web Tokens.

### 6.2. Install Dependencies
Navigate to the server directory and install its specific dependencies.
```bash
cd server
npm install
# or
# yarn install
```

### 6.3. Database Setup

*   Ensure your MongoDB server is running and accessible.
*   The Mongoose models (`server/models/`) define the schema. When the application starts, Mongoose will attempt to create collections based on these models if they don't exist.
*   **Migrations:** For schema changes after initial deployment, a migration strategy might be needed. The project includes `server/migrations/` which suggests a migration system is in place. Consult `server/migrations/migration-manager.js` or related scripts for how to run or create migrations.

### 6.4. Running in Development
```bash
# Still in server/ directory
npm run dev # Or 'npm start', check server/package.json scripts
```
This usually starts the server with `nodemon` for automatic restarts on file changes.

### 6.5. Building for Production (If applicable)
Some Node.js projects might have a build step (e.g., for TypeScript to JavaScript compilation). If this project uses plain JavaScript, this step might not be necessary. Check `server/package.json` for a `build` script.

### 6.6. Deployment Strategies
*   **PaaS (Platform as a Service):** Heroku, Render, etc.
*   **Containerization:** Build a Docker image and deploy to services like AWS ECS, Kubernetes, or Docker Swarm.
*   **Traditional Server:** PM2 process manager on a VPS or dedicated server.

Ensure environment variables are set correctly in the production environment.

## 7. Frontend Client

The frontend is a React application located in the `client/` directory.

### 7.1. Environment Configuration

Create a `.env` file in the `client/` directory. React uses environment variables prefixed with `REACT_APP_`.
```
REACT_APP_BACKEND_API_URL=http://localhost:3333/api
REACT_APP_VOTING_SYSTEM_CONTRACT_ADDRESS="address_from_smart_contract_deployment"
REACT_APP_VOTING_TOKEN_CONTRACT_ADDRESS="address_from_token_deployment_if_any"
REACT_APP_CHAIN_ID=1337 # Or the chain ID of Sepolia, Mainnet, etc.
# Add other necessary configurations like RPC URLs if not solely relying on MetaMask's provider
```
*   `REACT_APP_BACKEND_API_URL`: URL of the deployed backend server.
*   `REACT_APP_VOTING_SYSTEM_CONTRACT_ADDRESS`: Address of the deployed `VotingSystem.sol` contract.
*   `REACT_APP_CHAIN_ID`: The chain ID the frontend should primarily interact with.

### 7.2. Install Dependencies
```bash
cd client
npm install
# or
# yarn install
```

### 7.3. Running in Development
```bash
# Still in client/ directory
npm start
```
This will start the React development server (usually on `http://localhost:3000` or `http://localhost:3001` as per `client/package.json`).

### 7.4. Building for Production
```bash
# Still in client/ directory
npm run build
```
This creates an optimized static build of the React app in the `client/build/` directory.

### 7.5. Deployment Strategies
*   **Static Hosting:** Netlify, Vercel, GitHub Pages, AWS S3 + CloudFront.
*   **Serving from Backend:** The backend server can be configured to serve the static files from `client/build/`.

## 8. Integration & Post-Deployment Steps

1.  **Update Configurations:**
    *   Ensure the frontend `.env` file has the correct deployed backend API URL and smart contract addresses.
    *   Ensure the backend `.env` file (if it interacts with contracts) has the correct contract addresses and an RPC URL.
2.  **Set Verifier Address in `VotingSystem.sol`:**
    The `VotingSystem` smart contract needs to know the address of the deployed `GeneratedVerifier.sol` (or `Verifier.sol`). This is usually done by calling a function like `setVerifier(address verifierAddress)` on `VotingSystem.sol` by the contract owner/admin. This might be part of a deployment script or done manually via a Hardhat task or Etherscan.
3.  **Initial Admin User Setup (If applicable):**
    The system might require an initial admin user in the database. The `scripts/createAdmin.js` or `server/scripts/createAdmin.js` suggests a way to do this.
    ```bash
    # Example, might need to be run from root or server directory
    # node scripts/createAdmin.js <username> <password>
    ```
    Consult the script for actual usage.
4.  **Testing End-to-End:**
    Thoroughly test all functionalities: user registration (if any), admin login, election creation, voter registration, Merkle root setting, voting with ZK proof, vote revelation (if applicable), and result tallying.

This guide provides a comprehensive overview. Specific commands or steps might vary slightly based on final script implementations or unobserved configuration details. Always refer to individual `README.md` files within subdirectories (`contracts/`, `server/`, `client/`) for more targeted information.
