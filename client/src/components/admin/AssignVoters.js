import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Form, Alert, Spinner, Container, Card } from 'react-bootstrap';

const AssignVoters = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  
  const [voters, setVoters] = useState([]);
  const [selectedVoters, setSelectedVoters] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/voters`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (!response.ok) {
        throw new Error('No se pudo cargar la lista de votantes.');
      }
      const data = await response.json();
      if (data.success) {
        // Filtramos para asegurar que solo mostramos votantes con wallet
        const votersWithWallets = data.data.filter(v => v.walletAddress);
        setVoters(votersWithWallets);
      } else {
        throw new Error(data.message || 'Error al cargar votantes.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoters();
  }, [fetchVoters]);

  const handleSelectVoter = (voterId) => {
    setSelectedVoters(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(voterId)) {
        newSelected.delete(voterId);
      } else {
        newSelected.add(voterId);
      }
      return newSelected;
    });
  };

  const filteredVoters = voters.filter(voter =>
    `${voter.firstName} ${voter.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (voter.walletAddress && voter.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectAll = () => {
    if (selectedVoters.size === filteredVoters.length) {
      setSelectedVoters(new Set());
    } else {
      setSelectedVoters(new Set(filteredVoters.map(v => v._id)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (selectedVoters.size === 0) {
      setError('Por favor, seleccione al menos un votante.');
      setLoading(false);
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/elections/${electionId}/assign-voters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ voterIds: Array.from(selectedVoters) })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Éxito: ${data.message}. Votantes asignados: ${data.data.successfulAssignments.length}. Fallos: ${data.data.failedAssignments.length}.`);
        setSelectedVoters(new Set());
      } else {
        throw new Error(data.message || 'Ocurrió un error al asignar los votantes.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-4">
      <Card>
        <Card.Header as="h2">Asignar Votantes a Elección</Card.Header>
        <Card.Body>
          <Button variant="secondary" onClick={() => navigate(-1)} className="mb-3">
            &larr; Volver
          </Button>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                placeholder="Buscar por nombre, email o wallet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Form.Group>

            {loading && !voters.length ? (
              <div className="text-center">
                <Spinner animation="border" />
                <p>Cargando votantes...</p>
              </div>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>
                      <Form.Check
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedVoters.size === filteredVoters.length && filteredVoters.length > 0}
                      />
                    </th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVoters.map(voter => (
                    <tr key={voter._id}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedVoters.has(voter._id)}
                          onChange={() => handleSelectVoter(voter._id)}
                        />
                      </td>
                      <td>{voter.firstName} {voter.lastName}</td>
                      <td>{voter.email}</td>
                      <td>{voter.walletAddress ? `${voter.walletAddress.substring(0, 6)}...${voter.walletAddress.substring(voter.walletAddress.length - 4)}` : 'No registrada'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            <Button type="submit" disabled={loading || selectedVoters.size === 0}>
              {loading ? <Spinner as="span" animation="border" size="sm" /> : `Asignar ${selectedVoters.size} Votantes`}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AssignVoters;
