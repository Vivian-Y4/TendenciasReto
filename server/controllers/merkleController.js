const RegisteredVoter = require('../models/RegisteredVoter'); // Assuming model path
const Election = require('../models/Election'); // To check election status/existence
const { buildMerkleTree, getMerkleProofWithIndices, getMerkleRoot } = require('../utils/merkleTreeUtils'); // Updated import
const { AppError } = require('../middlewares/errorHandler');

/**
 * Generates and returns a Merkle proof for the authenticated voter for a given election.
 */
exports.getMerkleProofForVoter = async (req, res, next) => {
  const { electionId } = req.params;
  const userVoterIdentifier = req.user?.voterIdentifier; // Assuming JWT middleware populates req.user with voterIdentifier

  if (!userVoterIdentifier) {
    return next(new AppError('Voter identifier not found for authenticated user.', 403));
  }

  if (!electionId) {
    return next(new AppError('Election ID is required.', 400));
  }

  try {
    // 1. Verify election exists and is in a state where proofs can be generated (e.g., Merkle root set)
    const election = await Election.findById(electionId); // Assuming electionId is MongoDB ObjectId
    // If electionId is the contract's uint id, you'd query by that: Election.findOne({ contractElectionId: electionId })
    if (!election) {
      return next(new AppError('Election not found.', 404));
    }
    // Add any relevant status checks for the election, e.g., if Merkle root must be set
    if (!election.merkleRoot || election.merkleRoot === '0x' || election.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        // This check depends on how an unset merkleRoot is stored.
        // The contract initializes to bytes32(0). The backend might store it as null, empty string, or '0x0'.
        // For now, assuming if it's not a valid 32-byte hex string, it's not set.
        // A more robust check: ensure it matches the contract's merkleRoot for this electionId.
      return next(new AppError('Merkle root not yet established for this election. Proof cannot be generated.', 400));
    }


    // 2. Fetch all registered voter identifiers for the election from the database
    const registeredVoters = await RegisteredVoter.find({ electionId: electionId.toString() }).select('identifier').lean();
    if (!registeredVoters || registeredVoters.length === 0) {
      return next(new AppError('No registered voters found for this election to build Merkle tree.', 404));
    }
    const voterIdentifiers = registeredVoters.map(v => v.identifier);

    // 3. Check if the current user's voterIdentifier is in the list for this election
    if (!voterIdentifiers.includes(userVoterIdentifier)) {
      return next(new AppError('Authenticated user is not registered for this election or identifier mismatch.', 403));
    }

    // 4. Build the Merkle tree
    const tree = buildMerkleTree(voterIdentifiers);

    // 5. Get the Merkle root from the tree and verify it matches the stored/contract root (optional, but good for consistency)
    // const calculatedMerkleRoot = '0x' + tree.getRoot().toString('hex');
    // if (calculatedMerkleRoot !== election.merkleRoot) {
    //   console.error(`[MerkleController] CRITICAL: Calculated Merkle root ${calculatedMerkleRoot} does not match stored/contract root ${election.merkleRoot} for election ${electionId}`);
    //   return next(new AppError('Merkle root mismatch. Data integrity issue.', 500));
    // }


    // 6. Generate the proof (including path indices) for the user's voterIdentifier
    const proofObject = getMerkleProofWithIndices(tree, userVoterIdentifier);

    if (!proofObject || !proofObject.merklePath || !proofObject.merklePathIndices) {
      // This case should ideally be caught by the earlier check "voterIdentifiers.includes(userVoterIdentifier)"
      // or if getMerkleProofWithIndices returns null.
      console.error(`[MerkleController] Could not generate proof with indices for known registered voter ${userVoterIdentifier} in election ${electionId}. This might indicate an issue with tree construction or leaf encoding.`);
      return next(new AppError('Failed to generate Merkle proof with indices. The identifier might not be in the tree despite being registered.', 500));
    }

    res.json({
      success: true,
      electionId,
      voterIdentifier: userVoterIdentifier,
      merklePath: proofObject.merklePath,
      merklePathIndices: proofObject.merklePathIndices,
      // Return the merkle root the proof was generated against, for client-side verification.
      // This should match election.merkleRoot if everything is consistent.
      merkleRoot: getMerkleRoot(tree)
    });

  } catch (error) {
    console.error('[MerkleController] Error generating Merkle proof:', error);
    return next(new AppError('Server error while generating Merkle proof.', 500));
  }
};
