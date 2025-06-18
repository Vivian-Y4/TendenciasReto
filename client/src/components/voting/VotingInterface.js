import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import AuthContext from '../../context/AuthContext';
import { formatTimestamp } from '../../utils/contractUtils';
import { validateApiUrl, handleApiError, createLoadingState, updateLoadingState } from '../../utils/validationUtils';
import { fetchMerkleProofForVoter } from '../../services/merkleService';
// Importing generateActualZkProof instead of mock
import { calculateNullifierHash, calculateVoteCommitment, generateVoteNonce, generateActualZkProof } from '../../services/zkService';

const VotingInterface = () => {
  const { t } = useTranslation();
  const electionIdParam = useParams().id; // Renamed to avoid conflict with election object's id
  const { id: electionContractId } = useParams(); // This is the electionId from the URL, matching contract's uint256
  const navigate = useNavigate();
  const [electionState, setElectionState] = useState(createLoadingState());
  const electionData = electionState.data; // Renamed to avoid conflict
  // voterStatus might not be as relevant if all voting is anonymous and relies on nullifiers
  // However, checking if already voted via nullifier could be a feature.
  // For now, we'll rely on the ZK proof and contract to prevent double voting.
  // const [voterStatus, setVoterStatus] = useState({ isRegistered: false, hasVoted: false });
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { isAuthenticated, userAddress, contract, signer, voterIdentifier } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [currentStepMessage, setCurrentStepMessage] = useState('');


  const fetchElectionDetails = useCallback(async () => {
    try {
      setElectionState(s => updateLoadingState(s, { loading: true, error: null }));
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Assuming backend returns election details including its Merkle Root if set
      const response = await fetch(`${apiUrl}/api/elections/${electionContractId}`); // Use electionContractId
      const data = await response.json();
      
      if (!data?.success || !data.election) { // Adjusted to expect data.election
        throw new Error(data?.message || 'Error fetching election details from API.');
      }
      
      // Validate if election is suitable for anonymous voting (e.g., has Merkle root)
      // This logic might be more complex depending on election status
      if (!data.election.merkleRoot || data.election.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.warn("Election Merkle Root is not set. Anonymous voting might not be possible yet.");
        // toast.warn("Setup for anonymous voting in this election is not yet complete (Merkle root missing).");
        // Depending on UX, you might allow proceeding if backend handles this, or block.
      }

      setElectionState(s => updateLoadingState(s, { data: data.election, loading: false }));
    } catch (err) {
      const errorMessage = handleApiError(err);
      setElectionState(s => updateLoadingState(s, { error: errorMessage, loading: false }));
      toast.error(`Failed to load election details: ${errorMessage}`);
    }
  }, [electionContractId]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (electionContractId) {
      fetchElectionDetails();
    }
    // checkVoterStatus might be less relevant or needs to check based on nullifier if already voted.
    // For now, focusing on the voting process itself.
  }, [electionContractId, isAuthenticated, navigate, fetchElectionDetails]);


  // Removed checkVoterStatus as direct contract status checks for hasVoted will change with nullifiers.
  // isRegistered is implicitly checked by ability to get Merkle proof.

  const handleCandidateChange = (e) => {
    setSelectedCandidate(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCandidate) {
      toast.error('Please select a candidate');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmVote = async () => {
    if (!contract || !signer || !voterIdentifier || !electionData || !electionData.merkleRoot || selectedCandidate === '') {
      toast.error("Información necesaria para votar incompleta. Verifique detalles de elección y autenticación.");
      return;
    }
    setShowConfirmModal(false);
    setSubmitting(true);
    setCurrentStepMessage('Preparando voto anónimo...');

    try {
      // 1. Mock voterSecret (in a real app, this must be securely managed)
      const voterSecret = ethers.utils.id(userAddress + electionContractId); // Example: derive a mock secret
      toast.info("Usando secreto de votante mock (solo para pruebas).");

      // 2. Fetch Merkle Proof
      setCurrentStepMessage('Obteniendo prueba de Merkle...');
      const token = localStorage.getItem('auth_token');
      const proofData = await fetchMerkleProofForVoter(electionContractId, token);
      if (!proofData || !proofData.merkleProof || proofData.merkleRoot !== electionData.merkleRoot) {
          throw new Error("Prueba de Merkle inválida o no coincide con la raíz de la elección.");
      }
      const merklePath = proofData.merkleProof;
      const backendMerkleRoot = proofData.merkleRoot; // This should match electionData.merkleRoot

      // 3. Generate voteNonce
      const voteNonce = generateVoteNonce();

      // 4. Calculate public inputs (as the circuit would, these are passed to contract)
      setCurrentStepMessage('Calculando hashes públicos...');
      const nullifierHash = calculateNullifierHash(voterSecret, electionContractId);
      const voteCommitment = calculateVoteCommitment(selectedCandidate, voteNonce);
      
      // Public inputs for the ZK proof verification on contract must match those from the circuit.
      const publicInputsForCircuit = {
        merkleRoot: electionData.merkleRoot, // From election data (should match backendMerkleRoot)
        nullifierHash: nullifierHash,         // Calculated client-side
        voteCommitment: voteCommitment        // Calculated client-side
      };

      // 5. Generate Actual ZK Proof
      setCurrentStepMessage('Generando prueba ZK...');
      // Ensure merklePathIndices is available from proofData
      if (!proofData.merklePathIndices) {
        throw new Error("Merkle path indices no proporcionados por el backend.");
      }

      const privateInputsForCircuit = {
        voterSecret: voterSecret, // This is a mock, real secret management is needed
        voterIdentifier: voterIdentifier,
        merklePath: merklePath,
        merklePathIndices: proofData.merklePathIndices, // From backend
        candidateId: selectedCandidate,
        voteNonce: voteNonce,
        electionId: electionContractId // Passed to circuit for nullifier calculation
      };
      
      const { proof: zkSnarkProof, publicInputsForContract: zkSnarkPublicSignals } = await generateActualZkProof(
        privateInputsForCircuit,
        publicInputsForCircuit // Pass the public inputs that the circuit will also use and output
      );
      
      // Sanity check: The public signals from the proof should match what we calculated/expect.
      // zkSnarkPublicSignals contains values as decimal strings. Convert to hex for comparison if needed, or compare as BigInt.
      // The contract expects bytes32 hex strings for these.
      // We calculated nullifierHash and voteCommitment as bytes32 hex.
      // electionData.merkleRoot is already a bytes32 hex.
      // The `generateActualZkProof` service should return these in a consistent format,
      // or we perform the final formatting here. For now, assume they are returned ready for contract.

      const finalMerkleRoot = publicInputsForCircuit.merkleRoot; // Should be verified against zkSnarkPublicSignals.merkleRoot
      const finalNullifierHash = publicInputsForCircuit.nullifierHash; // Should be verified against zkSnarkPublicSignals.nullifierHash
      const finalVoteCommitment = publicInputsForCircuit.voteCommitment; // Should be verified against zkSnarkPublicSignals.voteCommitment

      // TODO: Add robust comparison/validation of zkSnarkPublicSignals against finalMerkleRoot, finalNullifierHash, finalVoteCommitment
      // For example:
      // const circuitMerkleRoot = ethers.BigNumber.from(zkSnarkPublicSignals.merkleRoot).toHexString();
      // if (ethers.utils.hexZeroPad(circuitMerkleRoot, 32) !== finalMerkleRoot) {
      //    throw new Error("Discrepancia en Merkle Root de la prueba ZK.");
      // }
      // Similar checks for nullifierHash and voteCommitment, ensuring proper hex padding if needed.


      // 6. Call anonymousVote contract function
      setCurrentStepMessage('Enviando voto anónimo a la blockchain...');
      const contractWithSigner = contract.connect(signer);
      
      console.log(`[VotingInterface] Calling contract.anonymousVote with:
        electionId: ${electionContractId},
        _pA: ${JSON.stringify(zkSnarkProof._pA)},
        _pB: ${JSON.stringify(zkSnarkProof._pB)},
        _pC: ${JSON.stringify(zkSnarkProof._pC)},
        _merkleRoot: ${finalMerkleRoot},
        _nullifierHash: ${finalNullifierHash},
        _voteCommitment: ${finalVoteCommitment}`);

      const tx = await contractWithSigner.anonymousVote(
        electionContractId,
        zkSnarkProof._pA,
        zkSnarkProof._pB,
        zkSnarkProof._pC,
        finalMerkleRoot, // Use the verified/consistent public inputs
        finalNullifierHash,
        finalVoteCommitment
      );

      setCurrentStepMessage('Transacción enviada. Esperando confirmación...');
      toast.info('Transacción enviada. Esperando confirmación...');
      const receipt = await tx.wait();
      
      toast.success('¡Voto anónimo registrado exitosamente!');
      console.log("Anonymous vote cast receipt:", receipt);

      // Store details for reveal phase
      try {
        const revealData = {
          electionId: electionContractId,
          candidateId: selectedCandidate, // Storing the ID of the candidate chosen
          voteCommitment: finalVoteCommitment, // Storing the commitment sent to the contract
          // Storing voteNonce is also useful if revealVote needed it, but current contract version doesn't.
          // voteNonce: voteNonce
        };
        localStorage.setItem(`pendingReveal_${electionContractId}_${userAddress}`, JSON.stringify(revealData));
        toast.info('Detalles del voto guardados para la fase de revelación.');
        console.log('Stored for reveal:', revealData);
      } catch (storageError) {
        console.error("Error saving reveal data to localStorage:", storageError);
        toast.error("No se pudieron guardar los detalles para la revelación, pero su voto fue emitido. Por favor, guarde su 'commitment' manualmente si desea revelarlo más tarde.");
      }

      navigate(`/elections/${electionContractId}/results`);

    } catch (err) {
      console.error('Error during anonymous vote submission:', err);
      const displayError = handleApiError(err, 'Fallo al emitir el voto anónimo.');
      setError(displayError);
      toast.error(displayError);
    } finally {
      setSubmitting(false);
      setCurrentStepMessage('');
    }
  };

  if (electionState.loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading voting interface...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{electionState.error}</Alert>
        <Button variant="primary" onClick={fetchElectionDetails}>Retry</Button>
        <Button variant="outline-secondary" className="ms-2" onClick={() => navigate(`/elections/${electionContractId}`)}>
          Back to Election
        </Button>
      </Container>
    );
  }

  if (!electionData || !electionData.candidates || electionData.candidates.length === 0) {
    return (
      <Container className="my-5">
        <Alert variant="warning">{t('voting.no_candidates_available')}</Alert>
        <Button variant="outline-secondary" onClick={() => navigate(`/elections/${electionContractId}`)}>
          {t('election_details.back_button')}
        </Button>
      </Container>
    );
  }

  // Check if election is active for voting (using electionData)
  // This logic might need adjustment based on how election status (active, ended) is determined with ZK voting.
  // For now, assume electionData.isActive and time checks are still relevant for UI.
  const now = new Date().getTime() / 1000;
  const electionIsCurrentlyActive = electionData.isActive && now >= electionData.startTime && now <= electionData.endTime;


  return (
    <Container>
      <h2 className="mb-4">Cast Your Anonymous Vote</h2>
      
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title>{electionData.title}</Card.Title>
          <Card.Text>{electionData.description}</Card.Text>
          <div className="small text-muted">
            <div><strong>Start:</strong> {formatTimestamp(electionData.startTime)}</div>
            <div><strong>End:</strong> {formatTimestamp(electionData.endTime)}</div>
            {electionData.merkleRoot && electionData.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
              <div className="text-success">Merkle Root Set: Ready for Anonymous Voting</div>
            ) : (
              <div className="text-warning">Merkle Root Not Set: Anonymous Voting may not be fully enabled.</div>
            )}
          </div>
        </Card.Body>
      </Card>
      
      {currentStepMessage && <Alert variant="info">{currentStepMessage}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Select a Candidate</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {electionData.candidates.map((candidate) => (
                  <div key={candidate.id} className="mb-3">
                    <Card className={`border ${selectedCandidate === candidate.id.toString() ? 'border-primary' : ''}`}>
                      <Card.Body>
                        <Form.Check
                          type="radio"
                          id={`candidate-${candidate.id}`}
                          name="candidateSelection"
                          value={candidate.id.toString()} // Ensure value is string for comparison
                          checked={selectedCandidate === candidate.id.toString()}
                          onChange={handleCandidateChange}
                          label={
                            <div>
                              <h5>{candidate.name}</h5>
                              <p className="mb-0 text-muted">{candidate.description}</p>
                            </div>
                          }
                          className="d-flex align-items-start gap-3"
                        />
                      </Card.Body>
                    </Card>
                  </div>
                ))}
                
                <div className="d-grid gap-2 mt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={!selectedCandidate || submitting || !electionIsCurrentlyActive || !electionData.merkleRoot || electionData.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000'}
                  >
                    {submitting ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        {currentStepMessage || 'Processing...'}
                      </>
                    ) : (
                      'Submit Anonymous Vote'
                    )}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate(`/elections/${electionContractId}`)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
                {!electionIsCurrentlyActive && (
                    <Alert variant="warning" className="mt-3">This election is not currently active for voting.</Alert>
                )}
                 {(!electionData.merkleRoot || electionData.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') && (
                    <Alert variant="warning" className="mt-3">This election is not yet fully set up for anonymous voting (Merkle Root missing).</Alert>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Voting Information</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <i className="fas fa-info-circle me-2"></i>
                Your vote will be securely recorded on the blockchain. This requires a small transaction fee.
              </Alert>
              
              <div className="mb-3">
                <h6>How Voting Works:</h6>
                <ol className="small ps-3">
                  <li>Select your preferred candidate</li>
                  <li>Confirm your selection</li>
                  <li>Sign the transaction with your wallet</li>
                  <li>Wait for blockchain confirmation</li>
                </ol>
              </div>
              
              <div className="mb-3">
                <h6>Important Notes:</h6>
                <ul className="small ps-3">
                  <li>Your vote is anonymous</li>
                  <li>You can only vote once</li>
                  <li>Votes cannot be changed after submission</li>
                  <li>You need enough ETH in your wallet for gas fees</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Your Anonymous Vote</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {electionData && electionData.candidates && selectedCandidate !== '' && (
            (() => {
              // Find candidate object based on selectedCandidate ID
              const candidateObject = electionData.candidates.find(c => c.id.toString() === selectedCandidate);
              return candidateObject ? (
                <>
                  <p>You are about to anonymously vote for:</p>
                  <h4 className="mb-3">{candidateObject.name}</h4>
                  <Alert variant="warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    This action is anonymous and cannot be undone once confirmed on the blockchain.
                  </Alert>
                </>
              ) : (
                <p>Error: Selected candidate details not found.</p>
              );
            })()
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmVote} disabled={submitting}>
            {submitting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              'Confirm Vote'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default VotingInterface;
