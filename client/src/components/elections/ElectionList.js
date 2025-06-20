import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';
import { ethers } from 'ethers';

const ElectionList = () => {
  const { t } = useTranslation();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { contract, userProvince } = useContext(AuthContext);
  const { isAdminAuthenticated } = useContext(AdminContext);

  useEffect(() => {
    fetchElections();
  }, [contract, userProvince]);

  const fetchElectionsFromContract = async () => {
    let totalElections = 0;
    if (typeof contract.electionCount === 'function') {
      const count = await contract.electionCount();
      totalElections = count.toNumber();
    } else if (typeof contract.getElectionsCount === 'function') {
      const count = await contract.getElectionsCount();
      totalElections = count.toNumber();
    } else {
      throw new Error('El contrato no expone un método de conteo de elecciones reconocido.');
    }

    const electionPromises = [];
    for (let i = 0; i < totalElections; i++) {
      electionPromises.push(contract.elections(i).catch(() => null));
    }

    const resolved = (await Promise.all(electionPromises)).filter(Boolean);

    return resolved.map((election, index) => ({
      id: index + 1,
      title: election.title,
      description: election.description ?? '',
      startTime: election.startTime?.toNumber ? election.startTime.toNumber() : 0,
      endTime: election.endTime?.toNumber ? election.endTime.toNumber() : 0,
      candidateCount: election.candidateCount?.toNumber ? election.candidateCount.toNumber() : 0,
      totalVotes: election.totalVotes?.toNumber ? election.totalVotes.toNumber() : 0,
      isActive: election.isActive ?? isElectionActive(election)
    }));
  };

  const fetchElections = async () => {
    // Si hay contrato conectado úsalo; de lo contrario (ej. admin sin wallet) consulta la API
    if (!contract) {
      if (!isAdminAuthenticated) {
        setError('El contrato no está disponible. Por favor, conecta tu billetera primero.');
        setLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL;
        const res = await fetch(`${apiUrl}/api/elections`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Error obteniendo elecciones');

        const allElections = json.data || json.elections || [];
        setElections(allElections);
        return;
      } catch (apiErr) {
        console.error('Error al obtener elecciones desde la API:', apiErr);
        setError(apiErr.message || 'Error al obtener elecciones desde la API');
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      let backendElections = [];
      try {
        const token = localStorage.getItem('auth_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const apiUrl = `${process.env.REACT_APP_API_URL}/api/elections`;
        const response = await fetch(apiUrl, { method: 'GET', headers });
        const data = await response.json();

        if (response.ok && data.success && Array.isArray(data.data)) {
          backendElections = data.data;
        }
      } catch (apiErr) {
        console.warn('Fallo al obtener elecciones vía backend, se usará fallback al contrato:', apiErr.message);
      }

      if (backendElections.length === 0) {
        const contractElections = await fetchElectionsFromContract();
        setElections(contractElections);
      } else {
        setElections(backendElections);
      }
    } catch (err) {
      console.error('Error al cargar las elecciones:', err);
      setError('Ocurrió un error al cargar las elecciones. Revisa la consola para más detalles.');
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
                  <Card.Title>{election.title || 'Untitled Election'}</Card.Title>
                  {getStatusBadge({ startTime: election.startDate, endTime: election.endDate, status: election.status })}
                </div>
                <Card.Text>{election.description || 'No description available.'}</Card.Text>
                <div className="small text-muted mb-3">
                  <div><strong>Nivel:</strong> {election.level}</div>
                  {election.province && <div><strong>Provincia:</strong> {election.province}</div>}
                  <div><strong>Inicio:</strong> {formatTimestamp(election.startDate)}</div>
                  <div><strong>Fin:</strong> {formatTimestamp(election.endDate)}</div>
                  {/* <div><strong>Candidates:</strong> {election.candidateCount || 'N/A'}</div>
                  <div><strong>Total Votes:</strong> {election.totalVotes || 'N/A'}</div> */}
                </div>
              </Card.Body>
              <Card.Footer className="bg-white">
                <Button 
                  as={Link} 
                  to={`/elections/${election._id || election.id}`}
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
