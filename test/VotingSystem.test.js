const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem Contract", function () {
  let VotingSystem;
  let votingSystem;
  let owner;
  let voter1;
  let voter2;
  let voter3;
  
  // Test data
  const electionTitle = "Test Election";
  const electionDescription = "This is a test election";
  let startTime;
  let endTime;
  
  // Setup test environment before each test
  beforeEach(async function () {
    // Get signers (accounts)
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    
    // Get the contract factory
    VotingSystem = await ethers.getContractFactory("VotingSystem");
    
    // Deploy the contract
    votingSystem = await VotingSystem.deploy();
    await votingSystem.deployed();
    
    // Set times (start: now + 1 hour, end: now + 1 day)
    const now = Math.floor(Date.now() / 1000);
    startTime = now + 3600; // +1 hour
    endTime = now + 86400; // +1 day
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await votingSystem.owner()).to.equal(owner.address);
    });
    
    it("Should have zero elections initially", async function () {
      expect(await votingSystem.electionCount()).to.equal(0);
    });
  });
  
  describe("Election Management", function () {
    it("Should create a new election correctly", async function () {
      // Create an election
      const tx = await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Check the event was emitted
      expect(receipt.events[0].event).to.equal("ElectionCreated");
      
      // Check election count increased
      expect(await votingSystem.electionCount()).to.equal(1);
      
      // Get the election details
      const election = await votingSystem.getElectionSummary(0);
      
      // Verify election details
      expect(election.title).to.equal(electionTitle);
      expect(election.description).to.equal(electionDescription);
      expect(election.startTime).to.equal(startTime);
      expect(election.endTime).to.equal(endTime);
      expect(election.isActive).to.equal(true);
      expect(election.candidateCount).to.equal(0);
      expect(election.totalVotes).to.equal(0);
      expect(election.resultsFinalized).to.equal(false);
    });
    
    it("Should add candidates to an election", async function () {
      // Create an election
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Add candidates
      await votingSystem.addCandidate(0, "Candidate 1", "Description 1");
      await votingSystem.addCandidate(0, "Candidate 2", "Description 2");
      
      // Check candidate count
      const election = await votingSystem.getElectionSummary(0);
      expect(election.candidateCount).to.equal(2);
      
      // Check candidate details
      const candidate1 = await votingSystem.getCandidate(0, 0);
      expect(candidate1[0]).to.equal("Candidate 1");
      expect(candidate1[1]).to.equal("Description 1");
      expect(candidate1[2]).to.equal(0); // voteCount
      
      const candidate2 = await votingSystem.getCandidate(0, 1);
      expect(candidate2[0]).to.equal("Candidate 2");
      expect(candidate2[1]).to.equal("Description 2");
      expect(candidate2[2]).to.equal(0); // voteCount
    });
    
    it("Should not allow non-authorized user to create elections", async function () {
      // Try to create election as non-authorized user
      await expect(
        votingSystem.connect(voter1).createElection( // voter1 is not owner and not an operator here
          electionTitle,
          electionDescription,
          startTime,
          endTime
        )
      ).to.be.revertedWith("VotingSystem: requiere autorizacion");
    });
    
    it("Should not allow non-authorized user to add candidates", async function () {
      // Create an election (as owner)
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      // Try to add candidate as non-authorized user
      await expect(
        votingSystem.connect(voter1).addCandidate(0, "Candidate 1", "Description 1") // voter1 is not owner and not an operator here
      ).to.be.revertedWith("VotingSystem: requiere autorizacion");
    });
    
    it("Should not allow creating election with invalid time parameters", async function () {
      const now = Math.floor(Date.now() / 1000);
      
      // Start time in the past
      await expect(
        votingSystem.createElection(
          electionTitle,
          electionDescription,
          now - 3600, // 1 hour ago
          endTime
        )
      ).to.be.revertedWith("VotingSystem: la hora de inicio debe ser en el futuro");
      
      // End time before start time
      await expect(
        votingSystem.createElection(
          electionTitle,
          electionDescription,
          startTime,
          startTime - 1 // 1 second before start
        )
      ).to.be.revertedWith("VotingSystem: la hora de fin debe ser posterior a la hora de inicio");
    });
  });
  
  describe("Voter Registration and Voting", function () {
    let voter1Hash, voter2Hash, voter3Hash;

    beforeEach(async function () {
      // Create an election and add candidates
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      await votingSystem.addCandidate(0, "Candidate 1", "Description 1");
      await votingSystem.addCandidate(0, "Candidate 2", "Description 2");
      
      // Helper to generate voter hashes
      const generateVoterHash = (address, salt = "test-salt") => {
        return ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'string'],
            [address, 0, salt] // Using electionId 0 as part of salt for uniqueness if needed
          )
        );
      };
      
      voter1Hash = generateVoterHash(voter1.address);
      voter2Hash = generateVoterHash(voter2.address);
      voter3Hash = generateVoterHash(voter3.address); // For a non-registered voter test

      // Register voters
      await votingSystem.registerVoter(0, voter1Hash);
      await votingSystem.registerVoter(0, voter2Hash);
    });
    
    it("Should register voters correctly", async function () {
      // Check voter count
      expect(await votingSystem.getRegisteredVoterCount(0)).to.equal(2);
      
      // Check voter status
      const [isRegistered1, hasVoted1] = await votingSystem.getVoterStatus(0, voter1Hash);
      expect(isRegistered1).to.equal(true);
      expect(hasVoted1).to.equal(false);
      
      const [isRegistered2, hasVoted2] = await votingSystem.getVoterStatus(0, voter2Hash);
      expect(isRegistered2).to.equal(true);
      expect(hasVoted2).to.equal(false);
      
      // Check non-registered voter
      const [isRegistered3, hasVoted3] = await votingSystem.getVoterStatus(0, voter3Hash);
      expect(isRegistered3).to.equal(false);
      expect(hasVoted3).to.equal(false);
    });
    
    it("Should not allow voting if election hasn't started", async function () {
      // Try to vote before election starts
      await expect(
        votingSystem.connect(voter1).castVote(0, 0, voter1Hash)
      ).to.be.revertedWith("VotingSystem: la eleccion aun no ha comenzado");
    });
    
    it("Should allow registered voters to cast votes when election is active", async function () {
      // Artificially make the election active by manipulating blockchain time
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 10]);
      await ethers.provider.send("evm_mine");
      
      // Cast vote
      await votingSystem.connect(voter1).castVote(0, 0, voter1Hash);
      
      // Check voter status
      const [isRegistered1, hasVoted1] = await votingSystem.getVoterStatus(0, voter1Hash);
      expect(isRegistered1).to.equal(true);
      expect(hasVoted1).to.equal(true);
      
      // Check vote count
      const candidate1 = await votingSystem.getCandidate(0, 0);
      expect(candidate1[2]).to.equal(1); // voteCount
      
      // Check election total votes
      const election = await votingSystem.getElectionSummary(0);
      expect(election.totalVotes).to.equal(1);
    });
    
    it("Should not allow double voting", async function () {
      // Artificially make the election active
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 10]);
      await ethers.provider.send("evm_mine");
      
      // Cast vote
      await votingSystem.connect(voter1).castVote(0, 0, voter1Hash);
      
      // Try to vote again
      await expect(
        votingSystem.connect(voter1).castVote(0, 1, voter1Hash)
      ).to.be.revertedWith("VotingSystem: ya ha votado con este identificador");
    });
    
    it("Should not allow non-registered voters to vote", async function () {
      // Artificially make the election active
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 10]);
      await ethers.provider.send("evm_mine");
      
      // Try to vote as non-registered voter
      await expect(
        votingSystem.connect(voter3).castVote(0, 0, voter3Hash)
      ).to.be.revertedWith("VotingSystem: votante no registrado con este identificador");
    });
  });
  
  describe("Results and Finalization", function () {
    let voter1Hash, voter2Hash, voter3Hash;

    beforeEach(async function () {
      // Create an election and add candidates
      await votingSystem.createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime
      );
      
      await votingSystem.addCandidate(0, "Candidate 1", "Description 1");
      await votingSystem.addCandidate(0, "Candidate 2", "Description 2");
      
      // Helper to generate voter hashes
      const generateVoterHash = (address, salt = "test-salt") => {
        return ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'string'],
            [address, 0, salt]
          )
        );
      };
      
      voter1Hash = generateVoterHash(voter1.address);
      voter2Hash = generateVoterHash(voter2.address);
      voter3Hash = generateVoterHash(voter3.address);

      // Register voters
      await votingSystem.registerVoter(0, voter1Hash);
      await votingSystem.registerVoter(0, voter2Hash);
      await votingSystem.registerVoter(0, voter3Hash);
      
      // Artificially make the election active
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 10]);
      await ethers.provider.send("evm_mine");
      
      // Cast votes
      await votingSystem.connect(voter1).castVote(0, 0, voter1Hash);
      await votingSystem.connect(voter2).castVote(0, 1, voter2Hash);
      await votingSystem.connect(voter3).castVote(0, 0, voter3Hash);
    });
    
    it("Should not allow viewing results before election ends", async function () {
      await expect(
        votingSystem.getElectionResults(0)
      ).to.be.revertedWith("VotingSystem: resultados no disponibles");
    });
    
    it("Should return correct results after election ends", async function () {
      // Artificially move time to after election ends
      await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 10]);
      await ethers.provider.send("evm_mine");
      
      // Get results
      const results = await votingSystem.getElectionResults(0);
      
      // Check results
      expect(results[0]).to.equal(2); // Candidate 1 votes
      expect(results[1]).to.equal(1); // Candidate 2 votes
    });
    
    it("Should finalize results correctly", async function () {
      // Artificially move time to after election ends
      await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 10]);
      await ethers.provider.send("evm_mine");
      
      // End election
      await votingSystem.endElection(0);
      
      // Finalize results
      const tx = await votingSystem.finalizeResults(0);
      const receipt = await tx.wait();
      
      // Check event
      expect(receipt.events[0].event).to.equal("ElectionFinalized");
      
      // Check election is marked as finalized
      const election = await votingSystem.getElectionSummary(0);
      expect(election.resultsFinalized).to.equal(true);
    });
    
    it("Should not allow non-admin to finalize results", async function () {
      // Artificially move time to after election ends
      await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 10]);
      await ethers.provider.send("evm_mine");
      
      // End election
      await votingSystem.endElection(0);
      
      // Try to finalize results as non-admin
      await expect(
        votingSystem.connect(voter1).finalizeResults(0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
