import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthContext from '../../context/AuthContext';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';

const ElectionList = () => {
  const { t } = useTranslation();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { contract } = useContext(AuthContext);

  useEffect(() => {
    fetchElections();
  }, [contract]);

  const fetchElections = async () => {
    if (!contract) {
      setError("El contrato no está disponible. Por favor, conecta tu billetera primero.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const count = await contract.electionCount();
      const totalElections = count.toNumber();
      
      if (totalElections === 0) {
        setElections([]);
        setError('Aún no se han creado elecciones en la blockchain.');
        setLoading(false);
        return;
      }

      const electionPromises = [];
      // Los IDs de las elecciones en el contrato van de 1 a electionCount
      for (let i = 1; i <= totalElections; i++) {
        electionPromises.push(contract.elections(i));
      }

      const resolvedElections = await Promise.all(electionPromises);

      const formattedElections = resolvedElections.map((election, index) => ({
        id: index + 1, // El ID es el índice del bucle + 1
        title: election.title,
        description: election.description,
        startTime: election.startTime.toNumber(),
        endTime: election.endTime.toNumber(),
        candidateCount: election.candidateCount.toNumber(),
        totalVotes: election.totalVotes.toNumber(),
      }));
      
      setElections(formattedElections);

    } catch (e) {
      console.error('Error al obtener las elecciones del contrato:', e);
      setError('Ocurrió un error al cargar las elecciones desde la blockchain. Por favor, revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (election) => {
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
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading elections...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <div className="alert alert-danger">{error}</div>
        <Button variant="primary" onClick={fetchElections}>Retry</Button>
      </Container>
    );
  }

  if (elections.length === 0) {
    return (
      <Container className="my-5">
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-info-circle fa-3x text-muted mb-3"></i>
            <h3>No Elections Available</h3>
            <p className="text-muted">There are currently no elections to display.</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <h2 className="mb-4">Available Elections</h2>
      <Row>
        {elections.map((election) => (
          <Col md={6} lg={4} className="mb-4" key={election.id}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Card.Title>{election.title}</Card.Title>
                  {getStatusBadge(election)}
                </div>
                <Card.Text>{election.description}</Card.Text>
                <div className="small text-muted mb-3">
                  <div><strong>Start:</strong> {formatTimestamp(election.startTime)}</div>
                  <div><strong>End:</strong> {formatTimestamp(election.endTime)}</div>
                  <div><strong>Candidates:</strong> {election.candidateCount}</div>
                  <div><strong>Total Votes:</strong> {election.totalVotes}</div>
                </div>
              </Card.Body>
              <Card.Footer className="bg-white">
                <Button 
                  as={Link} 
                  to={`/elections/${election.id}`} 
                  variant="outline-primary" 
                  className="w-100"
                >
                  View Details
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default ElectionList;
