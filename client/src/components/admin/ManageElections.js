import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Badge, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';

const ManageElections = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchElections = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/elections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setElections(response.data.elections || []);
      } else {
        throw new Error(response.data.message || 'Error al cargar las elecciones');
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const getStatusBadge = (election) => {
    if (election.resultsFinalized) return <Badge bg="success">Finalizada</Badge>;
    if (hasElectionEnded(election)) return <Badge bg="warning">Terminada</Badge>;
    if (isElectionActive(election)) return <Badge bg="primary">Activa</Badge>;
    return <Badge bg="secondary">Pendiente</Badge>;
  };

  const handleAction = async (action, electionId) => {
    const token = localStorage.getItem('adminToken');
    // Corregir los endpoints para que coincidan con las rutas del backend
    const endpointMap = {
      end: { method: 'post', url: `/api/admin/elections/${electionId}/end-election` },
      finalize: { method: 'post', url: `/api/admin/elections/${electionId}/finalize-results` },
    };

    const actionConfig = endpointMap[action];
    if (!actionConfig) {
      toast.error('Acción no reconocida.');
      return;
    }

    const { method, url } = actionConfig;

    if (!window.confirm('¿Estás seguro de que quieres realizar esta acción?')) return;

    try {
      await axios[method](url, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Acción realizada con éxito. La lista se actualizará.');
      fetchElections(); // Recargar la lista
    } catch (err) {
      console.error(`Error al realizar la acción '${action}':`, err);
      toast.error(err.response?.data?.message || `Error al ${action === 'end' ? 'finalizar la votación' : 'publicar los resultados'}.`);
    }
  };

  if (loading) {
    return <div className="text-center"><Spinner animation="border" /></div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Gestionar Elecciones</h2>
        <Button as={Link} to="/admin/create-election">Crear Nueva Elección</Button>
      </div>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Título</th>
            <th>Estado</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {elections && elections.length > 0 ? (
            elections.map((election) => (
              <tr key={election._id}>
                <td>{election.title}</td>
                <td>{getStatusBadge(election)}</td>
                <td>{formatTimestamp(election.startDate)}</td>
                <td>{formatTimestamp(election.endDate)}</td>
                <td>
                  <Dropdown>
                    <Dropdown.Toggle variant="secondary" size="sm">
                      Acciones
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item as={Link} to={`/admin/elections/${election._id}`}>Ver Detalles</Dropdown.Item>
                      <Dropdown.Item as={Link} to={`/admin/elections/${election._id}/assign-voters`}>Asignar Votantes</Dropdown.Item>
                      <Dropdown.Divider />
                      {isElectionActive(election) && (
                          <Dropdown.Item onClick={() => handleAction('end', election._id)}>Finalizar Votación</Dropdown.Item>
                      )}
                      {hasElectionEnded(election) && !election.resultsFinalized && (
                          <Dropdown.Item onClick={() => handleAction('finalize', election._id)}>Publicar Resultados</Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center">No se encontraron elecciones.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default ManageElections;
