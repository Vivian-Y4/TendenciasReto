import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Table, Form, Button, Alert, Spinner, InputGroup, Modal, Row, Col, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import AdminContext from '../../context/AdminContext';

const ManageCandidates = () => {
  const { isAdminAuthenticated, adminPermissions, adminLoading } = useContext(AdminContext);

  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [candidateToRemove, setCandidateToRemove] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCandidate, setNewCandidate] = useState({
    walletAddress: '',
    firstName: '',
    lastName: '',
    party: '',
    imageUrl: ''
  });
  const [imagePreview, setImagePreview] = useState('');

  // Solo carga datos si eres admin y estás autenticado
  useEffect(() => {
    if (isAdminAuthenticated && adminPermissions) {
      fetchElections();
    }
  }, [isAdminAuthenticated, adminPermissions]);

  useEffect(() => {
    if (selectedElection) {
      fetchCandidates(selectedElection);
    } else {
      setCandidates([]);
    }
  }, [selectedElection]);

  useEffect(() => {
    setImagePreview(newCandidate.imageUrl);
  }, [newCandidate.imageUrl]);

  const fetchElections = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/elections`,
        {
          headers: { 'x-auth-token': localStorage.getItem('adminToken') }
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al cargar elecciones');
      setElections(data.elections || []);
      if (data.elections && data.elections.length > 0) {
        setSelectedElection(data.elections[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar elecciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (electionId) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/elections/${electionId}/candidates`,
        {
          headers: { 'x-auth-token': localStorage.getItem('adminToken') }
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al cargar candidatos');
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.message || 'Error al cargar candidatos');
    } finally {
      setLoading(false);
    }
  };

  const validateEthereumAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

  const handleAddCandidate = async () => {
    if (!validateEthereumAddress(newCandidate.walletAddress)) {
      toast.error('Dirección de Ethereum inválida');
      return;
    }
    if (!newCandidate.firstName || !newCandidate.lastName || !selectedElection) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/candidates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('adminToken')
          },
          body: JSON.stringify({
            electionId: selectedElection,
            firstName: newCandidate.firstName.trim(),
            lastName: newCandidate.lastName.trim(),
            party: newCandidate.party.trim(),
            walletAddress: newCandidate.walletAddress.trim(),
            imageUrl: newCandidate.imageUrl.trim()
          })
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'No se pudo agregar el candidato');
      toast.success('Candidato agregado correctamente');
      setShowAddModal(false);
      setNewCandidate({ walletAddress: '', firstName: '', lastName: '', party: '', imageUrl: '' });
      fetchCandidates(selectedElection);
    } catch (err) {
      toast.error(err.message || 'No se pudo agregar el candidato');
    } finally {
      setActionLoading(false);
    }
  };

  const openRemoveModal = (candidate) => {
    setCandidateToRemove(candidate);
    setShowRemoveModal(true);
  };

  const handleRemoveCandidate = async () => {
    if (!candidateToRemove) return;
    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/candidates/${candidateToRemove._id}`,
        {
          method: 'DELETE',
          headers: { 'x-auth-token': localStorage.getItem('adminToken') }
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'No se pudo eliminar el candidato');
      toast.success('Candidato eliminado correctamente');
      setShowRemoveModal(false);
      setCandidateToRemove(null);
      fetchCandidates(selectedElection);
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el candidato');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCandidates = searchTerm
    ? candidates.filter(c =>
        (c.firstName + ' ' + c.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.party && c.party.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.walletAddress && c.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : candidates;

  // Si está cargando, muestra spinner
  if (adminLoading || loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status" variant="primary" />
        <p className="mt-3">Cargando...</p>
      </Container>
    );
  }

  // Si no eres admin o no estás autenticado, no muestres nada (la protección ya la hace AdminRoute)
  if (!isAdminAuthenticated || !adminPermissions) {
    return null;
  }

  return (
    <Container>
      <h2 className="mb-4">Gestión de Candidatos</h2>
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Seleccione la elección</Form.Label>
                <Form.Select
                  value={selectedElection}
                  onChange={e => setSelectedElection(e.target.value)}
                  disabled={loading || elections.length === 0}
                >
                  {elections.length === 0 && <option value="">No hay elecciones</option>}
                  {elections.map(e => (
                    <option key={e._id} value={e._id}>
                      {e.title} ({new Date(e.startTime * 1000).toLocaleDateString()} - {new Date(e.endTime * 1000).toLocaleDateString()})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex align-items-end justify-content-end">
              <Button variant="success" onClick={() => setShowAddModal(true)} disabled={!selectedElection}>
                <i className="fas fa-plus me-2"></i> Nuevo Candidato
              </Button>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Buscar candidato por nombre, partido o dirección"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
          </Row>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Partido</th>
                  <th>Wallet</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-3">
                      No hay candidatos registrados
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate, idx) => (
                    <tr key={candidate._id}>
                      <td>{idx + 1}</td>
                      <td>
                        {candidate.imageUrl ? (
                          <Image src={candidate.imageUrl} alt="Foto" rounded width={48} height={48} style={{ objectFit: 'cover' }} />
                        ) : (
                          <span className="text-muted">Sin imagen</span>
                        )}
                      </td>
                      <td>{candidate.firstName} {candidate.lastName}</td>
                      <td>{candidate.party}</td>
                      <td>
                        <span style={{ fontSize: 12 }}>{candidate.walletAddress}</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 ms-2"
                          onClick={() => {
                            navigator.clipboard.writeText(candidate.walletAddress);
                            toast.info('Dirección copiada');
                          }}
                        >
                          <i className="fas fa-copy"></i>
                        </Button>
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => openRemoveModal(candidate)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
      {/* Modal para agregar candidato */}
      <Modal show={showAddModal} onHide={() => !actionLoading && setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Candidato</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={newCandidate.firstName}
                onChange={e => setNewCandidate({ ...newCandidate, firstName: e.target.value })}
                placeholder="Nombre"
                disabled={actionLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Apellido</Form.Label>
              <Form.Control
                type="text"
                value={newCandidate.lastName}
                onChange={e => setNewCandidate({ ...newCandidate, lastName: e.target.value })}
                placeholder="Apellido"
                disabled={actionLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Partido Político</Form.Label>
              <Form.Control
                type="text"
                value={newCandidate.party}
                onChange={e => setNewCandidate({ ...newCandidate, party: e.target.value })}
                placeholder="Partido"
                disabled={actionLoading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Wallet Address</Form.Label>
              <Form.Control
                type="text"
                value={newCandidate.walletAddress}
                onChange={e => setNewCandidate({ ...newCandidate, walletAddress: e.target.value })}
                placeholder="0x..."
                disabled={actionLoading}
              />
              <Form.Text className="text-muted">Debe ser una dirección Ethereum válida.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Imagen (URL)</Form.Label>
              <Form.Control
                type="url"
                value={newCandidate.imageUrl}
                onChange={e => setNewCandidate({ ...newCandidate, imageUrl: e.target.value })}
                placeholder="https://imagen-del-candidato.com/foto.jpg"
                disabled={actionLoading}
              />
              {imagePreview && (
                <div className="mt-2">
                  <Image src={imagePreview} alt="Vista previa" rounded width={80} height={80} style={{ objectFit: 'cover' }} />
                </div>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleAddCandidate} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Procesando...
              </>
            ) : (
              'Agregar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Modal de confirmación de eliminación */}
      <Modal show={showRemoveModal} onHide={() => !actionLoading && setShowRemoveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar Candidato</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Seguro que deseas eliminar a este candidato?
          <div className="bg-light p-2 rounded mt-2">
            <strong>{candidateToRemove?.firstName} {candidateToRemove?.lastName}</strong>
            <br />
            <span style={{ fontSize: 12 }}>{candidateToRemove?.walletAddress}</span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveModal(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleRemoveCandidate} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageCandidates;