# Comprehensive Project Documentation: Blockchain Electronic Voting Web Application

## Part I: Introduction

This document provides a comprehensive overview of the "Vote with Blockchain" project. This project aims to develop and pilot a secure, transparent, and auditable electronic voting system leveraging blockchain technology, zero-knowledge proofs (ZK-SNARKs) for voter anonymity, and a robust backend and frontend infrastructure. It details the project's background, the technologies used, its system architecture, database schema, a detailed implementation and deployment guide, and a usage guide for both administrators and voters.

---

## Part II: Project Background and State of the Art: Blockchain Voting Systems

### 1. Introduction

Traditional voting systems, while established, often face challenges related to transparency, security, accessibility, and cost. The advent of blockchain technology has introduced a new paradigm for conducting elections, promising to address some of these long-standing issues. This document provides an overview of the background of blockchain-based voting, its current state of the art, and positions the "Vote with Blockchain" project within this evolving landscape.

This project aims to develop and pilot a secure, transparent, and auditable electronic voting system leveraging blockchain technology, zero-knowledge proofs (ZK-SNARKs) for voter anonymity, and a robust backend and frontend infrastructure.

### 2. Traditional Voting Systems: Challenges

Understanding the motivation for blockchain voting requires acknowledging the limitations of existing methods:

*   **Transparency:** Lack of a fully transparent and easily verifiable process for all participants.
*   **Security:**
*   **Auditability:** Complex and often resource-intensive processes for auditing election results.
*   **Accessibility:** Challenges for remote or disabled voters.
*   **Cost:** High costs associated with printing ballots, logistics, manual counting, and recounts.
*   **Voter Trust:** Declining trust in electoral processes in some regions due to perceived opaqueness or security concerns.

### 3. Blockchain Technology in Voting: Potential and Promises

Blockchain, as a distributed, immutable, and transparent ledger, offers several potential benefits for electoral processes:

*   **Enhanced Transparency:** All voting transactions (potentially anonymized) can be recorded on a public or permissioned blockchain, allowing for public verifiability.
*   **Improved Security:** Cryptographic hashing and the distributed nature of blockchain make it extremely difficult to tamper with recorded votes.
*   **Increased Auditability:** Election results can be audited more easily and efficiently by verifying the integrity of the blockchain.
*   **Potential for Anonymity:** Through cryptographic techniques like zero-knowledge proofs, homomorphic encryption, or blind signatures, voter privacy can be protected while ensuring vote integrity.
*   **Immutability:** Once a vote is cast and recorded on the blockchain, it cannot be altered or deleted.
*   **Reduced Single Points of Failure:** A decentralized system is more resilient to attacks or failures compared to centralized systems.
*   **Potential Cost Reduction:** Over the long term, reduced need for paper ballots, manual counting, and complex reconciliation processes could lower costs.
*   **Increased Voter Turnout:** Secure remote voting capabilities could improve accessibility and encourage wider participation.

### 4. State of the Art in Blockchain Voting

The field of blockchain voting is dynamic, with various approaches and ongoing research. Key areas and trends include:

*   **Types of Blockchains:**
    *   **Public Blockchains (e.g., Ethereum):** Offer high transparency and decentralization but can have scalability and cost issues (gas fees).
    *   **Permissioned/Private Blockchains (e.g., Hyperledger Fabric):** Provide more control over participants and potentially higher transaction throughput, suitable for consortium-based governance.
*   **Anonymity and Privacy Techniques:**
    *   **Zero-Knowledge Proofs (ZK-SNARKs/STARKs):** Allow voters to prove they are eligible to vote and that their vote is valid without revealing their identity or choice. This project utilizes ZK-SNARKs.
    *   **Homomorphic Encryption:** Enables computation (tallying) on encrypted votes without decrypting them first.
    *   **Blind Signatures:** Allow a voter to get their ballot signed by an authority without the authority knowing the content of the ballot.
    *   **Mixers/Mixnets:** Obscure the link between voters and their votes by shuffling transactions.
*   **Identity Management:**
    *   Linking a voter's real-world identity to a digital voting credential securely and privately is a major challenge.
    *   Approaches include government-issued digital IDs, pseudonymous identifiers, and decentralized identity solutions. This project uses `voterIdentifier`s, which are pseudo-anonymous identifiers.
*   **Vote Verification:**
    *   **Individual Verifiability:** Voters can check that their vote was included in the tally.
    *   **Universal Verifiability:** Anyone can verify that the tallying process was correct.
*   **Challenges and Concerns:**
    *   **Scalability:** Handling a large number of votes in a short period.
    *   **Security of End-User Devices:** Voters' personal devices (computers, smartphones) can be compromised.
    *   **Coercion and Vote Buying:** Ensuring voters cast their ballots freely, especially in remote voting scenarios.
    *   **Digital Divide:** Ensuring access for voters without reliable internet or digital literacy.
    *   **Governance of the System:** Who controls the blockchain, smart contracts, and keys?
    *   **Complexity:** The underlying technology can be complex to understand for the general public and policymakers.
    *   **Lack of Mature Standards:** The field is still evolving, and widely accepted standards are yet to emerge.
    *   **Regulatory Acceptance:** Legal and regulatory frameworks for blockchain voting are still developing in most jurisdictions.

### 5. The "Vote with Blockchain" Project in Context

The "Vote with Blockchain" project aims to address several of the above points by:

*   **Utilizing a Blockchain:** The specific type (e.g., Ethereum testnet, dedicated permissioned chain) will be detailed in the "Tools Used" section, but the core idea is to leverage the immutability and auditability of a distributed ledger.
*   **Implementing ZK-SNARKs:** For ensuring voter anonymity while allowing for the verification of eligibility and vote validity. This is a state-of-the-art approach to privacy in e-voting.
*   **Employing `voterIdentifier`s:** As a method for pseudo-anonymous registration, linking eligible voters to the system without directly exposing personal identities on-chain during the voting act.
*   **Focusing on a Pilot Program:** To test feasibility, gather user feedback, and identify practical challenges in a controlled environment. This iterative approach is crucial for such a sensitive application.
*   **Separation of Concerns:** With a frontend (client), backend (server), and smart contracts, the architecture allows for modular development and potentially different trust domains.

The project acknowledges the challenges, particularly those related to end-user device security and the digital divide, which are broader societal issues. However, by focusing on the technical implementation of a secure and anonymous voting protocol, it contributes to the advancement and practical understanding of blockchain-based e-voting systems.

### 6. Future Directions

