import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, ListGroup, Spinner, Alert, Form } from 'react-bootstrap';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import AuthContext from '../../context/AuthContext';
import VotingTokenABI from '../../abis/VotingToken.json';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';

const ElectionDetails = () => {
  // Hooks
  const { id } = useParams();
  const { isAuthenticated, userAddress, contract, signer } = useContext(AuthContext);
  const { t } = useTranslation();

  // State for election data and status
  const [election, setElection] = useState(null);
  const [voterStatus, setVoterStatus] = useState({ isRegistered: false, hasVoted: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for voting logic
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [hasVotingToken, setHasVotingToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  const fetchElectionDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/elections/${id}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch election details');
      setElection(data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching election details:', err);
      setError('Failed to load election details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkVoterStatus = useCallback(async () => {
    if (!isAuthenticated || !userAddress) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/voters/status/${id}`, { headers: { 'x-auth-token': token } });
      const data = await response.json();
      if (data.success) setVoterStatus(data.status);
    } catch (err) {
      console.error('Error checking voter status:', err);
    }
  }, [isAuthenticated, userAddress, id]);

  const checkTokenBalance = useCallback(async () => {
    if (!election?.tokenAddress || !userAddress || !signer) {
      setHasVotingToken(false);
      setIsCheckingToken(false);
      return;
    }
    setIsCheckingToken(true);
    try {
      const tokenContract = new ethers.Contract(election.tokenAddress, VotingTokenABI.abi, signer);
      const balance = await tokenContract.balanceOf(userAddress);
      setHasVotingToken(balance.gt(0));
    } catch (err) {
      console.error("Error checking token balance:", err);
      setHasVotingToken(false);
      toast.error("Could not verify your voting token.");
    } finally {
      setIsCheckingToken(false);
    }
  }, [election, userAddress, signer]);

  useEffect(() => {
    fetchElectionDetails();
  }, [fetchElectionDetails]);

  useEffect(() => {
    if (isAuthenticated && userAddress && election) {
      checkVoterStatus();
      checkTokenBalance();
    }
  }, [isAuthenticated, userAddress, election, checkVoterStatus, checkTokenBalance]);

  const handleVote = async () => {
    if (!selectedCandidateId) {
      toast.warn("Please select a candidate before voting.");
      return;
    }
    if (!contract) {
      toast.error("Voting contract is not available. Please reconnect.");
      return;
    }
    setIsVoting(true);
    try {
      const tx = await contract.vote(id, selectedCandidateId);
      toast.info("Your vote is being submitted... Please wait for confirmation.");
      await tx.wait();
      toast.success("You have successfully voted!");
      fetchElectionDetails();
      checkVoterStatus();
    } catch (err) {
      console.error("Vote casting error:", err);
      toast.error(err?.data?.message || err.reason || "Failed to cast vote.");
    } finally {
      setIsVoting(false);
    }
  };

  const getStatusBadge = () => {
    if (!election) return null;
    if (isElectionActive(election)) return <Badge bg="success">{t('elections.status.active')}</Badge>;
    if (hasElectionEnded(election)) return <Badge bg="secondary">{t('elections.status.ended')}</Badge>;
    return <Badge bg="warning">{t('elections.status.upcoming')}</Badge>;
  };

  if (loading) {
    return <Container className="text-center my-5"><Spinner animation="border" /><p className="mt-3">Loading Election...</p></Container>;
  }

  if (error) {
    return <Container className="my-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  if (!election) {
    return <Container className="my-5"><Alert variant="warning">Election not found.</Alert></Container>;
  }

  const renderVotingActions = () => {
    if (!isAuthenticated) return <Alert variant="info">Please connect your wallet to participate.</Alert>;
    if (voterStatus.hasVoted) return <Alert variant="success">You have already voted in this election.</Alert>;
    if (hasElectionEnded(election)) return <Alert variant="secondary">This election has ended.</Alert>;
    if (!isElectionActive(election)) return <Alert variant="info">This election has not started yet.</Alert>;
    if (isCheckingToken) return <div className="text-center"><Spinner animation="grow" size="sm" /> Verifying token...</div>;
    if (!hasVotingToken) return <Alert variant="warning">You do not have the required token to vote in this election.</Alert>;

    return (
      <Button onClick={handleVote} disabled={isVoting || !selectedCandidateId} className="w-100" size="lg">
        {isVoting ? <><Spinner as="span" animation="border" size="sm" /> Submitting Vote...</> : 'Cast Your Vote'}
      </Button>
    );
  };

  return (
    <Container className="my-5 election-details-page">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header as="h4" className="d-flex justify-content-between align-items-center bg-light">
              {election.title}
              {getStatusBadge()}
            </Card.Header>
            <Card.Body>
              <Card.Text>{election.description}</Card.Text>
              <Row>
                <Col md={6}><strong>Start:</strong> {formatTimestamp(election.startTime)}</Col>
                <Col md={6}><strong>End:</strong> {formatTimestamp(election.endTime)}</Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={8} className="mb-4 mb-lg-0">
          <Card className="shadow-sm h-100">
            <Card.Header><h5 className="mb-0">Candidates</h5></Card.Header>
            <ListGroup variant="flush">
              <Form>
                {election.candidates && election.candidates.length > 0 ? (
                  election.candidates.map((candidate) => (
                    <ListGroup.Item key={candidate.id} action as="label" className="d-flex align-items-center">
                      <Form.Check 
                        type="radio" 
                        name="candidate-selection"
                        id={`candidate-${candidate.id}`}
                        value={candidate.id}
                        onChange={(e) => setSelectedCandidateId(e.target.value)}
                        disabled={voterStatus.hasVoted || !isElectionActive(election) || !hasVotingToken || isVoting}
                        className="me-3"
                      />
                      <div>
                        <h5 className="mb-1">{candidate.name}</h5>
                        {candidate.description && <p className="mb-1 text-muted">{candidate.description}</p>}
                      </div>
                    </ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item className="text-center py-4">No candidates available.</ListGroup.Item>
                )}
              </Form>
            </ListGroup>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header><h5 className="mb-0">Your Action</h5></Card.Header>
            <Card.Body className="text-center">
              {renderVotingActions()}
            </Card.Body>
          </Card>

          {(hasElectionEnded(election) || election.resultsFinalized) && (
            <Button as={Link} to={`/elections/${election.id}/results`} variant="outline-primary" className="w-100 mt-3">
              View Results
            </Button>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ElectionDetails;
