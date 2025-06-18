const express = require('express');
const router = express.Router();
const {
  getElections,
  getElection,
  getElectionResults,
  revealVoteOnContract
} = require('../server/controllers/electionController');
const { protect } = require('../middlewares/auth');

// Public routes
router.get('/', getElections);
router.get('/:id', getElection);
router.get('/:id/results', getElectionResults);

// Protected routes (only implemented functions)
router.post('/:id/reveal', protect, revealVoteOnContract);

module.exports = router; 