The broader field of blockchain voting is moving towards:
*   More robust and user-friendly identity solutions.
*   Improved scalability and lower costs.
*   Enhanced resistance to coercion and vote-selling.
*   Development of formal verification methods for smart contracts and cryptographic protocols.
*   Greater integration with existing legal and electoral frameworks.

This project, through its findings and the system developed, will provide valuable insights for future iterations and potential larger-scale deployments of similar technologies.

---

## Part III: System Architecture

### 1. Overview

### 1. Introduction

The "Vote with Blockchain" system is designed as a multi-component application that leverages blockchain for transparency and security, zero-knowledge proofs for voter anonymity, a backend for business logic and orchestration, and a frontend for user interaction. This document describes the architecture of the system and how these components integrate to provide a comprehensive e-voting solution.

#### 2. Core Components

The system comprises the following core components:

*   **Frontend (Client):** A web-based user interface (React application) that voters and administrators interact with. It allows users to connect their Ethereum wallets (e.g., MetaMask), view election details, cast votes, and for administrators, to manage elections.
*   **Backend (Server):** A Node.js/Express.js application that serves as an intermediary between the frontend, the database, and sometimes the blockchain. It handles business logic, user authentication/authorization (for admins), data management, and orchestrates complex processes like ZK proof generation support and Merkle tree management.
*   **Blockchain & Smart Contracts:**
    *   **Smart Contracts (Solidity):** Deployed on an Ethereum-compatible blockchain (e.g., localhost Hardhat node, Sepolia testnet). These contracts define the core voting logic, manage election states, store commitments (like vote commitments and Merkle roots), and handle the registration of voters (or their identifiers) and the final vote tally. Key contracts include `VotingSystem.sol` and helper contracts like `Verifier.sol`.
    *   **Blockchain Network:** Provides the immutable and auditable ledger for recording key election events and data.
