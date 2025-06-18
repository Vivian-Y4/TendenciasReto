const express = require('express');
const router = express.Router();
const jceVoterRegistryController = require('../controllers/jceVoterRegistryController');

// Placeholder for JCE authorization middleware
// This middleware should verify that the request comes from an authorized JCE system/personnel
const jceAuthMiddleware = (req, res, next) => {
  // TODO: Implement actual authentication/authorization logic for JCE personnel
  // For example, check for a valid API key, JWT token, or IP whitelist
  const apiKey = req.headers['x-jce-api-key'];
  if (apiKey === process.env.JCE_API_KEY) { // Example: Check against an API key in .env
    console.log("[jceAuthMiddleware] JCE request authorized.");
    next();
  } else {
    console.warn("[jceAuthMiddleware] Unauthorized JCE request attempt.");
    // It's important to also log the source IP or other identifying info of the request here
    // console.log("Attempt from IP:", req.ip);
    res.status(401).json({ message: 'Unauthorized: Missing or invalid JCE API Key' });
  }
};

// --- Voter Registration Routes ---

/**
 * @route   POST /api/jce-registry/register-voter
 * @desc    Register a single voter (or could be adapted for batch) for a specific election.
 *          This endpoint is intended to be called by authorized JCE personnel/systems.
 * @access  Protected (JCE Authorized)
 * @body    {
 *            "electionId": "string (or number)",
 *            "voterIdentifier": "bytes32 hex string (e.g., 0x...)",
 *            "cedula": "string (e.g., 001-0000001-1, optional, for JCE data lookup)"
 *          }
 *          Alternatively, for batch:
 * @body    {
 *            "electionId": "string (or number)",
 *            "voters": [ { "voterIdentifier": "bytes32", "cedula": "string" }, ... ]
 *          }
 */
router.post(
  '/register-voter', // Path can remain singular, but controller handles batch
  jceAuthMiddleware, // Protect this route
  jceVoterRegistryController.registerVotersBatch // Updated to new controller function name
);

// Example of how to use the mock JCE data fetch directly via an API (for testing/dev only)
// THIS SHOULD NOT BE IN PRODUCTION or be heavily protected.
router.get('/fetch-jce-data/:cedula', jceAuthMiddleware, async (req, res) => {
  try {
    const cedula = req.params.cedula;
    const data = await jceVoterRegistryController.fetchVoterDataFromJCE(cedula);
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ message: 'Data not found for Cédula.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
});

module.exports = router;
