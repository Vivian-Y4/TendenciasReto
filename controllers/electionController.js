const Election = require('../models/Election');
const Vote = require('../models/Vote');
const Voter = require('../models/Voter');

// Create a new election
exports.createElection = async (req, res) => {
  try {
    // Admitir "title" (preferido) o "name" desde el frontend
    const {
      title,
      name,
      level,
      description,
      startDate,
      endDate,
      candidates,
      contractAddress,
      participants,
    } = req.body;

    const electionTitle = title || name; // compatibilidad

    if (!electionTitle) {
      return res.status(400).json({ success: false, message: 'El campo título es requerido' });
    }

    // Verificación básica de nivel válido según enumeración del modelo
    const allowedLevels = ['presidencial', 'senatorial', 'diputados', 'municipal'];
    if (!allowedLevels.includes(level)) {
      return res.status(400).json({ success: false, message: 'Nivel de elección inválido' });
    }

    // Validación de roles requeridos ya la cubre el schema (pre-validate), pero podemos dar feedback inmediato
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requieren candidatos' });
    }

    const election = new Election({
      title: electionTitle,
      level,
      description,
      startDate,
      endDate,
      candidates,
      contractAddress,
      participants: participants || [],
      createdBy: req.user?.id,
    });

    await election.save();

    res.status(201).json({
      message: 'Election created successfully',
      election
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating election', error: error.message });
  }
};

// Get all elections
exports.getElections = async (req, res) => {
  try {
    const elections = await Election.find().select('-__v');
    res.json({ success: true, elections });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching elections', error: error.message });
  }
};

// Get election by ID
exports.getElectionById = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id).select('-__v');
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }
    res.json({ success: true, election });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching election', error: error.message });
  }
};

// Cast a vote
exports.castVote = async (req, res) => {
  try {
    const { candidateId, signature } = req.body;
    const electionId = req.params.id;
    const voterId = req.voter.id;

    // Check if election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Check if election is active
    if (!election.isActive()) {
      return res.status(400).json({ message: 'Election is not active' });
    }

    // Check if voter has already voted
    const existingVote = await Vote.findOne({ election: electionId, voter: voterId });
    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted in this election' });
    }

    // Create vote
    const vote = new Vote({
      election: electionId,
      voter: voterId,
      candidateId,
      signature,
      transactionHash: 'pending' // This should be updated with actual blockchain transaction hash
    });

    await vote.save();

    // Update candidate votes
    await election.updateVoteCount(candidateId, true);

    // Update voter's hasVoted status
    await Voter.findByIdAndUpdate(voterId, { hasVoted: true });

    res.status(201).json({
      message: 'Vote cast successfully',
      vote
    });
  } catch (error) {
    res.status(500).json({ message: 'Error casting vote', error: error.message });
  }
};

// Get election results
exports.getResults = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id).select('-__v');
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    const totalVotes = election.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

    const results = {
      success: true,
      election: {
        id: election._id,
        name: election.title,
        description: election.description,
        status: election.status,
        totalVotes
      },
      candidates: election.candidates.map(candidate => ({
        name: candidate.name,
        description: candidate.description,
        votes: candidate.votes,
        percentage: totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0
      }))
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching results', error: error.message });
  }
}; 