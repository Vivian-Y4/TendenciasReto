import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Row, Col, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { formatTimestamp, canViewResults } from '../../utils/contractUtils';
import { validateApiUrl, safeParseInt, handleApiError, createLoadingState, updateLoadingState } from '../../utils/validationUtils';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const ElectionResults = () => {
  const { id } = useParams();
  const [electionState, setElectionState] = useState(createLoadingState());
  const [resultsState, setResultsState] = useState(createLoadingState());

  useEffect(() => {
    fetchElectionData();
  }, [id]);

  const fetchElectionData = async () => {
    try {
      setElectionState(updateLoadingState(electionState, { loading: true }));
      setResultsState(updateLoadingState(resultsState, { loading: true }));
      
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!validateApiUrl(apiUrl)) {
        throw new Error('URL de API inválida');
      }

      // First, fetch the election details
      const electionResponse = await fetch(`${apiUrl}/api/elections/${id}`);
      const electionData = await electionResponse.json();
      
      if (!electionData?.success) {
        throw new Error(electionData?.message || 'Error al obtener detalles de la elección');
      }
      
      const election = electionData.election;
      setElectionState(updateLoadingState(electionState, { data: election }));
      
      // Check if results can be viewed
      if (!canViewResults(election)) {
        throw new Error('Los resultados no están disponibles para esta elección');
      }

      // Then, fetch the results
      const resultsResponse = await fetch(`${apiUrl}/api/elections/${id}/results`);
      const resultsData = await resultsResponse.json();
      
      if (!resultsData?.success) {
        throw new Error(resultsData?.message || 'Error al obtener resultados de la elección');
      }
      
      const results = resultsData;
      setResultsState(updateLoadingState(resultsState, { data: results }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      setElectionState(updateLoadingState(electionState, { error: errorMessage }));
      setResultsState(updateLoadingState(resultsState, { error: errorMessage }));
    } finally {
      setElectionState(updateLoadingState(electionState, { loading: false }));
      setResultsState(updateLoadingState(resultsState, { loading: false }));
    }
  };

  const preparePieChartData = () => {
    if (!resultsState.data?.results) return null;
    
    const candidateNames = resultsState.data.results.map(candidate => candidate.name);
    const voteCounts = resultsState.data.results.map(candidate => safeParseInt(candidate.voteCount));
    
    const backgroundColors = resultsState.data.results.map((_, index) => {
      const hue = (index * 137) % 360;
      return `hsla(${hue}, 70%, 60%, 0.7)`;
    });
    
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));
    
    return {
      labels: candidateNames,
      datasets: [
        {
          data: voteCounts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }
      ]
    };
  };

  const prepareBarChartData = () => {
    if (!resultsState.data?.results) return null;
    
    const candidateNames = resultsState.data.results.map(candidate => candidate.name);
    const voteCounts = resultsState.data.results.map(candidate => safeParseInt(candidate.voteCount));
    
    return {
      labels: candidateNames,
      datasets: [
        {
          label: 'Votos',
          data: voteCounts,
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgba(53, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${context.label}: ${value} votes (${percentage}%)`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Distribución de Votos'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const total = resultsState.data.totalVotes;
            const percentage = Math.round((value / total) * 100);
            return `${value} votos (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Número de Votos'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Candidatos'
        }
      }
    }
  };

  return (
    <Container className="mt-4">
      {electionState.loading && (
        <div className="text-center my-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
          <p className="mt-3">Cargando resultados de la elección...</p>
        </div>
      )}

      {electionState.error && (
        <div className="my-5">
          <Alert variant="danger">{electionState.error}</Alert>
          <div className="d-flex gap-2">
            <Button variant="primary" onClick={fetchElectionData}>Reintentar</Button>
            <Button variant="outline-secondary" as={Link} to={`/elections/${id}`}>
              Volver a Elección
            </Button>
          </div>
        </div>
      )}

      {electionState.data && (
        <div>
          <h2>Resultados de la Elección: {electionState.data.title}</h2>
          <p>Fecha: {formatTimestamp(electionState.data.startTime)} - {formatTimestamp(electionState.data.endTime)}</p>

          <Row>
            <Col md={6}>
              <Card>
                <Card.Body>
                  <h3 className="mb-3">Gráfico de Pastel</h3>
                  {resultsState.loading && <Spinner animation="border" variant="primary" />}
                  {resultsState.error && (
                    <Alert variant="danger">{resultsState.error}</Alert>
                  )}
                  {resultsState.data && (
                    <Pie 
                      data={preparePieChartData()} 
                      options={pieChartOptions}
                    />
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <Card.Body>
                  <h3 className="mb-3">Gráfico de Barras</h3>
                  {resultsState.loading && <Spinner animation="border" variant="primary" />}
                  {resultsState.error && (
                    <Alert variant="danger">{resultsState.error}</Alert>
                  )}
                  {resultsState.data && (
                    <Bar 
                      data={prepareBarChartData()} 
                      options={barChartOptions}
                    />
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm mt-4">
            <Card.Header>
              <h5 className="mb-0">Resultados Detallados</h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Posición</th>
                      <th>Candidato</th>
                      <th>Descripción</th>
                      <th className="text-center">Votos</th>
                      <th className="text-center">Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsState.data.results
                      .sort((a, b) => safeParseInt(b.voteCount) - safeParseInt(a.voteCount))
                      .map((candidate, index) => {
                        const voteCount = safeParseInt(candidate.voteCount);
                        const totalVotes = safeParseInt(resultsState.data.totalVotes);
                        const percentage = (voteCount / totalVotes) * 100;
                        
                        return (
                          <tr key={candidate.id}>
                            <td>{index + 1}</td>
                            <td><strong>{candidate.name}</strong></td>
                            <td>{candidate.description}</td>
                            <td className="text-center">{voteCount}</td>
                            <td className="text-center">{percentage.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm mt-4 bg-light">
            <Card.Body>
              <h5>Verificación Blockchain</h5>
              <p>
                Todos los resultados de votación están almacenados de manera inmutable en el blockchain y pueden ser verificados independientemente.
                La integridad de estos resultados está garantizada por prueba criptográfica.
              </p>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Resultados actualizados: {new Date().toLocaleString()}</small>
                <Button variant="outline-primary" size="sm">
                  Ver en Blockchain
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  );
};

export default ElectionResults;
