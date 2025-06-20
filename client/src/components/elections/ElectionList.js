import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';

const ElectionList = () => {
  const { t } = useTranslation();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { contract, userProvince } = useContext(AuthContext);
  const { isAdminAuthenticated } = useContext(AdminContext);

  useEffect(() => {
    fetchElections();
  }, [userProvince]);

  const fetchElections = async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${apiUrl}/api/elections`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error al obtener las elecciones desde la API');
      }

      const allElections = json.data || [];
      setElections(allElections);

    } catch (err) {
      console.error('Error al obtener elecciones desde la API:', err);
      setError(err.message || 'Ocurrió un error al cargar las elecciones.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge bg="success">Activa</Badge>;
      case 'finalized':
        return <Badge bg="secondary">Finalizada</Badge>;
      case 'upcoming':
        return <Badge bg="warning">Próxima</Badge>;
      default:
        return <Badge bg="light">Desconocido</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
          <Col md={6} lg={4} className="mb-4" key={election._id}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Card.Title>{election.title}</Card.Title>
                  {getStatusBadge(election.status)}
                </div>
                <Card.Text>{election.description}</Card.Text>
                <div className="small text-muted mb-3">
                  <div><strong>Start:</strong> {formatDate(election.startDate)}</div>
                  <div><strong>End:</strong> {formatDate(election.endDate)}</div>
                  <div><strong>Candidates:</strong> {election.candidates?.length || 0}</div>
                  <div><strong>Total Votes:</strong> {election.totalVotes}</div>
                </div>
              </Card.Body>
              <Card.Footer className="bg-white">
                <Button 
                  as={Link} 
                  to={`/elections/${election._id}`} 
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