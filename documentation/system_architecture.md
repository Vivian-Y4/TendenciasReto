# System Architecture and Integration Process

## 1. Introduction

The "Vote with Blockchain" system is designed as a multi-component application that leverages blockchain for transparency and security, zero-knowledge proofs for voter anonymity, a backend for business logic and orchestration, and a frontend for user interaction. This document describes the architecture of the system and how these components integrate to provide a comprehensive e-voting solution.

## 2. Core Components

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

## 3. High-Level Architecture

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

## 4. Key Interaction Flows

### 4.1. Admin: Election Setup

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

### 4.2. Admin: Voter Registration & Merkle Tree Setup

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

### 4.3. Voter: Anonymous Voting Process

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

## 5. Data Flow Summary

*   **Election Definitions & Candidates:** Admin (Frontend) -> Backend (DB) -> Blockchain (Smart Contract).
*   **Voter Identifiers (Pre-registration):** Admin (Frontend) -> Backend (DB).
*   **Merkle Root:** Calculated by Backend (from DB data) -> Blockchain (Smart Contract).
*   **Voter's Private Inputs (secret, nonce):** Reside only on the voter's client (Frontend).
*   **ZK Proof:** Generated on Frontend -> Submitted to Blockchain (Smart Contract).
*   **Vote Commitments & Nullifiers:** Generated on Frontend (as public signals of ZK proof) -> Stored on Blockchain (Smart Contract).
*   **Aggregated Results:** Calculated by Smart Contract (potentially with Backend assistance for off-chain aggregation if needed) -> Displayed on Frontend (via Backend or direct contract read).

## 6. Integration Points & Communication Protocols

*   **Frontend to Backend:** HTTPS/RESTful APIs (using JSON).
*   **Frontend to Blockchain:** Web3 provider (MetaMask) using JSON-RPC to an Ethereum node.
*   **Backend to Blockchain:** Ethers.js using JSON-RPC to an Ethereum node (for admin functions or event listening).
*   **Backend to Database:** MongoDB driver connection.
*   **Smart Contract to Smart Contract:** Direct function calls within the EVM (e.g., `VotingSystem` calling `Verifier`).

This architecture aims for a separation of concerns, leveraging each component for its strengths while ensuring the integrity and anonymity of the voting process.
