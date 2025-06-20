import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';
import { createLoadingState, updateLoadingState, validateApiUrl, safeParseInt, handleApiError } from '../../utils/validationUtils';
import AdminContext from '../../context/AdminContext';

const REFRESH_INTERVAL = 30000; // 30s real-time refresh

const ResultsPanel = () => {
  const [panelState, setPanelState] = useState(createLoadingState());
  const { isAdminAuthenticated } = useContext(AdminContext);

  // Memoized fetch without panelState dependency to avoid recreating it on every state change
  const fetchAllResults = useCallback(async () => {
    try {
      // Use functional state updates to work with latest value
      setPanelState((prev) => updateLoadingState(prev, { loading: true }));

      const apiUrl = process.env.REACT_APP_API_URL;
      if (!validateApiUrl(apiUrl)) {
        throw new Error('API URL inválida');
      }

      // 1) Traer todas las elecciones
      const electionsRes = await fetch(`${apiUrl}/api/elections`);
      const electionsJson = await electionsRes.json();
      if (!electionsJson.success) {
        throw new Error(electionsJson.message || 'Error obteniendo elecciones');
      }

      // Filtrar solo activas o finalizadas
      const eligible = electionsJson.data || electionsJson.elections || [];
      const visibleElections = isAdminAuthenticated ? eligible : eligible.filter((el) => isElectionActive(el) || hasElectionEnded(el));

      // 2) Traer resultados por elección en paralelo
      const resultsPromises = visibleElections.map(async (el) => {
        try {
          const res = await fetch(`${apiUrl}/api/elections/${el.id}/results`);
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          return { ...el, results: json.results, totalVotes: safeParseInt(json.totalVotes) };
        } catch (err) {
          console.error('Error obteniendo resultados de elección', el.id, err);
          return { ...el, error: err.message };
        }
      });

      const electionsWithResults = await Promise.all(resultsPromises);
      setPanelState((prev) => updateLoadingState(prev, { data: electionsWithResults }));
    } catch (error) {
      setPanelState((prev) => updateLoadingState(prev, { error: handleApiError(error) }));
    } finally {
      setPanelState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Run once on mount; fetchAllResults is stable (empty deps)
  useEffect(() => {
    fetchAllResults();
    const intervalId = setInterval(fetchAllResults, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchAllResults]);

  if (panelState.loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Cargando resultados…</p>
      </Container>
    );
  }

  if (panelState.error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{panelState.error}</Alert>
        <Button onClick={fetchAllResults}>Reintentar</Button>
      </Container>
    );
  }

  const elections = panelState.data || [];
  return (
    <Container className="mb-4">
      <h2 className="mb-4">Resultados de Elecciones Vigentes</h2>
      {elections.length === 0 && (
        <Alert variant="info">No hay resultados disponibles por el momento.</Alert>
      )}
      <Row>
        {elections.map((election) => {
          const statusBadge = isElectionActive(election) ? (
            <Badge bg="success">Activa</Badge>
          ) : (
            <Badge bg="secondary">Finalizada</Badge>
          );

          return (
            <Col md={6} lg={4} className="mb-4" key={election.id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title>{election.title}</Card.Title>
                    {statusBadge}
                  </div>
                  <Card.Text>{election.description}</Card.Text>
                  <div className="small text-muted mb-3">
                    <div><strong>Inicio:</strong> {formatTimestamp(election.startTime)}</div>
                    <div><strong>Fin:</strong> {formatTimestamp(election.endTime)}</div>
                    <div><strong>Total Votos:</strong> {election.totalVotes || 0}</div>
                  </div>
                  {election.error && <Alert variant="warning">{election.error}</Alert>}
                </Card.Body>
                <Card.Footer className="bg-white">
                  <Button as={Link} to={`/elections/${election.id}/results`} variant="outline-primary" className="w-100">
                    Ver Detalle
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default ResultsPanel;
