import { ethers } from 'ethers'; // For randomBytes and BigNumber utilities
/* global BigInt */
import { poseidon2 as poseidonFn } from 'poseidon-lite'; // Poseidon hashing for 2 inputs

// Wrapper to mimic original API (accepts array of 2 BigInts)
const poseidon = (inputs) => {
  if (!Array.isArray(inputs) || inputs.length !== 2) {
    throw new Error(`poseidon expects array with 2 elements, got ${inputs}`);
  }
  return poseidonFn(inputs[0], inputs[1]);
};

/**
 * Helper function to convert a hex string (bytes32, typically '0x' prefixed) to a BigInt.
 */
function hexToBigInt(hexString) {
  if (!ethers.utils.isHexString(hexString)) {
    throw new Error(`Invalid hex string for BigInt conversion: ${hexString}`);
  }
  return BigInt(hexString);
}

/**
 * Helper function to convert a value to BigInt if it's not already one.
 * Handles numbers, strings representing numbers, and hex strings.
 */
function toBigInt(value) {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'string' && ethers.utils.isHexString(value)) return BigInt(value);
    if (typeof value === 'string' || typeof value === 'number') return BigInt(value);
    throw new Error(`Cannot convert value to BigInt: ${value}`);
}


/**
 * Calculates the nullifier hash using Poseidon.
 * Output should match the Circom circuit: Poseidon(voterSecret, electionId).
 * @param {string} voterSecretHex - The voter's secret (bytes32 hex string, e.g., from ethers.utils.id).
 * @param {string | number} electionId - The ID of the election.
 * @returns {string} The nullifier hash as a '0x' prefixed bytes32 hex string.
 */
export const calculateNullifierHash = (voterSecretHex, electionId) => {
  if (!voterSecretHex) throw new Error("Voter secret (hex) is required for nullifier hash.");

  const inputs = [
    hexToBigInt(voterSecretHex), // voterSecret is typically a hash itself or a large random number
    toBigInt(electionId)
  ];
  const resultBigInt = poseidon(inputs);
  return ethers.utils.hexZeroPad(ethers.utils.hexlify(resultBigInt), 32);
};

/**
 * Calculates the vote commitment using Poseidon.
 * Output should match the Circom circuit: Poseidon(candidateId, voteNonce).
 * @param {string | number} candidateId - The ID of the chosen candidate.
 * @param {string} voteNonceHex - A random nonce (bytes32 hex string).
 * @returns {string} The vote commitment as a '0x' prefixed bytes32 hex string.
 */
export const calculateVoteCommitment = (candidateId, voteNonceHex) => {
  if (candidateId === null || candidateId === undefined) throw new Error("Candidate ID is required for vote commitment.");
  if (!voteNonceHex) throw new Error("Vote nonce (hex) is required for vote commitment.");

  const inputs = [
    toBigInt(candidateId),
    hexToBigInt(voteNonceHex)
  ];
  const resultBigInt = poseidon(inputs);
  return ethers.utils.hexZeroPad(ethers.utils.hexlify(resultBigInt), 32);
};

/**
 * Generates a random nonce as a '0x' prefixed bytes32 hex string.
 */
export const generateVoteNonce = () => {
  return ethers.utils.hexlify(ethers.utils.randomBytes(32));
};


/**
 * Mocks the client-side ZK proof generation.
 * In a real application, this would involve:
 * 1. Fetching compiled circuit (.wasm) and proving key (.zkey).
 * 2. Using snarkjs.fullProve() with actual private and public inputs.
 *
 * @param {object} privateInputs - Object containing private inputs for the circuit.
 *   Expected: { voterSecret, voterIdentifier, merklePath, candidateId, voteNonce }
 * @param {object} publicInputsOnContract - Object containing public inputs expected by the contract's anonymousVote function.
 *   Expected: { merkleRoot, nullifierHash, voteCommitment }
 * @returns {Promise<object>} A promise that resolves to an object containing the ZK proof and public signals.
 *   Format: { proof: { pi_a, pi_b, pi_c }, publicSignals: [merkleRoot, nullifierHash, voteCommitment] } (snarkjs format)
 *   The `proof` object contains pi_a, pi_b, pi_c which are arrays of strings.
 *   The `publicSignals` array contains strings for each public input signal from the circuit.
 */
