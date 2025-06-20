# Tools and Technologies Used

This document outlines the primary tools, programming languages, frameworks, and libraries utilized in the "Vote with Blockchain" project.

## 1. Project-Wide & Development Environment

*   **Node.js:** JavaScript runtime environment used for backend development, scripting, and running various development tools.
*   **NPM (Node Package Manager):** Default package manager for Node.js, used for managing project dependencies across frontend, backend, and smart contract development.
*   **Git:** Distributed version control system for tracking changes and collaboration.
*   **dotenv:** Module to load environment variables from a `.env` file.
*   **Visual Studio Code (Implied):** The `.vscode/settings.json` file suggests its use as a common code editor/IDE.

## 2. Smart Contracts (Blockchain Logic)

*   **Solidity:**
    *   **Version:** 0.8.17 (as specified in `hardhat.config.js`).
    *   **Description:** The primary programming language for writing smart contracts on Ethereum-compatible blockchains.
*   **Hardhat:**
    *   **Description:** A comprehensive Ethereum development environment. Used for compiling, deploying, testing, and debugging smart contracts.
    *   **Key Plugins/Libraries:**
        *   `@nomiclabs/hardhat-ethers` & `ethers.js`: For interacting with Ethereum smart contracts from JavaScript/TypeScript, used extensively in deployment scripts and tests.
        *   `@nomiclabs/hardhat-waffle` & `ethereum-waffle`: For writing smart contract tests with a Mocha-based framework.
        *   `chai`: Assertion library used with Waffle for writing expressive tests.
*   **OpenZeppelin Contracts:**
    *   **Description:** A library of reusable and secure smart contract components (e.g., for access control, token standards). Version `^4.9.5` is used.
*   **Mocha:**
    *   **Description:** JavaScript test framework that Hardhat uses under the hood for running automated tests.
*   **Slither (Mentioned for use):**
    *   **Description:** A Solidity static analysis framework for finding vulnerabilities.

## 3. Zero-Knowledge Proofs (Circuits)

*   **Circom:**
    *   **Description:** A domain-specific language (DSL) for writing arithmetic circuits, which are fundamental for creating ZK-SNARKs. The `vote.circom` file defines the logic for anonymous voting.
    *   **Version:** `pragma circom 2.0.0;`
*   **Circomlib:**
    *   **Description:** A standard library of basic circuits for Circom, including cryptographic primitives like Poseidon hashing and Merkle tree verifiers.
*   **Poseidon Hash Function:**
    *   **Description:** A SNARK-friendly hash function used extensively within the Circom circuits for tasks like creating Merkle tree leaves, nullifiers, and vote commitments. Consistency with a JavaScript Poseidon implementation is crucial.
*   **SnarkJS (Implied):**
    *   **Description:** A JavaScript library used for the entire ZK-SNARK lifecycle with Circom:
        *   Compiling Circom code (`.circom`) into an intermediate representation (`.r1cs`).
        *   Performing the trusted setup (generating proving and verification keys - `.zkey`).
        *   Generating client-side prover code (`.wasm`).
        *   Generating proofs in JavaScript.
        *   Verifying proofs in JavaScript.
    *   **Evidence:** Presence of `vote.wasm` and `vote_final.zkey` in `client/public/zk/`.

## 4. Backend (Server-Side Logic & API)

*   **Node.js & Express.js:**
    *   **Description:** Node.js is the runtime, and Express.js is a minimal and flexible Node.js web application framework used to build the RESTful APIs for the application.
*   **MongoDB:**
    *   **Description:** A NoSQL document-oriented database used for storing application data such as election details, user information (potentially hashed credentials), and voter registration lists (identifiers).
*   **Mongoose:**
    *   **Description:** An Object Data Modeling (ODM) library for MongoDB and Node.js. It provides schema validation, type casting, and business logic hooks.
*   **JSON Web Tokens (JWT):**
    *   **Library:** `jsonwebtoken`.
    *   **Description:** Used for creating access tokens to authenticate and authorize users for protected API routes.
*   **bcryptjs:**
    *   **Description:** Library for hashing passwords securely before storing them.
*   **CORS (Cross-Origin Resource Sharing):**
    *   **Library:** `cors`.
    *   **Description:** Node.js package to enable and configure CORS, allowing the frontend (running on a different port/domain) to make requests to the backend API.
*   **Cryptographic Libraries (for Merkle Trees, Hashes):**
    *   `keccak256`: For Keccak256 hashing, often used in Ethereum contexts.
    *   `merkletreejs`: For constructing and verifying Merkle trees on the server-side (e.g., for the voter eligibility list).
    *   `poseidon-lite`: A lightweight JavaScript implementation of the Poseidon hash function, crucial for consistency with the Circom circuits.

## 5. Frontend (Client-Side User Interface)

*   **React:**
    *   **Description:** A JavaScript library for building user interfaces, used as the foundation for the client-side application.
    *   **Version:** `^18.2.0`.
*   **React DOM (`react-dom`):**
    *   **Description:** Provides DOM-specific methods that can be used at the top level of a React application.
*   **Create React App (`react-scripts`):**
    *   **Description:** The project was likely set up or is managed using Create React App, which provides scripts for starting, building, and testing the React application.
*   **React Router (`react-router-dom`):**
    *   **Description:** For handling navigation and routing within the single-page application.
*   **Axios:**
    *   **Description:** A promise-based HTTP client for making API calls from the frontend to the backend.
*   **Web3 Interaction:**
    *   `@web3-react/core` & `@web3-react/injected-connector`: Libraries to facilitate interaction with Ethereum wallets (like MetaMask) from the React application, enabling users to connect their wallets and sign transactions.
    *   `web3`: A comprehensive JavaScript library for interacting with Ethereum, can be used for wallet interactions, contract calls, etc.
    *   `@ethersproject/providers`: Ethers.js providers, potentially used for specific Ethereum provider functionalities.
*   **UI & Styling:**
    *   **Bootstrap:** A popular CSS framework for building responsive and mobile-first websites.
    *   **React Bootstrap (`react-bootstrap`):** Provides React components that implement Bootstrap styles and layouts.
*   **Charting:**
    *   **Chart.js:** A JavaScript library for creating various types of charts.
    *   **React Chart.js 2 (`react-chartjs-2`):** React components for Chart.js.
*   **Internationalization (i18n):**
    *   **i18next:** A framework for internationalizing web applications.
    *   **react-i18next:** React bindings for i18next.
*   **Notifications:**
    *   **React Toastify (`react-toastify`):** For displaying non-intrusive toast notifications to the user.
*   **Testing:**
    *   `@testing-library/jest-dom` & `@testing-library/react`: Utilities for testing React components.
*   **Web Vitals (`web-vitals`):**
    *   **Description:** A library for measuring and reporting on user experience metrics.

## 6. Database

*   **MongoDB:** (Also listed under Backend)
    *   **Description:** The chosen NoSQL database for storing application data.

This list provides a comprehensive overview of the technologies involved in building the "Vote with Blockchain" application. Each tool plays a specific role in the development, deployment, or execution of the system.
