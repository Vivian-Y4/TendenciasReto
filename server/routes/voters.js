const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const { authenticate } = require('../middlewares/auth'); // Import authenticate

// Setup connection to Ethereum provider
const setupProvider = () => {
  // In production, you'd connect to a real network or node
  // For local testing, connect to hardhat's local node
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  
  // Get contract ABI and address
  const contractABIPath = path.join(__dirname, '../../artifacts/contracts/VotingSystem.sol/VotingSystem.json');
  const contractABI = JSON.parse(fs.readFileSync(contractABIPath)).abi;
  
  // Contract address should be stored in .env or config
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error('Contract address not found');
  }
  
  return { provider, contractABI, contractAddress };
};

// @route   POST api/voters/register
// @desc    Register a voter for an election
// @access  Private (Admin only)
router.post(
  '/register',
  [
    authenticate, // Use authenticate middleware
    body('electionId').notEmpty().withMessage('Election ID is required'),
    body('voterAddress').notEmpty().withMessage('Voter wallet address is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { provider, contractABI, contractAddress } = setupProvider();
      
      // For admin operations, we need a signer with private key
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      if (!privateKey) {
        return res.status(500).json({
          success: false,
          message: 'Admin credentials not configured'
        });
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(contractAddress, contractABI, wallet);
      
      const { electionId, voterAddress } = req.body;
      
      // Generate a voter hash for privacy
      // This is a simplified approach - in a real system, you'd use a more sophisticated privacy-preserving technique
      const voterHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256', 'string'],
          [voterAddress, electionId, process.env.VOTER_HASH_SALT || 'voting-platform-salt']
        )
      );
      
      // Register the voter
      const tx = await contract.registerVoter(electionId, voterAddress, voterHash);
      await tx.wait();
      
      res.status(201).json({
        success: true,
        message: 'Voter registered successfully'
      });
    } catch (error) {
      console.error('Error registering voter:', error);
      res.status(500).json({
        success: false,
        message: 'Server error registering voter'
      });
    }
  }
);

// @route   POST api/voters/vote
// @desc    Cast a vote in an election
// @access  Private (Authenticated user)
router.post(
  '/vote',
  [
    authenticate, // Use authenticate middleware
    body('electionId').notEmpty().withMessage('Election ID is required'),
    body('candidateId').notEmpty().withMessage('Candidate ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { provider, contractABI, contractAddress } = setupProvider();
      
      // Get the voter's address from the JWT token
      const voterAddress = req.user.address;
      
      // We need the voter to sign the transaction
      // In a real application, this would be done client-side with MetaMask
      // For this API endpoint, we'd receive a signed transaction
      
      // Here we're using a simplified approach for demonstration
      // This endpoint would actually be called by the frontend with the signed transaction
      
      const { electionId, candidateId } = req.body;
      
      // Check if the voter is registered and hasn't voted yet
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      const [isRegistered, hasVoted] = await contract.getVoterStatus(electionId, voterAddress);
      
      if (!isRegistered) {
        return res.status(403).json({
          success: false,
          message: 'Voter is not registered for this election'
        });
      }
      
      if (hasVoted) {
        return res.status(403).json({
          success: false,
          message: 'Voter has already cast a vote in this election'
        });
      }
      
      // In a real app, we would process the signed transaction here
      // For demonstration, we're just returning the transaction data that would be signed
      
      // Encode the function call
      const data = contract.interface.encodeFunctionData('castVote', [electionId, candidateId]);
      
      res.json({
        success: true,
        message: 'Vote parameters validated, ready for transaction',
        transaction: {
          to: contractAddress,
          data,
          gasLimit: 200000 // Estimate
        }
      });
    } catch (error) {
      console.error('Error processing vote:', error);
      res.status(500).json({
        success: false,
        message: 'Server error processing vote'
      });
    }
  }
);

// @route   GET api/voters/status/:electionId
// @desc    Get the voter's status in an election
// @access  Private (Authenticated user)
router.get('/status/:electionId', authenticate, async (req, res) => { // Use authenticate
  try {
    // Ensure req.user is populated by authenticate and contains address
    if (!req.user || !req.user.address) {
      return res.status(401).json({ success: false, message: 'User address not found in token.' });
    }
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const electionId = req.params.electionId;
    const voterAddress = req.user.address;
    
    // Get voter status
    const [isRegistered, hasVoted] = await contract.getVoterStatus(electionId, voterAddress);
    
    res.json({
      success: true,
      status: {
        isRegistered,
        hasVoted
      }
    });
  } catch (error) {
    console.error('Error getting voter status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting voter status'
    });
  }
});

// ---- New Route for Merkle Proof ----
const merkleController = require('../controllers/merkleController');

// @route   GET api/voters/:electionId/merkle-proof
// @desc    Get Merkle proof for the authenticated voter for a specific election
// @access  Private (Authenticated user - voter)
router.get(
  '/:electionId/merkle-proof',
  authenticate, // Use authenticate middleware
  merkleController.getMerkleProofForVoter
);

module.exports = router;