*   **Zero-Knowledge (ZK) Circuits & Prover/Verifier:**
    *   **Circom Circuits (`vote.circom`):** Define the arithmetic circuit for generating a ZK-SNARK proof. This proof demonstrates that a voter is eligible and has constructed their vote correctly without revealing their identity or vote choice.
    *   **Prover (Client-side & potentially Server-side):** Logic (likely using SnarkJS with WASM generated from Circom) to take private inputs (voter's secret, candidate choice, etc.) and generate a proof. This primarily happens on the client-side to maintain privacy.
    *   **Verifier (`Verifier.sol`):** A smart contract that can verify the ZK-SNARK proofs submitted with an anonymous vote.
*   **Database (MongoDB):** Used by the backend to store off-chain data, such as:
    *   Administrator credentials.
    *   Detailed election information that might be too costly or large for the blockchain.
    *   Lists of `voterIdentifier`s for elections before they are committed to the Merkle tree.
    *   Cached data or logs.

#### 3. High-Level Architecture

The system follows a layered architecture:

```
+---------------------+     +---------------------+     +-----------------------+
|     Frontend        | --> |      Backend        | --> |       Database        |
| (React, Web3-React) |     | (Node.js, Express)  |     |      (MongoDB)        |
+---------------------+     +---------------------+     +-----------------------+
          ^                           |
          |                           | (Manages, Orchestrates)
          |                           v
+-----------------------------------------------------------------------------+
|                             Blockchain Network                              |
| +-----------------------+   +-----------------------+   +-----------------+ |
| |   VotingSystem.sol    |   |    VotingToken.sol    |   |  Verifier.sol   | |
| |  (Election Mgmt,     |   |  (If token-based       |   |  (ZK Proof      | |
| |   Vote Commitments,   |   |   voting eligibility) |   |   Verification) | |
| |   Merkle Roots)       |   +-----------------------+   +-----------------+ |
| +-----------------------+                                                 |
+-----------------------------------------------------------------------------+
          ^
          | (ZK Proof Generation - Client Side)
+---------------------+
|   ZK Circuits       |
| (Circom, SnarkJS)   |
+---------------------+
```

**Interaction Summary:**

*   **Users (Voters/Admins)** interact with the **Frontend**.
*   The **Frontend** communicates with:
    *   The **Backend** for data, administrative actions, and complex operations (e.g., initiating Merkle root calculation).
    *   The **Blockchain** (via user's wallet like MetaMask) for sending transactions (e.g., casting votes, deploying/calling admin functions on contracts).
    *   **ZK Circuits** (via client-side JavaScript using SnarkJS/WASM) to generate proofs.
*   The **Backend** communicates with:
    *   The **Database** for storing and retrieving application data.
    *   The **Blockchain** (potentially, using an admin wallet/provider) for administrative contract calls or listening to events.
*   **Smart Contracts** on the blockchain hold the core, verifiable logic and state.
*   The **`Verifier.sol`** smart contract is called by `VotingSystem.sol` to verify ZK proofs during anonymous voting.

#### 4. Key Interaction Flows

##### 4.1. Admin: Election Setup

1.  **Admin UI (Frontend):** Admin navigates to "Create Election" section.
2.  **Frontend -> Backend:** Election details (name, description, start/end times, candidates) are sent to a secure backend API endpoint.
3.  **Backend:**
    *   Authenticates/authorizes the admin.
    *   Validates the input.
    *   Stores detailed election information in the **Database**.
    *   (Option 1: Backend triggers contract call) Sends a transaction to the `VotingSystem.sol` smart contract (via an admin blockchain account) to call `createElection` with core details.
    *   (Option 2: Frontend triggers contract call) Backend returns success, and frontend (using admin's connected wallet) calls `createElection`. This is less common for setup data that also needs DB storage.
4.  **VotingSystem.sol (Blockchain):**
    *   The `createElection` function is executed.
    *   An `ElectionCreated` event is emitted.
    *   Core election parameters are stored on the blockchain.
5.  **Backend (Optional):** Listens for `ElectionCreated` event to confirm and update its database status.
6.  **Backend -> Frontend:** Confirmation is sent back to the admin UI.

##### 4.2. Admin: Voter Registration & Merkle Tree Setup

1.  **Admin UI (Frontend):** Admin uploads a list of `voterIdentifier`s for a specific election.
2.  **Frontend -> Backend:** The list is sent to a secure backend API endpoint.
3.  **Backend:**
    *   Validates the list and associates it with the election in the **Database**.
    *   Once the registration period is considered closed, the admin triggers Merkle root generation via the UI.
    *   **Frontend -> Backend:** Request to generate and set Merkle root.
4.  **Backend:**
    *   Retrieves all registered `voterIdentifier`s for the election from the **Database**.
    *   Uses `merkletreejs` and `poseidon-lite` (or `keccak256`) to build a Merkle tree from these identifiers.
    *   Calculates the Merkle root.
    *   Sends a transaction to `VotingSystem.sol` to call `setMerkleRoot(electionId, merkleRoot)`.
5.  **VotingSystem.sol (Blockchain):**
    *   Stores the `merkleRoot` for the given `electionId`.
    *   Emits an event (e.g., `MerkleRootSet`).
6.  **Backend -> Frontend:** Confirmation of Merkle root setting is displayed to the admin.

##### 4.3. Voter: Anonymous Voting Process

1.  **Voter UI (Frontend):**
    *   Voter connects their wallet (MetaMask).
    *   Selects an active election and a candidate.
2.  **Frontend (Client-Side ZK Proof Generation):**
    *   The frontend retrieves necessary data:
        *   `voterSecret` (managed by the voter, potentially derived from a signature or entered if designed that way).
        *   `voterIdentifier` (corresponding to the voter's wallet, possibly fetched from backend after authentication or managed by voter).
        *   Merkle path for their `voterIdentifier` (fetched from **Backend**; backend would query DB and reconstruct path elements from the full list of identifiers for that election's tree).
        *   `candidateId` (selected by voter).
        *   `voteNonce` (randomly generated client-side).
        *   `electionId`.
    *   Using **SnarkJS** and the compiled **WASM circuit (`vote.wasm`)**:
        *   Calculates inputs for the ZK circuit: `leaf`, `nullifierHash`, `voteCommitment`.
        *   Generates the ZK proof (`proof`) and public signals (`publicSignals` which include `merkleRoot`, `nullifierHash`, `voteCommitment`).
3.  **Frontend -> Blockchain (MetaMask):**
    *   Voter submits a transaction to `VotingSystem.sol` calling `anonymousVote(electionId, proof, publicSignals.merkleRoot, publicSignals.nullifierHash, publicSignals.voteCommitment)`.
    *   (Note: `publicSignals.merkleRoot` should match the one set by the admin for that election).
4.  **VotingSystem.sol (Blockchain):**
    *   Receives the `anonymousVote` call.
    *   Calls `Verifier.sol`'s `verifyProof(proof, publicSignals)` function.
    *   **Verifier.sol (Blockchain):** Verifies the ZK proof against the public inputs. Returns true if valid.
    *   If proof is valid, `VotingSystem.sol`:
        *   Checks that the `merkleRoot` in `publicSignals` matches the election's official `merkleRoot`.
        *   Checks that the `nullifierHash` has not been used before for this `electionId` (to prevent double-voting). Records it if new.
        *   Stores the `voteCommitment`.
        *   Emits an event (e.g., `VoteCommitted`).
5.  **Frontend:** Displays confirmation or error to the voter based on transaction success/failure. The voter also stores `candidateId` and `voteNonce` (or the derived `voteCommitment`) locally if a reveal phase is required by the specific voting protocol variant.

*(The document would continue with flows for Vote Counting/Tallying, which might involve a reveal phase similar to what's described in the pilot docs, or direct tallying if the ZK scheme supports it without explicit user revelation.)*

#### 5. Data Flow Summary

*   **Election Definitions & Candidates:** Admin (Frontend) -> Backend (DB) -> Blockchain (Smart Contract).
*   **Voter Identifiers (Pre-registration):** Admin (Frontend) -> Backend (DB).
*   **Merkle Root:** Calculated by Backend (from DB data) -> Blockchain (Smart Contract).
*   **Voter's Private Inputs (secret, nonce):** Reside only on the voter's client (Frontend).
*   **ZK Proof:** Generated on Frontend -> Submitted to Blockchain (Smart Contract).
*   **Vote Commitments & Nullifiers:** Generated on Frontend (as public signals of ZK proof) -> Stored on Blockchain (Smart Contract).
*   **Aggregated Results:** Calculated by Smart Contract (potentially with Backend assistance for off-chain aggregation if needed) -> Displayed on Frontend (via Backend or direct contract read).

#### 6. Integration Points & Communication Protocols

*   **Frontend to Backend:** HTTPS/RESTful APIs (using JSON).
*   **Frontend to Blockchain:** Web3 provider (MetaMask) using JSON-RPC to an Ethereum node.
*   **Backend to Blockchain:** Ethers.js using JSON-RPC to an Ethereum node (for admin functions or event listening).
*   **Backend to Database:** MongoDB driver connection.
*   **Smart Contract to Smart Contract:** Direct function calls within the EVM (e.g., `VotingSystem` calling `Verifier`).

This architecture aims for a separation of concerns, leveraging each component for its strengths while ensuring the integrity and anonymity of the voting process.

---

## Part IV: Tools and Technologies Used

This document outlines the primary tools, programming languages, frameworks, and libraries utilized in the "Vote with Blockchain" project.

### 1. Project-Wide & Development Environment

*   **Node.js:** JavaScript runtime environment used for backend development, scripting, and running various development tools.
*   **NPM (Node Package Manager):** Default package manager for Node.js, used for managing project dependencies across frontend, backend, and smart contract development.
*   **Git:** Distributed version control system for tracking changes and collaboration.
*   **dotenv:** Module to load environment variables from a `.env` file.
*   **Visual Studio Code (Implied):** The `.vscode/settings.json` file suggests its use as a common code editor/IDE.

### 2. Smart Contracts (Blockchain Logic)

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

### 3. Zero-Knowledge Proofs (Circuits)

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

### 4. Backend (Server-Side Logic & API)

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

### 5. Frontend (Client-Side User Interface)

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

### 6. Database

*   **MongoDB:** (Also listed under Backend)
    *   **Description:** The chosen NoSQL database for storing application data.

This list provides a comprehensive overview of the technologies involved in building the "Vote with Blockchain" application. Each tool plays a specific role in the development, deployment, or execution of the system.

---

## Part V: Database Schema (MongoDB)

This document outlines the MongoDB database schema used by the backend server. The schema is defined using Mongoose models.

### Core Models

### 1. Admin (`Admin.js`)

Stores information about system administrators.

*   **`name`**: String (Required) - Full name of the admin.
*   **`username`**: String (Required, Unique) - Login username.
*   **`password`**: String (Required) - Hashed password.
*   **`walletAddress`**: String - Admin's Ethereum wallet address (optional).
*   **`permissions`**: Object - Granular permissions for various admin actions (e.g., `canCreateElections`, `canManageVoters`).
    *   `canViewDashboard`: Boolean
    *   `canCreateElections`: Boolean
    *   `canManageElections`: Boolean
    *   `canManageVoters`: Boolean
    *   `canFinalizeResults`: Boolean
    *   `canViewReports`: Boolean
    *   `canManageAdmins`: Boolean
    *   `canManageSettings`: Boolean
    *   `canViewActivity`: Boolean
*   **`createdAt`**: Date - Timestamp of creation.

**Methods:**
*   `comparePassword(candidatePassword)`: Compares a candidate password with the stored hash.
*   `generateAuthToken()`: Generates a JWT for session management.
**Middleware:**
*   `pre('save')`: Hashes the password before saving if it's modified.

### 2. User (`User.js`)

Represents general users of the platform, primarily identified by their wallet address. This model can also represent voters.

*   **`address`**: String (Required, Unique) - User's Ethereum wallet address.
*   **`name`**: String - User's name (optional).
*   **`email`**: String - User's email (optional, with validation).
*   **`province`**: String - User's province (optional).
*   **`isAdmin`**: Boolean - Flag indicating if the user has admin privileges (default: false).
*   **`roles`**: Array of Strings - Roles assigned to the user (e.g., 'voter', 'admin', 'observer').
*   **`preferredLanguage`**: String - User's language preference (default: 'es').
*   **`isVerified`**: Boolean - Whether the user's identity/wallet is verified.
*   **`nonce`**: String - Cryptographic nonce used for wallet-based authentication (sign-in with Ethereum).
*   **`nonceUsed`**: Boolean - Whether the current nonce has been used.
*   **`lastNonceCreatedAt`**: Date - Timestamp of nonce generation.
*   **`lastLogin`**: Date - Timestamp of the last login.
*   **`registrationDate`**: Date - Timestamp of registration.
*   **`metaData`**: Mixed - For storing additional arbitrary data.
*   **`participatedElections`**: Array of Objects - Records elections the user has participated in.
    *   `electionId`: Number (Contract's election ID)
    *   `votedAt`: Date
*   **`timestamps`**: Mongoose option, adds `createdAt` and `updatedAt`.

**Methods:**
*   `generateAuthToken()`: Generates a JWT.
*   `generateNonce()`: Generates a new nonce for authentication.
*   `isNonceValid()`: Checks if the current nonce is still valid.
*   `markNonceAsUsed()`: Marks the current nonce as used.

### 3. Election (`Election.js`)

Stores detailed information about each election.

*   **`title`**: String (Required) - Title of the election.
*   **`description`**: String (Required) - Description of the election.
*   **`level`**: String (Required) - Level of election (e.g., 'presidencial', 'senatorial').
*   **`province`**: String - Province, if applicable.
*   **`municipality`**: String - Municipality, if applicable.
*   **`startDate`**: Date (Required) - Start date and time.
*   **`endDate`**: Date (Required) - End date and time.
*   **`registrationDeadline`**: Date - Deadline for voter registration.
*   **`actualEndDate`**: Date - Actual end time if closed manually.
*   **`status`**: String (Enum: 'draft', 'active', 'suspended', 'closed', 'canceled', Default: 'draft').
*   **`settings`**: ObjectId (Ref: `ElectionSettings`) - Link to specific election settings.
*   **`categories`**: Array of `electionCategorySchema` - Defines specific categories/positions for this election.
    *   `categoryId`: ObjectId (Ref: `ElectoralCategory`)
    *   `name`: String
    *   `maxSelections`: Number
*   **`allowedVoters`**: Array of ObjectId (Ref: `Voter`) - List of voters explicitly allowed (if not public).
*   **`totalVotes`**: Number - Counter for total votes cast in this election (off-chain tally).
*   **`totalRegisteredVoters`**: Number - Counter for registered voters for this election.
*   **`isPublic`**: Boolean - If the election is open to all eligible voters or restricted.
*   **`requiresRegistration`**: Boolean - If voters need to be pre-registered.
*   **`eligibilityRequirements`**: `eligibilityRequirementsSchema` - Defines criteria for voter eligibility.
*   **`createdBy`**: ObjectId (Ref: `Admin`, Required) - Admin who created the election.
*   **`lastModifiedBy`**: ObjectId (Ref: `Admin`) - Admin who last modified the election.
*   **`contractAddress`**: String - Blockchain address of the deployed election contract (if applicable).
*   **`blockchainId`**: String - ID of the election on the smart contract.
*   **`merkleRoot`**: String - The Merkle root of registered voter identifiers for ZK proofs.
*   **`results`**: Object - Stores election results.
    *   `totalVotes`: Number
    *   `abstentions`: Number
    *   `candidateResults`: Array of `candidateResultSchema` (candidateId, name, voteCount, percentage)
    *   `lastUpdated`: Date
*   **`resultsPublished`**: Boolean - Whether results are publicly visible.
*   **`additionalInfo`**: Mixed - For any other relevant information.
*   **`timestamps`**: Adds `createdAt` and `updatedAt`.

**Methods:**
*   `isActive()`: Checks if the election is currently active.
*   `isOpenForVoting()`: Checks if voting is currently allowed.
*   `isVoterEligible(voter)`: Checks if a given voter is eligible.
*   `updateResults(results)`: Updates the election results.
*   `changeStatus(newStatus, admin)`: Changes the election's status.
**Statics:**
*   `getActiveElections()`: Fetches all active public elections.
*   `getElectionsByStatus(status)`: Fetches elections by a specific status.

### 4. Candidate (`Candidate.js`)

Stores information about candidates participating in elections.

*   **`firstName`**: String (Required) - Candidate's first name.
*   **`lastName`**: String (Required) - Candidate's last name.
*   **`party`**: String - Candidate's political party.
*   **`election`**: ObjectId (Ref: `Election`, Required) - The election this candidate is part of.
*   **`category`**: ObjectId (Ref: `ElectoralCategory`) - The electoral category/position.
*   **`position`**: Number - Display order or list position.
*   **`biography`**: String - Candidate's biography.
*   **`manifesto`**: String - Candidate's platform/manifesto.
*   **`contactInfo`**: Object (email, phone, website).
*   **`socialMedia`**: Object (twitter, facebook, etc.).
*   **`walletAddress`**: String (Unique, Sparse) - Candidate's Ethereum wallet address (optional).
*   **`photoUrl`**: String - URL to candidate's photo.
*   **`isActive`**: Boolean - If the candidate is currently active.
*   **`registeredBy`**: ObjectId (Ref: `Admin`).
*   **`proposals`**: String - Candidate's proposals.
*   **`officeSought`**: String - Name of the office/role being sought.
*   **`votes`**: Number - Off-chain vote count for this candidate in the election.
*   **`timestamps`**: Adds `createdAt` and `updatedAt`.

**Virtuals:**
*   `fullName`: Concatenates `firstName` and `lastName`.
**Methods:**
*   `updateVotes(votes, totalVotes)`: Updates the candidate's vote count.
**Statics:**
*   `getActiveByElection(electionId)`: Fetches active candidates for an election.

### 5. Voter (`Voter.js`)

Represents individuals eligible to vote. This model seems to be for backend management of voters, potentially distinct from the `User` model which might be more for frontend interaction/authentication.

*   **`walletAddress`**: String (Unique, Sparse) - Voter's Ethereum wallet address.
*   **`voterIdentifier`**: String (Unique, Sparse, Indexed) - A unique identifier for the voter, used for ZK proofs (this is the leaf in the Merkle tree).
*   **`publicKey`**: String (Unique, Sparse) - Voter's public key (if applicable).
*   **`firstName`**: String.
*   **`lastName`**: String.
*   **`email`**: String (Unique, Sparse).
*   **`nationalId`**: String (Unique, Sparse) - National identification number.
*   **`username`**: String (Unique, Sparse) - If using username/password auth for voters.
*   **`password`**: String (Select: false) - Hashed password.
*   **`district`**: String - Geographical district.
*   **`province`**: String.
*   **`votingHistory`**: Array of Objects - Records of past votes.
    *   `election`: ObjectId (Ref: `Election`)
    *   `voteDate`: Date
    *   `blockchainTxHash`: String
*   **`hasVoted`**: Boolean - Flag for the current/active election context (may need careful management if a voter participates in multiple elections).
*   **`status`**: String (Enum: 'active', 'inactive', 'suspended', 'pending', Default: 'pending').
*   **`isVerified`**: Boolean - Whether the voter's identity is verified.
*   **`identityVerification`**: `identityVerificationSchema` - Details about how identity was verified.
*   **`eligibleElections`**: Array of ObjectId (Ref: `Election`) - Elections this voter is eligible for.
*   **`registeredBy`**: ObjectId (Ref: `Admin`).
*   **`timestamps`**: Adds `createdAt` and `updatedAt`.

**Methods:**
*   `isEligible()`: Checks if the voter is eligible (verified and hasn't voted).
*   `castVote(signature)`: Marks the voter as having cast a vote.

### 6. Vote (`Vote.js`)

Records each individual vote cast on the blockchain.

*   **`electionId`**: ObjectId (Ref: `Election`, Required) - The election this vote belongs to.
*   **`voterId`**: ObjectId (Ref: `Voter`, Required) - The voter who cast this vote (backend reference).
*   **`candidateId`**: ObjectId (Required) - The candidate chosen. (Note: In ZK systems, this might be the commitment to the candidate, not the plain ID directly if the Vote model tracks revealed votes).
*   **`blockchainTxId`**: String (Required, Unique) - Transaction ID from the blockchain.
*   **`voteHash`**: String (Required, Unique) - A unique hash representing the vote (e.g., vote commitment in ZK).
*   **`timestamp`**: Date - Time the vote was recorded.
*   **`status`**: String (Enum: 'pending', 'confirmed', 'failed', Default: 'pending').
*   **`blockNumber`**: Number - Blockchain block number where the vote was confirmed.
*   **`verificationData`**: Object (signature, publicKey, nonce) - Data related to vote verification.
*   **`timestamps`**: Adds `createdAt` and `updatedAt`.

**Methods:**
*   `verifyIntegrity()`: Checks if the vote is confirmed on the blockchain.
*   `confirmVote(blockNumber)`: Marks the vote as confirmed.

### Other Models

The `server/models/` directory contains several other models, including:

*   **`ActivityLog.js`**: Likely for logging important system or user actions.
*   **`CandidateMeta.js` / `CandidateMeta_Optimized.js`**: Could be for storing additional, perhaps less frequently accessed or aggregated, data related to candidates. The `_Optimized` suffix suggests a different structure or indexing for performance.
*   **`ElectionMeta.js` / `ElectionMeta_Optimized.js`**: Similar to CandidateMeta, but for elections.
*   **`ElectionSettings.js`**: Likely stores detailed configuration options for elections, referenced by the `Election` model.
*   **`ElectionStatistics.js`**: For storing aggregated statistics related to specific elections.
*   **`ElectoralCategory.js`**: Defines broader electoral categories/positions that can be reused across multiple elections.
*   **`UserWallet.js`**: May store more detailed information about user wallets or link multiple wallets to a single user.
*   **`User_Optimized.js`**: An optimized version of the `User` model.
*   **`VotingStatistics.js` / `VotingStatistics_Optimized.js`**: For storing overall voting statistics, possibly aggregated across multiple elections or system-wide.

These additional models support the core functionality by providing ways to log activity, manage detailed settings, store metadata, and pre-compute statistics for performance.

### Relationships Summary

*   **`Admin`** creates and modifies **`Election`s**.
*   **`Election`** has many **`Candidate`s**.
*   **`Election`** can have a list of allowed **`Voter`s** (ObjectId references).
*   **`Election`** references **`ElectionSettings`** and **`ElectoralCategory`** (indirectly via `electionCategorySchema`).
*   **`Candidate`** belongs to one **`Election`** and potentially one **`ElectoralCategory`**.
*   **`Voter`** can participate in multiple **`Election`s** (tracked in `votingHistory` and `eligibleElections`).
*   **`Vote`** links an **`Election`**, a **`Voter`**, and a **`Candidate`**.
*   **`User`** (representing a logged-in entity, possibly a voter or admin) can participate in **`Election`s**. The distinction and relationship between `User` and `Voter` models would need careful management depending on the exact authentication/registration flow. If `User.address` is the primary link to a `Voter.walletAddress`, they are closely related.

This schema is designed to support a complex voting application with features for administration, election management, candidate information, voter registration, and secure vote recording.

---

## Part VI: Implementation and Deployment Guide

### 1. Introduction

This guide provides detailed instructions for setting up the development environment, compiling, deploying, and running all components of the "Vote with Blockchain" system. It covers smart contracts, ZK-SNARK circuits, the backend server, and the frontend client.

### 2. Prerequisites

Ensure you have the following software installed on your system:

*   **Node.js and npm:** (LTS version recommended, e.g., v18.x or later). npm is included with Node.js.
*   **Git:** For cloning the repository.
*   **MetaMask Browser Extension:** For interacting with the deployed smart contracts and frontend.
*   **(Optional) Yarn:** Alternative package manager to npm.
*   **(Optional) Docker:** For containerized deployment.
*   **Circom & SnarkJS:** For ZK circuit compilation and proof generation (see Section 5).

### 3. Project Setup (Root)

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

### 4. Smart Contracts

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
To run specific tests (e.g., for improved system):
npx hardhat test test/VotingSystem_Improved.test.js --config hardhat.config.enhanced.js
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
Example: npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "Constructor arg1" "Constructor arg2"
Ensure ETHERSCAN_API_KEY is in .env and hardhat.config.js is set up for verification.
```
Refer to Hardhat documentation for detailed verification instructions.

### 5. ZK-SNARK Circuits (Circom & SnarkJS)

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

### 6. Backend Server

The backend is typically a Node.js application located in the `server/` directory.

### 6.1. Environment Configuration

Create a `.env` file in the `server/` directory (e.g., by copying `server/.env.example` if it exists).
```
NODE_ENV=development
PORT=3333
MONGODB_URI="your_mongodb_connection_string"
JWT_SECRET="a_very_strong_and_long_random_secret_for_jwt"
Optional: ADMIN_SIGNER_PRIVATE_KEY="private_key_for_backend_blockchain_interactions"
Optional: RPC_URL="ethereum_node_rpc_url_for_backend"
```
*   `PORT`: Port for the backend server.
*   `MONGODB_URI`: Connection string for your MongoDB instance (local or cloud).
*   `JWT_SECRET`: Secret key for signing and verifying JSON Web Tokens.

### 6.2. Install Dependencies
Navigate to the server directory and install its specific dependencies.
```bash
cd server
npm install
or
yarn install
```

### 6.3. Database Setup

*   Ensure your MongoDB server is running and accessible.
*   The Mongoose models (`server/models/`) define the schema. When the application starts, Mongoose will attempt to create collections based on these models if they don't exist.
*   **Migrations:** For schema changes after initial deployment, a migration strategy might be needed. The project includes `server/migrations/` which suggests a migration system is in place. Consult `server/migrations/migration-manager.js` or related scripts for how to run or create migrations.

### 6.4. Running in Development
```bash
Still in server/ directory
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

### 7. Frontend Client

The frontend is a React application located in the `client/` directory.

### 7.1. Environment Configuration

Create a `.env` file in the `client/` directory. React uses environment variables prefixed with `REACT_APP_`.
```
REACT_APP_BACKEND_API_URL=http://localhost:3333/api
REACT_APP_VOTING_SYSTEM_CONTRACT_ADDRESS="address_from_smart_contract_deployment"
REACT_APP_VOTING_TOKEN_CONTRACT_ADDRESS="address_from_token_deployment_if_any"
REACT_APP_CHAIN_ID=1337 # Or the chain ID of Sepolia, Mainnet, etc.
Add other necessary configurations like RPC URLs if not solely relying on MetaMask's provider
```
*   `REACT_APP_BACKEND_API_URL`: URL of the deployed backend server.
*   `REACT_APP_VOTING_SYSTEM_CONTRACT_ADDRESS`: Address of the deployed `VotingSystem.sol` contract.
*   `REACT_APP_CHAIN_ID`: The chain ID the frontend should primarily interact with.

### 7.2. Install Dependencies
```bash
cd client
npm install
or
yarn install
```

### 7.3. Running in Development
```bash
Still in client/ directory
npm start
```
This will start the React development server (usually on `http://localhost:3000` or `http://localhost:3001` as per `client/package.json`).

### 7.4. Building for Production
```bash
Still in client/ directory
npm run build
```
This creates an optimized static build of the React app in the `client/build/` directory.

### 7.5. Deployment Strategies
*   **Static Hosting:** Netlify, Vercel, GitHub Pages, AWS S3 + CloudFront.
*   **Serving from Backend:** The backend server can be configured to serve the static files from `client/build/`.

### 8. Integration & Post-Deployment Steps

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

---

## Part VII: System Usage Guide

This section provides a guide on how to use the Blockchain Electronic Voting Web Application from the perspective of different user roles: Administrators and Voters.

### 1. For Administrators

Administrators are responsible for setting up, managing, and finalizing elections, as well as managing system users and configurations. Access to the Admin Panel is typically via a secure login (username/password) and may also be restricted by wallet address.

### 1.1 Accessing the Admin Panel

1.  **Navigate:** Open the provided URL for the Admin Panel in your web browser.
2.  **Login:**
    *   Enter your administrator `username` and `password`.
    *   If the system uses wallet-based admin access, ensure your configured MetaMask wallet is connected and on the correct network.
3.  Upon successful login, you will be directed to the Admin Dashboard.

### 1.2 Managing Elections

### 1.2.1 Creating a New Election

1.  **Navigation:** From the Admin Dashboard, find the "Elections" section and click on "Create New Election" or a similar button.
2.  **Fill Election Details:**
    *   **Title:** A clear and descriptive title for the election (e.g., "Presidential Election 2024").
    *   **Description:** Detailed information about the election's purpose.
    *   **Level:** Specify the election level (e.g., 'presidencial', 'senatorial', 'municipal').
    *   **Province/Municipality:** (If applicable) Specify the geographical scope.
    *   **Start Date & Time:** The exact date and time when voting will commence.
    *   **End Date & Time:** The exact date and time when voting will automatically close.
    *   **Registration Deadline:** (If applicable) The deadline by which voters must be registered for this election.
    *   **(Advanced Settings - may be in a separate section or tab)**
        *   **Public/Private:** Define if the election is open to all eligible voters or restricted to a specific list.
        *   **Requires Registration:** If voters need to be explicitly added to an allowed list.
        *   **Allow Abstention:** If an option to abstain should be available.
3.  **Submit:** Review all details and click "Create Election" or "Save Draft".
    *   This action typically stores the election details in the backend database.
    *   Depending on the system design, it might also trigger an initial transaction to the `VotingSystem.sol` smart contract to register the election on the blockchain. An `ElectionCreated` event is usually emitted by the contract.

### 1.2.2 Adding Candidates to an Election

1.  **Select Election:** From the list of elections, choose the one you want to manage.
2.  **Navigate to Candidates:** Find the "Manage Candidates" or "Add Candidates" section for that election.
3.  **Add Candidate Details:** For each candidate, provide:
    *   **First Name & Last Name**
    *   **Party Affiliation** (if any)
    *   **Office Sought/Category:** The specific role or list they are running for within this election.
    *   **Biography/Manifesto:** (Optional) Detailed information.
    *   **Photo URL:** (Optional) Link to a candidate photo.
4.  **Submit:** Add each candidate. This information is typically stored in the backend database and may also be linked to the election on the smart contract if the design includes on-chain candidate registration.

### 1.2.3 Managing Voters (Voter Registration)

This is a critical step, especially for elections using ZK-SNARKs for anonymity, as it involves creating the list of eligible voters whose identifiers will form the Merkle tree.

1.  **Select Election:** Choose the election for which you want to manage voters.
2.  **Navigate to Voter Management:** Look for sections like "Manage Voters," "Register Voters," or "Upload Voter List."
3.  **Register Voters:**
    *   **Method 1: Batch Upload:**
        *   Prepare a list of `voterIdentifier`s. A `voterIdentifier` is a unique, pseudo-anonymous ID for each voter (e.g., a hash of a national ID, or a randomly generated unique ID). These identifiers are what will be included in the Merkle tree.
        *   The list is typically a CSV or TXT file with one `voterIdentifier` per line.
        *   Upload the file through the Admin Panel.
        *   The backend processes this list, stores the identifiers in the database, and associates them with the election.
    *   **Method 2: Individual Registration:** (Less common for large lists) Manually enter `voterIdentifier`s.
4.  **Confirmation:** The system should confirm the number of voters successfully registered (i.e., added to the off-chain database list for this election).
5.  **Important:** This registration process must be completed *before* the Merkle root for the election is generated and set.

### 1.2.4 Generating and Setting the Merkle Root

This step is essential for ZK-SNARK based anonymous voting. The Merkle root "freezes" the list of eligible voters for the election.

1.  **Ensure Voter Registration is Complete:** Verify that all eligible `voterIdentifier`s for the election have been registered in the system (as per step X.1.2.3).
2.  **Select Election:** Choose the relevant election.
3.  **Navigate:** Find an option like "Set Merkle Root," "Finalize Voter List," or "Prepare Anonymous Voting."
4.  **Trigger Merkle Root Calculation:**
    *   Click a button like "Calculate Merkle Root."
    *   The **Backend** will:
        *   Fetch all registered `voterIdentifier`s for this election from the database.
        *   Construct a Merkle tree using these identifiers as leaves (typically hashing them first, e.g., with Poseidon).
        *   Calculate the final Merkle root.
    *   The Admin Panel may display the calculated Merkle root for verification.
5.  **Set Merkle Root on Blockchain:**
    *   Click a button like "Set Merkle Root on Contract."
    *   The **Backend** (or Admin's connected wallet if designed that way) sends a transaction to the `VotingSystem.sol` smart contract, calling the `setMerkleRoot(electionId, merkleRoot)` function.
6.  **Confirmation:** The Admin Panel should indicate that the Merkle root has been successfully set on the blockchain. This action is usually irreversible for an election.

### 1.2.5 Monitoring an Active Election

1.  **Navigate to Election Dashboard:** Select the active election.
2.  **View Statistics:** The panel may display:
    *   Total number of anonymous votes (commitments) cast so far.
    *   Other relevant metrics or logs if available.
    *   Status of the connection to the blockchain network.

### 1.2.6 Ending the Election Period

1.  **Automatic Closure:** Elections typically end automatically based on the `endDate` set in the smart contract and system.
2.  **Manual Closure (if necessary/supported):**
    *   If the election needs to be ended before its scheduled `endDate` (due to exceptional circumstances and proper authorization), there might be an admin function.
    *   This would involve calling a function like `endElection(electionId)` on the `VotingSystem.sol` contract. This changes the election state on the blockchain, preventing further votes.

### 1.2.7 Managing Vote Revelation (If Applicable)

Some ZK voting protocols might have a separate phase where votes are "revealed" to be counted, while still maintaining voter anonymity from the initial cast. The pilot documentation suggested such a phase.

1.  **Announce Revelation Period:** Inform voters when the revelation period starts and ends.
2.  **Monitor Revelation:** The Admin Panel might show statistics on how many votes have been revealed.
3.  **Close Revelation Period:** Similar to ending the voting period, this might be automatic or require manual intervention.

### 1.2.8 Finalizing Results and Tallying

1.  **Ensure Voting (and Revelation, if any) is Closed:** Verify the election period has concluded.
2.  **Trigger Finalization:**
    *   In the Admin Panel, for the specific election, find an option like "Finalize Results," "Tally Votes," or "Publish Results."
    *   This action typically calls a function like `finalizeResults(electionId)` or `tallyVotes(electionId)` on the `VotingSystem.sol` smart contract.
3.  **Smart Contract Action:**
    *   The contract performs the final tally of votes based on the commitments (and revealed data, if applicable).
    *   The results are stored on the blockchain.
    *   An event like `ElectionFinalized` or `ResultsPublished` is emitted.
4.  **View Results:** The Admin Panel should now display the final, official election results as recorded on the blockchain.
5.  **Publish (Optional):** There might be an additional step to formally publish results to a public-facing view or generate reports.

### 1.3 Other Administrative Tasks

*   **Managing System Settings:** Configuring global parameters, default permissions, etc.
*   **Managing Other Admins:** Adding, removing, or modifying permissions of other administrators (if the logged-in admin has sufficient rights).
*   **Viewing Activity Logs:** Tracking important actions performed within the system for audit purposes.
*   **Setting Verifier Contract Address:** A one-time setup (or update if Verifier changes) where the address of the deployed `Verifier.sol` (for ZK proofs) is set in the main `VotingSystem.sol` contract using a function like `setVerifier(address)`.

### 2. For Voters

Voters interact with the system to view elections, prove their eligibility anonymously, and cast their votes securely.

### 2.1 Prerequisites for Voting

1.  **Web Browser:** A modern web browser (Chrome, Firefox, Brave, Edge).
2.  **MetaMask:** The MetaMask browser extension installed and set up.
    *   **Wallet Creation/Import:** You need an Ethereum wallet in MetaMask. If you don't have one, create one and **securely back up your seed phrase (recovery phrase)**.
    *   **Network Configuration:** Ensure MetaMask is connected to the correct Ethereum network specified for the election (e.g., Sepolia testnet, local Hardhat network, or mainnet).
    *   **Account Funding (for Gas Fees):** Your MetaMask account will need a small amount of the network's native currency (e.g., ETH on Ethereum, SepoliaETH on Sepolia) to pay for gas fees when sending transactions (like casting a vote). For testnets, you can get funds from a "faucet."
3.  **Eligibility:** You must be registered for the specific election by an administrator (i.e., your `voterIdentifier` must be part of the Merkle tree for that election).

### 2.2 Accessing the Voting Application (PWA)

1.  **Navigate:** Open the URL of the voter-facing web application in your browser.
2.  **Connect Wallet:**
    *   Click the "Connect Wallet" or "Login with MetaMask" button.
    *   MetaMask will pop up and ask you to choose an account and approve the connection to the application. Select your desired account and approve.
    *   The application should now display your connected wallet address.

### 2.3 Casting a Vote Anonymously

This process leverages ZK-SNARKs to allow you to vote without revealing your identity or specific choice directly at the time of casting.

1.  **Select Election:**
    *   From the list of available elections, choose the one you wish to participate in.
    *   The application will display details about the selected election, including the candidates.
2.  **Choose Candidate:**
    *   Review the list of candidates for the election.
    *   Select your preferred candidate.
3.  **Initiate Anonymous Vote:**
    *   Click the "Cast Vote Anonymously," "Submit Vote," or similar button.
4.  **ZK Proof Generation (Client-Side):**
    *   The application will now prepare your vote for anonymous submission. This happens in your browser.
    *   You may see a message like "Preparing your secure vote..." or "Generating proof..."
    *   **What happens in the background:**
        *   The application needs your `voterSecret` and `voterIdentifier`. The `voterSecret` is a private piece of data only you should know or your client can derive. The `voterIdentifier` is your registered ID.
        *   It also needs the Merkle path that proves your `voterIdentifier` is part of the election's official Merkle root. The frontend usually fetches this path from the backend by providing your `voterIdentifier`.
        *   It takes your chosen `candidateId` and a freshly generated random `voteNonce`.
        *   Using these inputs, the client-side SnarkJS library (with the WASM prover for `vote.circom`) calculates:
            *   `leaf`: Hash of your `voterIdentifier`.
            *   `nullifierHash`: A unique value `Hash(voterSecret, electionId)` to prevent you from voting twice in this election.
            *   `voteCommitment`: A commitment to your choice `Hash(candidateId, voteNonce)`.
            *   **ZK Proof:** A cryptographic proof that all these calculations are correct, that your leaf is in the Merkle tree, and that you know the private inputs, *without revealing the private inputs themselves*.
5.  **Submit Transaction via MetaMask:**
    *   Once the proof is generated, MetaMask will pop up asking you to confirm a transaction.
    *   This transaction calls the `anonymousVote(...)` function on the `VotingSystem.sol` smart contract. The parameters will include the generated ZK proof and the public signals (merkleRoot, nullifierHash, voteCommitment).
    *   Review the transaction details (especially the gas fee) and click "Confirm."
6.  **Confirmation:**
    *   After the transaction is mined on the blockchain, the application will display a confirmation message (e.g., "Vote cast successfully!" or "Anonymous vote submitted!").
    *   **Important for Reveal (if applicable):** If the system uses a separate reveal phase (as described in the pilot docs), the application will likely save your `candidateId` and `voteNonce` (or the `voteCommitment`) in your browser's `localStorage`. This is needed for you to reveal your vote later. Ensure you use the same browser and profile for the reveal phase.

### 2.4 Revealing Your Vote (If Applicable)

This step is specific to voting protocols that require a separate action to make the vote count towards a candidate after the anonymous commitment.

1.  **Wait for Revelation Period:** The election administrators will announce when the vote revelation period begins (usually after the voting period has ended).
2.  **Access the Application:** Open the voting application and connect the same MetaMask wallet you used to cast the anonymous vote.
3.  **Navigate to Reveal Section:**
    *   Select the election you voted in.
    *   Look for an option like "Reveal My Vote" or "Complete Voting."
4.  **Confirm Details:**
    *   The application should retrieve the `candidateId` and `voteNonce` (or `voteCommitment`) that it saved locally when you first voted.
    *   It will likely display the candidate you chose (based on the saved data) for you to confirm.
5.  **Submit Reveal Transaction:**
    *   Click "Reveal Vote" or "Confirm Reveal."
    *   MetaMask may pop up again to ask you to sign a message or send another transaction. This transaction calls a function like `revealVote(...)` on the smart contract, providing your `candidateId`, `voteNonce`, and the original `voteCommitment`.
    *   The smart contract verifies that the provided `candidateId` and `voteNonce` hash to the stored `voteCommitment`. If valid, the vote is tallied for that candidate.
6.  **Confirmation:** The application will notify you that your vote has been successfully revealed and will be counted. The locally stored data for this vote may then be cleared.

### 2.5 Checking Election Results

Once the election is finalized and results are published by the administrators, you should be able to view them in the voting application. This typically shows the vote counts for each candidate.

### 2.6 Troubleshooting for Voters

*   **MetaMask Connection Issues:**
    *   Ensure MetaMask is unlocked and connected to the correct network.
    *   Try disconnecting and reconnecting from the application's "Connect Wallet" button.
    *   Check browser permissions for MetaMask.
*   **Transaction Failures:**
    *   **Insufficient Gas:** Make sure you have enough of the network's native currency (ETH, SepoliaETH) in your account to cover transaction fees.
    *   **Network Congestion:** The network might be busy. You might need to wait or try with a higher gas fee (if MetaMask allows adjustment).
    *   **Contract Errors:** The transaction might be reverted by the smart contract (e.g., election not active, voter not eligible, nullifier already used, proof invalid). The application or MetaMask might show an error message.
*   **ZK Proof Generation Fails:**
    *   This is less common if the application is well-tested but could be due to browser issues or unexpected data. Try refreshing the page or restarting the browser.
*   **Data for Reveal Not Found:** If you cleared your browser's `localStorage` or are using a different browser/profile, the data needed for the reveal phase might be missing.

Always follow instructions provided within the application and by election administrators. For critical issues, contact the support channels provided for the election.

---

## Part VIII: Code Repositories

This section lists the locations of the code repositories for the project components.

### 1. Backend Repositories
*   (Link to Backend Repository/Repositories - To be provided by the project team)

### 2. Frontend Repositories
*   (Link to Frontend Repository/Repositories - To be provided by the project team)

### 3. Smart Contracts Repository
*   (Usually part of the Backend or a dedicated repository - To be provided by the project team)

---

## Part IX: Database Script

The database schema is managed by Mongoose models defined within the backend application (see Part V: Database Schema). Mongoose automatically handles the creation and management of collections based on these models.

For specific database setup scripts, migrations, or seeding scripts, please refer to:
*   The `server/migrations/` directory within the backend codebase.
*   Any specific scripts provided by the development team for initializing or migrating database content (e.g., `server/scripts/`).

---
