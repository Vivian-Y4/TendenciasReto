import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import AuthContext from '../../context/AuthContext';
import { formatTimestamp, isElectionActive, hasElectionEnded, canViewResults } from '../../utils/contractUtils';
import RevealVoteForm from '../voting/RevealVoteForm'; // Import the new component

const ElectionDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams(); // This is electionContractId
  const [election, setElection] = useState(null);
  // voterStatus from backend now indicates if user is registered for this election,
  // and if their *nullifier* has been used (if backend checks this for anonymous votes).
  // For reveal, we primarily care if they have a pending reveal in localStorage.
  const [voterStatus, setVoterStatus] = useState({ isRegistered: false, hasVoted: false }); // Keep for now
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, userAddress, contract } = useContext(AuthContext);

  const fetchElectionDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetching from API
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/elections/${id}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch election details');
      }
      
      setElection(data.data); // Adjusted to use data.data based on backend update
      setError('');
    } catch (error) {
      console.error('Error fetching election details:', error);
      setError('Failed to load election details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]);  // Adding id as a dependency since it's used inside the function

  const checkVoterStatus = useCallback(async () => {
    try {
      if (!isAuthenticated || !userAddress) return;
      
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/voters/status/${id}`,
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setVoterStatus(data.status);
      }
    } catch (error) {
      console.error('Error checking voter status:', error);
      // Not setting the main error state to avoid blocking the UI
    }
  }, [isAuthenticated, userAddress, id]);

  // Place useEffect hooks after function definitions
  useEffect(() => {
    fetchElectionDetails();
  }, [fetchElectionDetails, contract]);

  useEffect(() => {
    if (isAuthenticated && userAddress && election) {
      checkVoterStatus();
    }
  }, [isAuthenticated, userAddress, election, checkVoterStatus]);

  const getStatusBadge = () => {
    if (!election) return null;
    
    if (isElectionActive(election)) {
      return <Badge bg="success">{t('elections.status.active')}</Badge>;
    } else if (hasElectionEnded(election)) {
      return <Badge bg="secondary">{t('elections.status.ended')}</Badge>;
    } else {
      return <Badge bg="warning">{t('elections.status.upcoming')}</Badge>;
    }
  };

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">{t('common.loading')}</span>
        </Spinner>
        <p className="mt-3">{t('election_details.loading')}</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={fetchElectionDetails}>Retry</Button>
      </Container>
    );
  }

  if (!election) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Election not found.</Alert>
        <Button as={Link} to="/elections" variant="primary">
          Back to Elections
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Election Details</h2>
        <Button as={Link} to="/elections" variant="outline-secondary">
          Back to Elections
        </Button>
      </div>
      
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <Card.Title className="fs-3">{election.title}</Card.Title>
              <Card.Subtitle className="text-muted mb-2">ID: {election.id}</Card.Subtitle>
            </div>
            {getStatusBadge()}
          </div>
          
          <Card.Text>{election.description}</Card.Text>
          
          <Row className="mt-4">
            <Col md={6}>
              <p className="mb-1"><strong>Start Time:</strong> {formatTimestamp(election.startTime)}</p>
              <p className="mb-1"><strong>End Time:</strong> {formatTimestamp(election.endTime)}</p>
            </Col>
            <Col md={6}>
              <p className="mb-1"><strong>Total Votes:</strong> {election.totalVotes}</p>
              <p className="mb-1"><strong>Status:</strong> {election.isActive ? 'Active' : 'Inactive'}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      <Row>
        <Col lg={8} className="mb-4">
          {/* Conditionally render RevealVoteForm if election has ended, not finalized, and user has pending reveal */}
          {isAuthenticated && election && hasElectionEnded(election) && !election.resultsFinalized && (
            <RevealVoteForm election={election} />
          )}

          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Candidates ({election.candidates?.length || 0})</h5>
            </Card.Header>
            <ListGroup variant="flush">
              {election.candidates && election.candidates.length > 0 ? (
                election.candidates.map((candidate) => (
                  <ListGroup.Item key={candidate.id} className="py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-1">{candidate.name}</h5>
                        <p className="mb-0">{candidate.description}</p>
                      </div>
                      {canViewResults(election) && (
                        <Badge bg="info" pill>
                          {candidate.voteCount} votes
                        </Badge>
                      )}
                    </div>
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item className="text-center py-4">
                  No candidates available for this election.
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header>
              <h5 className="mb-0">Actions</h5>
            </Card.Header>
            <Card.Body>
              {!isAuthenticated ? (
                <>
                  <Alert variant="info">
                    Connect your wallet to participate in this election.
                  </Alert>
                  <Button as={Link} to="/login" variant="primary" className="w-100">
                    Connect Wallet
                  </Button>
                </>
              ) : !voterStatus.isRegistered ? (
                <Alert variant="warning">
                  You are not registered for this election. Please contact the election administrator.
                </Alert>
              ) : voterStatus.hasVoted ? (
                <Alert variant="success">
                  {/* This message might need adjustment. If using nullifiers, "hasVoted" means a nullifier associated with user was used.
                      If reveal is pending, they have "voted anonymously" but not yet "revealed".
                      For now, if backend's /status indicates hasVoted=true, it implies their nullifier is spent.
                  */}
                  You have already participated in this election (vote cast or revealed).
                </Alert>
              ) : isElectionActive(election) ? (
                <div className="text-center">
                  <p>You are eligible to vote in this election.</p>
                  <Button 
                    as={Link} 
                    to={`/elections/${election.id}/vote`} 
                    variant="success" 
                    size="lg" 
                    className="w-100"
                  >
                    Cast Your Vote
                  </Button>
                </div>
              ) : !hasElectionEnded(election) ? (
                <Alert variant="info">
                  This election has not started yet. Voting begins on {formatTimestamp(election.startTime)}.
                </Alert>
              ) : (
                <Alert variant="secondary">
                  This election has ended and is no longer accepting votes.
                </Alert>
              )}
              
              {(hasElectionEnded(election) || election.resultsFinalized) && (
                <Button 
                  as={Link} 
                  to={`/elections/${election.id}/results`} 
                  variant="outline-primary" 
                  className="w-100 mt-3"
                >
                  View Results
                </Button>
              )}
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Election Information</h5>
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <small className="d-block text-muted">Results Finalized</small>
                <div>{election.resultsFinalized ? 'Yes' : 'No'}</div>
              </ListGroup.Item>
              <ListGroup.Item>
                <small className="d-block text-muted">Candidate Count</small>
                <div>{election.candidateCount}</div>
              </ListGroup.Item>
              <ListGroup.Item>
                <small className="d-block text-muted">Total Votes</small>
                <div>{election.totalVotes}</div>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ElectionDetails;