export const generateActualZkProof = async (privateInputsForCircuit, publicInputsForCircuit) => {
  console.log("[zkService] Generating actual ZK proof with inputs:", { privateInputsForCircuit, publicInputsForCircuit });

  // Input object for snarkjs.fullProve must match the signal names in vote.circom's main component.
  // Private inputs: voterSecret, voterIdentifier, merklePath, merklePathIndices, candidateId, voteNonce, electionId
  // Public inputs for circuit: merkleRoot, nullifierHash, voteCommitment

  // All inputs to snarkjs.fullProve must be decimal strings.
  const formatToDecimalString = (value) => {
    if (typeof value === 'string' && value.startsWith('0x')) {
      return BigInt(value).toString();
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return BigInt(value).toString();
    }
    // If it's already a decimal string that can be a BigInt, BigInt() will handle it.
    // Otherwise, this might indicate an issue if non-numeric strings are passed for numeric inputs.
    try {
      return BigInt(value).toString();
    } catch (e) {
      console.error(`Failed to convert value to BigInt string: ${value}`, e);
      throw new Error(`Input value ${value} cannot be converted to a decimal string for snarkjs.`);
    }
  };

  const circuitInputs = {
    // Private inputs
    voterSecret: formatToDecimalString(privateInputsForCircuit.voterSecret),
    voterIdentifier: formatToDecimalString(privateInputsForCircuit.voterIdentifier),
    merklePath: privateInputsForCircuit.merklePath.map(p => formatToDecimalString(p)),
    merklePathIndices: privateInputsForCircuit.merklePathIndices.map(p => p.toString()), // These are 0 or 1
    candidateId: privateInputsForCircuit.candidateId.toString(),
    voteNonce: formatToDecimalString(privateInputsForCircuit.voteNonce),
    electionId: privateInputsForCircuit.electionId.toString(),

    // Public inputs (signals that the circuit uses and outputs)
    // These are also provided as inputs to fullProve.
    merkleRoot: formatToDecimalString(publicInputsForCircuit.merkleRoot),
    nullifierHash: formatToDecimalString(publicInputsForCircuit.nullifierHash),
    voteCommitment: formatToDecimalString(publicInputsForCircuit.voteCommitment),
  };

  console.log("[zkService] Circuit inputs formatted for snarkjs (all decimal strings):", circuitInputs);

  // Dynamically import snarkjs to potentially help with environments where it might not be available at load time
  // or to reduce initial bundle size if it's large.
  // For this environment, direct import is fine.
  const snarkjs = window.snarkjs; // Assuming snarkjs is loaded globally, e.g., via a script tag in index.html

  if (!snarkjs) {
    console.error("snarkjs not found. Ensure it is loaded.");
    throw new Error("snarkjs library is not available.");
  }

  try {
    // Paths to where WASM and ZKEY will be served from in the client's public folder
    const wasmPath = "/zk/vote.wasm";
    const zkeyPath = "/zk/vote_final.zkey";

    console.log(`[zkService] Calling snarkjs.groth16.fullProve with WASM: ${wasmPath}, ZKEY: ${zkeyPath}`);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);

    console.log("[zkService] Proof generated by snarkjs:", proof);
    console.log("[zkService] Public signals from snarkjs:", publicSignals);

    // Format the proof structure for the smart contract (_pA, _pB, _pC)
    // snarkjs proof object: { pi_a: [str, str, str], pi_b: [[str,str],[str,str],[str,str]], pi_c: [str,str,str], ... }
    // The third element of pi_a, pi_b, pi_c is usually '1' and can be omitted for some contracts.
    // The Verifier.sol generated by snarkjs expects specific formats.
    // Typically, pi_a and pi_c are G1 points (2 elements), pi_b is a G2 point (2x2 elements).
    // We need to remove the third element if present for older verifiers or ensure it's there if new ones need it.
    // The generated Verifier.sol by recent snarkjs takes [2] for pA,pC and [2][2] for pB.

    const formattedProof = {
        _pA: [proof.pi_a[0], proof.pi_a[1]],
        _pB: [[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]],
        _pC: [proof.pi_c[0], proof.pi_c[1]],
    };

    // The publicSignals from snarkjs are the circuit's public output signals.
    // Order: [merkleRoot, nullifierHash, voteCommitment] (based on circom main component `public [...]` definition)
    // These are returned as decimal strings by snarkjs.
    // The smart contract's anonymousVote function expects these as bytes32 hex strings.

    // It's crucial that these publicSignals derived from the proof match the
    // `publicInputsForCircuit` that were calculated client-side and fed into the proof generation.
    // This confirms the proof corresponds to the intended public state.
    const [proofMerkleRoot, proofNullifierHash, proofVoteCommitment] = publicSignals.map(ps => ethers.utils.hexZeroPad(ethers.utils.hexlify(BigInt(ps)), 32));

    if (proofMerkleRoot !== publicInputsForCircuit.merkleRoot ||
        proofNullifierHash !== publicInputsForCircuit.nullifierHash ||
        proofVoteCommitment !== publicInputsForCircuit.voteCommitment) {
      console.error("Public signals from proof do not match client-calculated public inputs:", {
        proofSignals: { proofMerkleRoot, proofNullifierHash, proofVoteCommitment },
        clientCalculated: publicInputsForCircuit
      });
      throw new Error("ZK Proof public signals mismatch with client-side calculations. Proof is not for the intended public state.");
    }

    // Return the formatted proof and the *original, verified* public inputs (as bytes32 hex) for the contract call.
    return {
      proof: formattedProof,
      // Return the client-calculated & proof-verified public inputs in the correct hex format for the contract.
      verifiedPublicInputs: {
        merkleRoot: publicInputsForCircuit.merkleRoot,
        nullifierHash: publicInputsForCircuit.nullifierHash,
        voteCommitment: publicInputsForCircuit.voteCommitment
      }
    };

  } catch (error) {
    console.error("[zkService] Error during snarkjs.groth16.fullProve:", error);
    throw new Error("Error generating ZK proof: " + error.message);
  }
};
