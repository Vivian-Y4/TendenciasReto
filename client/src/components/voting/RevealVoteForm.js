import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
// Assume a service for the reveal API call exists or will be created
// For now, direct fetch or define in a generic service.
// import { revealVoteAPI } from '../../services/electionService'; // Example if it were in electionService

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const RevealVoteForm = ({ election }) => {
  const { userAddress } = useContext(AuthContext);
  const { id: electionId } = useParams(); // This is electionContractId

  const [pendingRevealData, setPendingRevealData] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedCandidateId, setConfirmedCandidateId] = useState('');

  useEffect(() => {
    if (electionId && userAddress) {
      const storedData = localStorage.getItem(`pendingReveal_${electionId}_${userAddress}`);
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setPendingRevealData(parsedData);
          setConfirmedCandidateId(parsedData.candidateId); // Pre-fill confirmation
        } catch (e) {
          console.error("Error parsing stored reveal data:", e);
          localStorage.removeItem(`pendingReveal_${electionId}_${userAddress}`); // Clear corrupted data
        }
      }
      // Also check if this commitment was already revealed (e.g. via a backend check or another local flag)
      // For simplicity, this example assumes if data is present, it's not yet revealed by this client.
    }
  }, [electionId, userAddress]);

  const handleRevealVote = async () => {
    if (!pendingRevealData) {
      toast.error("No pending vote details found to reveal.");
      return;
    }
    if (confirmedCandidateId !== pendingRevealData.candidateId) {
        toast.error("Candidate selection for reveal does not match stored vote. This should not happen if UI is read-only for this part.");
        return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(`${API_URL}/api/elections/${electionId}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          candidateId: pendingRevealData.candidateId,
          voteCommitment: pendingRevealData.voteCommitment,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || `Failed to reveal vote. Status: ${response.status}`);
      }

      toast.success("Vote successfully revealed and will be tallied!");
      localStorage.removeItem(`pendingReveal_${electionId}_${userAddress}`); // Clear stored data after successful reveal
      setIsRevealed(true);
      setPendingRevealData(null); // Clear component state
    } catch (err) {
      console.error("Error revealing vote:", err);
      setError(err.message || "An error occurred while revealing the vote.");
      toast.error(err.message || "An error occurred while revealing the vote.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!pendingRevealData || isRevealed) {
    // If no data to reveal, or already revealed by this session, show nothing or a message.
    // For now, showing nothing if no data. If revealed, a message could be shown.
    if (isRevealed && !pendingRevealData) return <Alert variant="success">Your vote for this election has been revealed.</Alert>;
    return null;
  }

  // Check if election has ended but not yet finalized (conditions to show this form)
  const now = new Date().getTime() / 1000;
  const electionHasEnded = election && election.endTime && now > election.endTime;
  const resultsNotFinalized = election && !election.resultsFinalized;

  if (!electionHasEnded || !resultsNotFinalized) {
    return null; // Don't show if voting is ongoing or results are already final
  }

  // Find candidate name for display
  const candidateName = election.candidates?.find(c => c.id.toString() === pendingRevealData.candidateId)?.name || 'Unknown Candidate';

  return (
    <Card className="mt-4 mb-4 shadow-sm">
      <Card.Header>
        <Card.Title as="h5">Reveal Your Anonymous Vote for Tallying</Card.Title>
      </Card.Header>
      <Card.Body>
        <p>
          To ensure your anonymous vote is counted, please reveal your choice.
          The system has retrieved the details of the vote you cast anonymously.
        </p>
        <Form onSubmit={(e) => { e.preventDefault(); handleRevealVote(); }}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Election:</strong></Form.Label>
            <p>{election?.title || 'N/A'}</p>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label><strong>Your Stored Vote Choice:</strong></Form.Label>
            <p>Candidate: {candidateName} (ID: {pendingRevealData.candidateId})</p>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label><strong>Your Vote Commitment (Proof of Vote):</strong></Form.Label>
            <p style={{ wordBreak: 'break-all' }}><code>{pendingRevealData.voteCommitment}</code></p>
          </Form.Group>

          {error && <Alert variant="danger">{error}</Alert>}

          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Revealing...
              </>
            ) : (
              "Confirm and Reveal My Vote"
            )}
          </Button>
        </Form>
        <Alert variant="info" className="mt-3 small">
          By clicking "Confirm and Reveal", you are associating your previously cast anonymous vote commitment with the candidate shown above. This step is necessary for the vote to be included in the final tally.
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default RevealVoteForm;
