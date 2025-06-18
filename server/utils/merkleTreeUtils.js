const { MerkleTree } = require('merkletreejs');
const poseidon = require('poseidon-lite'); // Using poseidon-lite

/**
 * Helper function to convert a hex string (bytes32, typically '0x' prefixed) to a BigInt.
 */
function hexToBigInt(hexString) {
  return BigInt(hexString);
}

/**
 * Helper function to convert a BigInt to a Buffer. Output from Poseidon is BigInt.
 * Leaves and nodes in MerkleTree are Buffers.
 */
function bigIntToBuffer(val) {
  let hex = val.toString(16);
  // Ensure hex string is even length for Buffer.from(hex, 'hex')
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  // Ensure it's 32 bytes for consistency if these are field elements / hashes
  // This padding is crucial for cryptographic consistency.
  return Buffer.from(hex.padStart(64, '0'), 'hex');
}

/**
 * Hashes a single voterIdentifier (bytes32 hex string) using Poseidon to create a leaf.
 * This must match the leaf hashing in the Circom circuit (Poseidon(1)).
 * @param {string} voterIdentifier - The voter identifier (bytes32 hex string, e.g., "0x...").
 * @returns {Buffer} - The Poseidon hash as a Buffer.
 */
function hashLeafWithPoseidon(voterIdentifier) {
  const identifierAsBigInt = hexToBigInt(voterIdentifier);
  const hashedBigInt = poseidon([identifierAsBigInt]); // Poseidon with 1 input
  return bigIntToBuffer(hashedBigInt);
}

/**
 * Custom hash function for merkletreejs to combine two nodes (Buffers) using Poseidon.
 * This must match the internal node hashing in the Circom circuit (Poseidon(2)).
 * @param {Buffer} left - The left child node Buffer (already a Poseidon hash).
 * @param {Buffer} right - The right child node Buffer (already a Poseidon hash).
 * @returns {Buffer} - The Poseidon hash of the combined nodes as a Buffer.
 */
function pairHashWithPoseidon(left, right) {
  const leftBigInt = hexToBigInt('0x' + left.toString('hex'));
  const rightBigInt = hexToBigInt('0x' + right.toString('hex'));
  // The order of inputs to Poseidon matters if not sorted by MerkleTree library.
  // MerkleTree with sortPairs: true handles sorting before passing to this hash function.
  const combinedHashBigInt = poseidon([leftBigInt, rightBigInt]); // Poseidon with 2 inputs
  return bigIntToBuffer(combinedHashBigInt);
}

/**
 * Builds a Merkle tree from a list of voter identifiers using Poseidon hashing.
 * @param {string[]} voterIdentifiers - Array of voter identifiers (bytes32 hex strings).
 * @returns {MerkleTree} - The constructed Merkle tree.
 */
function buildMerkleTree(voterIdentifiers) {
  if (!voterIdentifiers || voterIdentifiers.length === 0) {
    throw new Error("[merkleTreeUtils] Cannot build Merkle tree: voterIdentifiers list is empty.");
  }

  // 1. Pre-hash each voterIdentifier to create the leaves for the tree.
  const leaves = voterIdentifiers.map(id => hashLeafWithPoseidon(id));

  // 2. Build the tree using these pre-hashed leaves and the custom Poseidon pair hasher.
  const tree = new MerkleTree(leaves, pairHashWithPoseidon, { sortPairs: true });
  return tree;
}

/**
 * Gets the Merkle root from a tree.
 * @param {MerkleTree} tree - The Merkle tree.
 * @returns {string} - The Merkle root as a hex string (prefixed with '0x').
 */
function getMerkleRoot(tree) {
  return '0x' + tree.getRoot().toString('hex');
}

/**
 * Gets the Merkle proof (sibling hashes) and path indices for a specific voter identifier.
 * Path indices are crucial for Circom's MerkleTreeChecker.
 * @param {MerkleTree} tree - The Merkle tree.
 * @param {string} voterIdentifier - The voter identifier (bytes32 hex string) to get proof for.
 * @returns {{merklePath: string[], merklePathIndices: number[]} | null} - Object with proof path and indices, or null if leaf not found.
 */
function getMerkleProofWithIndices(tree, voterIdentifier) {
  const targetLeaf = hashLeafWithPoseidon(voterIdentifier); // Hash the identifier to find its leaf form

  const rawProof = tree.getProof(targetLeaf); // Returns array of { position: 'left'|'right', data: Buffer }

  if (!rawProof || (rawProof.length === 0 && !tree.getRoot().equals(targetLeaf))) {
    console.warn(`[merkleTreeUtils] Leaf for ${voterIdentifier} (hashed: ${targetLeaf.toString('hex')}) not found in tree or proof is empty for non-root leaf. Proof cannot be generated reliably.`);
    return null; // Leaf not found or tree structure issue
  }

  const merklePath = rawProof.map(pElement => '0x' + pElement.data.toString('hex'));

  // Determine merklePathIndices for Circom's MerkleTreeChecker:
  // path_index[i] = 0 if the path element is a left child (sibling in proof is on the right)
  // path_index[i] = 1 if the path element is a right child (sibling in proof is on the left)
  const merklePathIndices = rawProof.map(pElement => {
    if (pElement.position === 'right') { // Sibling is on the right, so current path element was a left child
      return 0;
    } else { // Sibling is on the left, so current path element was a right child
      return 1;
    }
  });

  return { merklePath, merklePathIndices };
}

/**
 * Verifies a Merkle proof. (Helper for testing).
 * @param {MerkleTree} tree - The Merkle tree (must be the same instance or reconstructed with same params/leaves).
 * @param {string[]} proofHex - The Merkle proof (array of hex strings, '0x' prefixed sibling hashes).
 * @param {string} targetIdentifierHex - The voter identifier (bytes32 hex string) that was hashed to become the target leaf.
 * @param {string} rootHex - The Merkle root (hex string, '0x' prefixed).
 * @returns {boolean} - True if the proof is valid, false otherwise.
 */
function verifyMerkleProof(tree, proofObject, targetIdentifierHex, rootHex) {
  const targetLeafBuffer = hashLeafWithPoseidon(targetIdentifierHex);
  // merkletreejs verify function expects only the sibling hashes (data part of the proof)
  const proofSiblingHashesHex = proofObject.merklePath;

  const proofSiblingBuffers = proofSiblingHashesHex.map(p => Buffer.from(p.substring(2), 'hex'));
  const rootBuffer = Buffer.from(rootHex.substring(2), 'hex');

  // The MerkleTree.verify method uses the same hash function passed to its constructor (pairHashWithPoseidon)
  // It internally reconstructs the path using the provided leaf, proof (siblings), and root.
  // It does not need pathIndices for verification with merkletreejs's .verify()
  return tree.verify(proofSiblingBuffers, targetLeafBuffer, rootBuffer);
}

module.exports = {
  buildMerkleTree,
  getMerkleRoot,
  getMerkleProofWithIndices, // Updated function
  hashLeafWithPoseidon,
  verifyMerkleProof,
};
