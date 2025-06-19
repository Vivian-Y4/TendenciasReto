# Database Schema (MongoDB)

This document outlines the MongoDB database schema used by the backend server. The schema is defined using Mongoose models.

## Core Models

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

## Other Models

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

## Relationships Summary

*   **`Admin`** creates and modifies **`Election`s**.
*   **`Election`** has many **`Candidate`s**.
*   **`Election`** can have a list of allowed **`Voter`s** (ObjectId references).
*   **`Election`** references **`ElectionSettings`** and **`ElectoralCategory`** (indirectly via `electionCategorySchema`).
*   **`Candidate`** belongs to one **`Election`** and potentially one **`ElectoralCategory`**.
*   **`Voter`** can participate in multiple **`Election`s** (tracked in `votingHistory` and `eligibleElections`).
*   **`Vote`** links an **`Election`**, a **`Voter`**, and a **`Candidate`**.
*   **`User`** (representing a logged-in entity, possibly a voter or admin) can participate in **`Election`s**. The distinction and relationship between `User` and `Voter` models would need careful management depending on the exact authentication/registration flow. If `User.address` is the primary link to a `Voter.walletAddress`, they are closely related.

This schema is designed to support a complex voting application with features for administration, election management, candidate information, voter registration, and secure vote recording.
