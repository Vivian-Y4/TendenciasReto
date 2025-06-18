import { AppError } from './serviceUtils'; // Assuming a utility for error handling

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Fetches the Merkle proof for the current authenticated voter for a given election.
 * @param {string} electionId - The ID of the election.
 * @param {string} token - The JWT token for authentication.
 * @returns {Promise<object>} An object containing the Merkle proof and related data.
 *                            Example: { merkleProof: string[], merkleRoot: string, voterIdentifier: string }
 * @throws {AppError} If the API call fails or returns an error.
 */
export const fetchMerkleProofForVoter = async (electionId, token) => {
  if (!electionId) {
    throw new AppError("Election ID is required to fetch Merkle proof.", 400);
  }
  if (!token) {
    throw new AppError("Authentication token is required.", 401);
  }

  console.log(`[merkleService] Fetching Merkle proof for election: ${electionId}`);

  const response = await fetch(`${API_URL}/api/voters/${electionId}/merkle-proof`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMessage = data.message || `Failed to fetch Merkle proof. Status: ${response.status}`;
    console.error('[merkleService] Error fetching Merkle proof:', errorMessage, data);
    throw new AppError(errorMessage, response.status, data.errorDetails);
  }

  console.log('[merkleService] Merkle proof fetched successfully:', data);
  // Expected data structure: { success: true, electionId, voterIdentifier, merkleProof, merkleRoot }
  return data;
};
