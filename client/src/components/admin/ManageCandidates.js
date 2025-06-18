import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Container, Card, Table, Form, Button, Alert, Spinner, Modal, Row, Col, Badge, InputGroup
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import AdminContext from '../../context/AdminContext'; // Assuming this context provides auth/permissions

// Base URL for API calls, ensure your environment variable is set up
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const ManageCandidates = ({ isElectionActive: isElectionActiveProp, hasElectionEnded: hasElectionEndedProp, allElections: allElectionsFromDashboard }) => {
  const { isAdminAuthenticated, adminPermissions } = useContext(AdminContext);

  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [selectedElectionObject, setSelectedElectionObject] = useState(null);
  const [isCurrentElectionActive, setIsCurrentElectionActive] = useState(false);

  const [candidates, setCandidates] = useState([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // For modal operations
  const [statusToggleLoading, setStatusToggleLoading] = useState({}); // For individual status toggles

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidateData, setNewCandidateData] = useState({
    firstName: '',
    lastName: '',
    party: '',
    officeSought: '', // e.g., "Alcalde", "Presidente"
    walletAddress: '',
    photoUrl: '',
    biography: '',
    proposals: '',
    province: '',
    municipality: '',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null); // Stores the full candidate object being edited
  const [editCandidateData, setEditCandidateData] = useState({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);

  // Fetch all elections for the dropdown
  const fetchElections = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    setLoadingElections(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/elections`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error al cargar elecciones');
      setElections(data.elections || data.data || []);
      // Try to pre-select the first election if available
      if (data.elections && data.elections.length > 0 && !selectedElectionId) {
         // setSelectedElectionId(data.elections[0]._id); // Auto-select first election
      }
    } catch (err) {
      setError(err.message || 'Error al cargar elecciones');
      toast.error(err.message || 'Error al cargar elecciones');
    } finally {
      setLoadingElections(false);
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  // Fetch candidates when an election is selected
  const fetchCandidatesForElection = useCallback(async () => {
    if (!selectedElectionId || !isAdminAuthenticated) {
      setCandidates([]);
      return;
    }
    setLoadingCandidates(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/elections/${selectedElectionId}/candidates`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!data.success && data.message !== 'No candidates found for this election') { // Allow empty list
        throw new Error(data.message || 'Error al cargar candidatos');
      }
      setCandidates(data.data || []); // Assuming backend returns { success: true, data: [...] }
    } catch (err) {
      setError(err.message || 'Error al cargar candidatos');
      toast.error(err.message || 'Error al cargar candidatos');
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [selectedElectionId, isAdminAuthenticated]);

  useEffect(() => {
    fetchCandidatesForElection();
  }, [fetchCandidatesForElection]);

  useEffect(() => {
    if (selectedElectionId && allElectionsFromDashboard && typeof isElectionActiveProp === 'function') {
        const currentFullElection = allElectionsFromDashboard.find(e => e._id === selectedElectionId);
        setSelectedElectionObject(currentFullElection || null);
        setIsCurrentElectionActive(currentFullElection ? isElectionActiveProp(currentFullElection) : false);
    } else if (selectedElectionId && elections.length > 0 && typeof isElectionActiveProp === 'function') {
        // Fallback to locally fetched elections if dashboard prop not ready (though less ideal for status)
        const currentFullElection = elections.find(e => e._id === selectedElectionId);
        setSelectedElectionObject(currentFullElection || null);
        setIsCurrentElectionActive(currentFullElection ? isElectionActiveProp(currentFullElection) : false);
    } else {
        setSelectedElectionObject(null);
        setIsCurrentElectionActive(false);
    }
  }, [selectedElectionId, allElectionsFromDashboard, elections, isElectionActiveProp]);


  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === 'add') {
      setNewCandidateData(prev => ({ ...prev, [name]: value }));
    } else if (formType === 'edit') {
      setEditCandidateData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openAddModal = () => {
    setNewCandidateData({ // Reset form
      firstName: '', lastName: '', party: '', officeSought: '',
      walletAddress: '', photoUrl: '', biography: '', proposals: '',
      province: selectedElectionObject?.level === 'presidencial' ? '' : selectedElectionObject?.province || '',
      municipality: selectedElectionObject?.level === 'municipal' ? selectedElectionObject?.municipality || '' : '',
    });
    setShowAddModal(true);
  };

  const handleAddCandidate = async () => {
    if (!selectedElectionId) {
      toast.error('Por favor, seleccione una elección primero.');
      return;
    }
    // Basic Validation
    if (!newCandidateData.firstName || !newCandidateData.lastName || !newCandidateData.officeSought || !newCandidateData.party) {
        toast.error("Nombre, Apellido, Cargo y Partido son obligatorios.");
        return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload = { ...newCandidateData, electionId: selectedElectionId };
      const response = await fetch(`${API_BASE_URL}/api/admin/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error al agregar candidato');
      toast.success('Candidato agregado exitosamente');
      setShowAddModal(false);
      fetchCandidatesForElection(); // Refresh list
    } catch (err) {
      toast.error(err.message || 'No se pudo agregar el candidato');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (candidate) => {
    setEditingCandidate(candidate);
    setEditCandidateData({
      firstName: candidate.firstName || '',
      lastName: candidate.lastName || '',
      party: candidate.party || '',
      officeSought: candidate.officeSought || '',
      walletAddress: candidate.walletAddress || '',
      photoUrl: candidate.photoUrl || '',
      biography: candidate.biography || '',
      proposals: candidate.proposals || '',
      province: candidate.province || '',
      municipality: candidate.municipality || '',
      isActive: candidate.isActive, // Keep isActive for potential direct edit if needed, though usually via toggle
    });
    setShowEditModal(true);
  };

  const handleEditCandidate = async () => {
    if (!editingCandidate?._id) return;
    // Basic Validation
    if (!editCandidateData.firstName || !editCandidateData.lastName || !editCandidateData.officeSought || !editCandidateData.party) {
        toast.error("Nombre, Apellido, Cargo y Partido son obligatorios.");
        return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      // Remove electionId from payload as it's not typically changed, and _id is in URL
      // eslint-disable-next-line no-unused-vars
      const { _id, election, ...payloadToSend } = editCandidateData;
      const response = await fetch(`${API_BASE_URL}/api/admin/candidates/${editingCandidate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(payloadToSend),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error al actualizar candidato');
      toast.success('Candidato actualizado exitosamente');
      setShowEditModal(false);
      setEditingCandidate(null);
      fetchCandidatesForElection(); // Refresh list
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el candidato');
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (candidate) => {
    setCandidateToDelete(candidate);
    setShowDeleteModal(true);
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete?._id) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/candidates/${candidateToDelete._id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error al eliminar candidato');
      toast.success('Candidato eliminado exitosamente');
      setShowDeleteModal(false);
      setCandidateToDelete(null);
      fetchCandidatesForElection(); // Refresh list
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el candidato');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActiveStatus = async (candidateId, currentStatus) => {
    setStatusToggleLoading(prev => ({ ...prev, [candidateId]: true }));
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/candidates/${candidateId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error al cambiar estado');
      toast.success(`Candidato ${!currentStatus ? 'activado' : 'desactivado'}`);
      fetchCandidatesForElection(); // Refresh
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado');
    } finally {
      setStatusToggleLoading(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const searchLower = searchTerm.toLowerCase();
    return (
      candidate.firstName?.toLowerCase().includes(searchLower) ||
      candidate.lastName?.toLowerCase().includes(searchLower) ||
      candidate.party?.toLowerCase().includes(searchLower) ||
      candidate.officeSought?.toLowerCase().includes(searchLower) ||
      candidate.walletAddress?.toLowerCase().includes(searchLower)
    );
  });

  const renderElectionLevel = (election) => {
    if (!election || !election.level) return 'N/A';
    const levelMap = {
      presidencial: 'Presidencial',
      senatorial: 'Senatorial',
      diputados: 'Diputados',
      municipal: 'Municipal',
    };
    return levelMap[election.level.toLowerCase()] || election.level;
  };

  if (!isAdminAuthenticated) {
    console.log("ManageCandidates: Not authenticated, returning simple div.");
    return (<div>ManageCandidates: Not Authenticated.</div>);
  }
  if (loadingElections) {
    console.log("ManageCandidates: Loading elections, returning simple div.");
    return (<div>ManageCandidates: Loading Elections...</div>);
  }

  const commonFormFields = (data, handler, formType) => (
    <>
      <Row>
        <Col md={6}><Form.Group className="mb-3"><Form.Label>Nombre(s) *</Form.Label><Form.Control type="text" name="firstName" value={data.firstName} onChange={e => handler(e, formType)} /></Form.Group></Col>
        <Col md={6}><Form.Group className="mb-3"><Form.Label>Apellido(s) *</Form.Label><Form.Control type="text" name="lastName" value={data.lastName} onChange={e => handler(e, formType)} /></Form.Group></Col>
      </Row>
      <Row>
        <Col md={6}><Form.Group className="mb-3"><Form.Label>Partido Político *</Form.Label><Form.Control type="text" name="party" value={data.party} onChange={e => handler(e, formType)} /></Form.Group></Col>
        <Col md={6}><Form.Group className="mb-3"><Form.Label>Cargo al que Aspira *</Form.Label><Form.Control type="text" name="officeSought" value={data.officeSought} onChange={e => handler(e, formType)} placeholder="Ej: Alcalde, Presidente"/></Form.Group></Col>
      </Row>
      <Form.Group className="mb-3"><Form.Label>Wallet Address</Form.Label><Form.Control type="text" name="walletAddress" value={data.walletAddress} onChange={e => handler(e, formType)} /></Form.Group>
      <Form.Group className="mb-3"><Form.Label>URL de Foto</Form.Label><Form.Control type="text" name="photoUrl" value={data.photoUrl} onChange={e => handler(e, formType)} /></Form.Group>
      {data.photoUrl && <div className="mb-3"><Image src={data.photoUrl} alt="Preview" thumbnail width={100} /></div>}
      <Form.Group className="mb-3"><Form.Label>Biografía</Form.Label><Form.Control as="textarea" rows={3} name="biography" value={data.biography} onChange={e => handler(e, formType)} /></Form.Group>
      <Form.Group className="mb-3"><Form.Label>Propuestas</Form.Label><Form.Control as="textarea" rows={3} name="proposals" value={data.proposals} onChange={e => handler(e, formType)} /></Form.Group>
      <Row>
        <Col md={6}><Form.Group className="mb-3"><Form.Label>Provincia</Form.Label><Form.Control type="text" name="province" value={data.province} onChange={e => handler(e, formType)} disabled={selectedElectionObject?.level === 'presidencial'} /></Form.Group></Col>
        <Col md={6}><Form.Group className="mb-3"><Form.Label>Municipio</Form.Label><Form.Control type="text" name="municipality" value={data.municipality} onChange={e => handler(e, formType)} disabled={selectedElectionObject?.level !== 'municipal'} /></Form.Group></Col>
      </Row>
    </>
  );

  return (
    <Container fluid className="mt-0 pt-0"> {/* Changed from p-4 to mt-0 pt-0 to align with dashboard style */}
      <Card className="shadow-sm">
        <Card.Header as="h5">Gestión de Candidatos</Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Seleccione una Elección</Form.Label>
            <Form.Select value={selectedElectionId} onChange={e => setSelectedElectionId(e.target.value)} disabled={elections.length === 0}>
              <option value="">-- Seleccionar Elección --</option>
              {elections.map(el => (
                <option key={el._id} value={el._id}>{el.title} ({renderElectionLevel(el)})</option>
              ))}
            </Form.Select>
          </Form.Group>

          {selectedElectionId && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  Nivel Electoral: <strong>{selectedElectionObject ? renderElectionLevel(selectedElectionObject) : 'N/A'}</strong>
                  {isCurrentElectionActive && <Badge bg="warning" className="ms-2">Elección Activa (Edición Limitada)</Badge>}
                </div>
                <Button variant="primary" onClick={openAddModal} disabled={actionLoading}>
                  <i className="fas fa-plus me-2"></i> Agregar Candidato
                </Button>
              </div>
              <InputGroup className="mb-3">
                <Form.Control placeholder="Buscar candidato..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>Limpiar</Button>
              </InputGroup>

              {loadingCandidates ? <div className="text-center"><Spinner animation="border" /></div> :
                error ? <Alert variant="danger">{error}</Alert> :
                filteredCandidates.length === 0 ? <Alert variant="info">No hay candidatos para esta elección o filtro.</Alert> : (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm">
                    <thead><tr>
                      <th>Foto</th><th>Nombre</th><th>Partido</th><th>Cargo</th>
                      <th>Provincia</th><th>Municipio</th><th>Estado</th><th>Acciones</th>
                    </tr></thead>
                    <tbody>
                      {filteredCandidates.map(cand => (
                        <tr key={cand._id}>
                          <td>{cand.photoUrl ? <Image src={cand.photoUrl} alt={cand.firstName} rounded width={40} height={40} style={{objectFit: 'cover'}}/> : 'N/A'}</td>
                          <td>{cand.firstName} {cand.lastName}</td>
                          <td>{cand.party}</td>
                          <td>{cand.officeSought}</td>
                          <td>{cand.province || 'N/A'}</td>
                          <td>{cand.municipality || 'N/A'}</td>
                          <td>
                            <Badge bg={cand.isActive ? "success" : "secondary"}>
                              {cand.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openEditModal(cand)} disabled={isCurrentElectionActive || actionLoading || statusToggleLoading[cand._id]}>
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant={cand.isActive ? "outline-warning" : "outline-success"} size="sm" className="me-1"
                              onClick={() => handleToggleActiveStatus(cand._id, cand.isActive)}
                              disabled={actionLoading || statusToggleLoading[cand._id]}>
                              {statusToggleLoading[cand._id] ? <Spinner animation="border" size="sm" /> : (cand.isActive ? <i className="fas fa-times-circle"></i> : <i className="fas fa-check-circle"></i>)}
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => openDeleteModal(cand)} disabled={isCurrentElectionActive || actionLoading || statusToggleLoading[cand._id]}>
                              <i className="fas fa-trash-alt"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Add Candidate Modal */}
      <Modal show={showAddModal} onHide={() => !actionLoading && setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agregar Nuevo Candidato</Modal.Title>
        </Modal.Header>
        <Modal.Body>{commonFormFields(newCandidateData, handleInputChange, 'add')}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={actionLoading}>Cancelar</Button>
          <Button variant="primary" onClick={handleAddCandidate} disabled={actionLoading}>
            {actionLoading ? <Spinner as="span" animation="border" size="sm" /> : "Agregar Candidato"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Candidate Modal */}
      <Modal show={showEditModal} onHide={() => !actionLoading && setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editar Candidato: {editingCandidate?.firstName} {editingCandidate?.lastName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{commonFormFields(editCandidateData, handleInputChange, 'edit')}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={actionLoading}>Cancelar</Button>
          <Button variant="primary" onClick={handleEditCandidate} disabled={actionLoading || (isCurrentElectionActive && !(editCandidateData.isActive !== editingCandidate?.isActive && Object.keys(editCandidateData).length === 1)) /* Allow if only isActive is changing */ }>
            {actionLoading ? <Spinner as="span" animation="border" size="sm" /> : "Guardar Cambios"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => !actionLoading && setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Está seguro que desea eliminar al candidato <strong>{candidateToDelete?.firstName} {candidateToDelete?.lastName}</strong>?
          {isCurrentElectionActive && <Alert variant="warning" className="mt-2">Esta elección está activa. La eliminación está deshabilitada.</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={actionLoading}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeleteCandidate} disabled={actionLoading || isCurrentElectionActive}>
            {actionLoading ? <Spinner as="span" animation="border" size="sm" /> : "Eliminar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageCandidates;