"use client";
import { useState, useEffect, useContext, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Alert,
  Spinner,
  Tabs,
  Tab,
  Modal,
  Form,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AdminContext from "../../context/AdminContext";
import { formatTimestamp, formatAddress, isElectionActive, hasElectionEnded } from "../../utils/contractUtils";
import { toast } from "react-toastify";
import StatsDashboard from "./stats/StatsDashboard";
import axios from "axios";
import AssignTokens from './AssignTokens';
import ManageCandidates from './ManageCandidates'; // Ensure this import is correct
import { PROVINCES } from '../../constants/provinces'; // Adjust path if necessary
import deploymentInfo from "../../../../deployment-info.json";

// Helper function for translations (if used)
// function accionEnEspanol(action) { ... }

const AdminDashboard = () => {
  const [elections, setElections] = useState([]);
  const [voterStats, setVoterStats] = useState({ totalRegistered: 0, totalVoted: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For modal actions within AdminDashboard itself
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // Default tab
  const { isAdminAuthenticated, adminPermissions, adminLogout } = useContext(AdminContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const tokenAddressFromDeployment = deploymentInfo.tokenAddress;
  
  // State for Create Election Modal
  const [showCreateElectionModal, setShowCreateElectionModal] = useState(false);
  const [newElectionTitle, setNewElectionTitle] = useState("");
  const [newElectionDescription, setNewElectionDescription] = useState("");
  const [newElectionStartDate, setNewElectionStartDate] = useState("");
  const [newElectionEndDate, setNewElectionEndDate] = useState("");
  const [newElectionStartTime, setNewElectionStartTime] = useState("");
  const [newElectionEndTime, setNewElectionEndTime] = useState("");
  const [newElectionLevel, setNewElectionLevel] = useState("");
  const [newElectionProvince, setNewElectionProvince] = useState("");
  const [newElectionMunicipality, setNewElectionMunicipality] = useState("");

  // State for Edit Election Modal
  const [showEditElectionModal, setShowEditElectionModal] = useState(false);
  const [editElectionId, setEditElectionId] = useState(null);
  const [editElectionTitle, setEditElectionTitle] = useState("");
  const [editElectionDescription, setEditElectionDescription] = useState("");
  const [editElectionStartDate, setEditElectionStartDate] = useState("");
  const [editElectionEndDate, setEditElectionEndDate] = useState("");
  const [editElectionStartTime, setEditElectionStartTime] = useState("");
  const [editElectionEndTime, setEditElectionEndTime] = useState("");
  const [editElectionLevel, setEditElectionLevel] = useState("");
  const [editElectionProvince, setEditElectionProvince] = useState("");
  const [editElectionMunicipality, setEditElectionMunicipality] = useState("");

  const canCreateElection = adminPermissions?.canCreateElection;
  const canManageElections = adminPermissions?.canManageElections;
  const canFinalizeResults = adminPermissions?.canFinalizeResults;

  const fetchElections = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    try {
      const token = localStorage.getItem("adminToken");
      // Ensure REACT_APP_API_URL is used if defined, otherwise use relative path
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await axios.get(`${apiUrl}/api/admin/elections`, { headers: { "x-auth-token": token } });
      setElections(res.data.elections || res.data.data || []);
    } catch (err) {
      setError("Error al cargar las elecciones: " + (err.response?.data?.message || err.message));
    }
  }, [isAdminAuthenticated]);

  const fetchVoterStats = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    try {
      const token = localStorage.getItem("adminToken");
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await axios.get(`${apiUrl}/api/admin/statistics/voters`, { headers: { 'x-auth-token': token } });
      setVoterStats(res.data.data || { totalRegistered: 0, totalVoted: 0 });
    } catch (err) {
      setError("Error al cargar las estadísticas de votantes: " + (err.response?.data?.message || err.message));
    }
  }, [isAdminAuthenticated]);

  const fetchUsers = useCallback(async () => { // For AssignTokens tab
    if (!isAdminAuthenticated) return;
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${apiUrl}/api/wallet/list`); // Assuming this endpoint exists
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toast.error("Error cargando usuarios conectados: " + err.message);
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    setLoading(true);
    setError(""); // Clear previous errors
    Promise.all([fetchElections(), fetchVoterStats(), fetchUsers()])
      .catch(e => {
          console.error("Failed to load initial admin data:", e);
          setError("Error cargando datos iniciales del panel de administrador.");
      })
      .finally(() => setLoading(false));
  }, [isAdminAuthenticated, navigate, fetchElections, fetchVoterStats, fetchUsers]);

  const handleCreateElection = async () => {
    if (!newElectionTitle || !newElectionDescription || !newElectionStartDate || !newElectionEndDate || !newElectionStartTime || !newElectionEndTime || !newElectionLevel) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const payload = {
        title: newElectionTitle.trim(),
        name: newElectionTitle.trim(),
        description: newElectionDescription.trim(),
        startDate: new Date(`${newElectionStartDate}T${newElectionStartTime}`).toISOString(),
        endDate: new Date(`${newElectionEndDate}T${newElectionEndTime}`).toISOString(),
        level: newElectionLevel.toLowerCase(),
      };
      if (newElectionLevel === "senatorial" || newElectionLevel === "diputados" || newElectionLevel === "municipal") {
        payload.province = newElectionProvince.trim();
      }
      if (newElectionLevel === "municipal") {
        payload.municipality = newElectionMunicipality.trim();
      }
      await axios.post(`${apiUrl}/api/admin/elections`, payload, { headers: { "x-auth-token": token } });
      toast.success("Elección creada correctamente");
      setShowCreateElectionModal(false);
      setNewElectionTitle(""); setNewElectionDescription(""); setNewElectionStartDate("");
      setNewElectionEndDate(""); setNewElectionStartTime(""); setNewElectionEndTime(""); setNewElectionLevel("");
      setNewElectionProvince(""); setNewElectionMunicipality(""); // Reset new states
      fetchElections();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al crear la elección");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (election) => {
    setEditElectionId(election._id || election.id);
    setEditElectionTitle(election.title ?? election.name ?? "");
    setEditElectionDescription(election.description ?? "");
    const parseDate = (raw) => {
      if (!raw) return null;
      if (typeof raw === "number" || /^\d+$/.test(raw)) {
        const num = Number(raw);
        return new Date(num > 1e12 ? num : num * 1000);
      }
      return new Date(raw);
    };
    const startObj = parseDate(election.startDate ?? election.startTime);
    const endObj   = parseDate(election.endDate ?? election.endTime);
    if (!startObj || isNaN(startObj.getTime()) || !endObj || isNaN(endObj.getTime())) {
      toast.error("Fecha de elección inválida en los datos recibidos.");
      return;
    }
    setEditElectionStartDate(startObj.toISOString().split("T")[0]);
    setEditElectionStartTime(startObj.toTimeString().substring(0, 5));
    setEditElectionEndDate(endObj.toISOString().split("T")[0]);
    setEditElectionEndTime(endObj.toTimeString().substring(0, 5));
    setEditElectionLevel(election.level ?? "");
    setEditElectionProvince(election.province || "");
    setEditElectionMunicipality(election.municipality || "");
    setShowEditElectionModal(true);
  };

  const handleUpdateElection = async () => {
    if (!editElectionTitle || !editElectionDescription || !editElectionStartDate || !editElectionEndDate || !editElectionStartTime || !editElectionEndTime || !editElectionLevel) {
      toast.error("Por favor completa todos los campos para editar.");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const payload = {
        title: editElectionTitle.trim(),
        description: editElectionDescription.trim(),
        startDate: new Date(`${editElectionStartDate}T${editElectionStartTime}`).toISOString(),
        endDate: new Date(`${editElectionEndDate}T${editElectionEndTime}`).toISOString(),
        level: editElectionLevel.toLowerCase(),
      };
      if (editElectionLevel === "senatorial" || editElectionLevel === "diputados" || editElectionLevel === "municipal") {
        payload.province = editElectionProvince.trim();
      }
      if (editElectionLevel === "municipal") {
        payload.municipality = editElectionMunicipality.trim();
      }
      await axios.put(`${apiUrl}/api/admin/elections/${editElectionId}`, payload, { headers: { "x-auth-token": token } });
      toast.success("Elección actualizada correctamente");
      setShowEditElectionModal(false);
      fetchElections();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al actualizar la elección");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteElection = async (electionId) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta elección?")) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const apiUrl = process.env.REACT_APP_API_URL || '';
      await axios.delete(`${apiUrl}/api/admin/elections/${electionId}`, { headers: { "x-auth-token": token } });
      toast.success("Elección eliminada");
      fetchElections();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al eliminar la elección");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeResults = async (electionId) => {
    if (!window.confirm("¿Estás seguro de que quieres finalizar esta elección? Esta acción es irreversible.")) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const apiUrl = process.env.REACT_APP_API_URL || '';
      await axios.post(`${apiUrl}/api/admin/elections/${electionId}/finalize`, {}, { headers: { "x-auth-token": token } });
      toast.success("Elección finalizada y resultados publicados");
      fetchElections();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al finalizar la elección");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (election) => {
    if (!hasElectionEnded || !isElectionActive) return <Badge bg="light">Estado Desconocido</Badge>; // Guard if helpers not ready
    if (hasElectionEnded(election)) return <Badge bg="danger">Terminada</Badge>;
    if (isElectionActive(election)) return <Badge bg="success">Activa</Badge>;
    return <Badge bg="warning">Pendiente</Badge>;
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" /> <span className="ms-2">Cargando panel...</span>
      </Container>
    );
  }

  if (!isAdminAuthenticated && !loading) { // Check after loading attempt
     navigate("/admin/login"); // Should be handled by useEffect, but as a safeguard
     return null; // Avoid rendering anything if not authenticated
  }

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col><h1>Panel de Administrador</h1></Col>
        <Col className="text-end">
          {isAdminAuthenticated && <Button variant="danger" onClick={adminLogout}>Cerrar Sesión</Button>}
        </Col>
      </Row>

      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="overview" title="Resumen">
          <Row className="mt-3">
            <Col md={4}><Card><Card.Body><Card.Title>Votantes Registrados</Card.Title><Card.Text className="fs-2">{voterStats.totalRegistered}</Card.Text></Card.Body></Card></Col>
            <Col md={4}><Card><Card.Body><Card.Title>Votos Emitidos</Card.Title><Card.Text className="fs-2">{voterStats.totalVoted}</Card.Text></Card.Body></Card></Col>
            <Col md={4}><Card><Card.Body><Card.Title>Elecciones Activas</Card.Title><Card.Text className="fs-2">{elections.filter(e => isElectionActive && isElectionActive(e)).length}</Card.Text></Card.Body></Card></Col>
          </Row>
        </Tab>
        <Tab eventKey="elections" title="Elecciones">
          <div className="d-flex justify-content-between align-items-center my-3">
            <h2>Gestionar Elecciones</h2>
            {adminPermissions?.canCreateElection && <Button onClick={() => setShowCreateElectionModal(true)} disabled={actionLoading}>Crear Elección</Button>}
          </div>
          <Table striped bordered hover responsive>
            <thead>
              <tr><th>ID</th><th>Título</th><th>Fechas</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {elections.map((election) => {
                const eid = election._id || election.id;
                return (
                  <tr key={eid}>
                    <td>{formatAddress(eid)}</td>
                    <td>{election.title || election.name}</td>
                    <td>{formatTimestamp(election.startDate || election.startTime)} - {formatTimestamp(election.endDate || election.endTime)}</td>
                    <td>{getStatusBadge(election)}</td>
                    <td>
                      {adminPermissions?.canManageElections && <Button size="sm" variant="secondary" className="me-1" onClick={() => openEditModal(election)} disabled={actionLoading}>Editar</Button>}
                      {adminPermissions?.canManageElections && <Button size="sm" variant="danger" className="me-1" onClick={() => handleDeleteElection(eid)} disabled={actionLoading}>Eliminar</Button>}
                      {adminPermissions?.canFinalizeResults && <Button size="sm" variant="success" onClick={() => handleFinalizeResults(eid)} disabled={actionLoading || !(hasElectionEnded && hasElectionEnded(election))}>Finalizar</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="candidates" title="Gestionar Candidatos">
          <ManageCandidates
            isElectionActive={isElectionActive}
            hasElectionEnded={hasElectionEnded}
            allElections={elections}
          />
        </Tab>
        <Tab eventKey="stats" title="Estadísticas">
          <StatsDashboard />
        </Tab>
        <Tab eventKey="assignTokens" title="Asignar Tokens">
          <AssignTokens users={users} tokenAddress={tokenAddressFromDeployment} />
        </Tab>
      </Tabs>

      {/* Create Election Modal */}
      <Modal show={showCreateElectionModal} onHide={() => setShowCreateElectionModal(false)} backdrop="static">
        <Modal.Header closeButton><Modal.Title>Crear Nueva Elección</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Título</Form.Label><Form.Control type="text" value={newElectionTitle} onChange={(e) => setNewElectionTitle(e.target.value)} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" rows={3} value={newElectionDescription} onChange={(e) => setNewElectionDescription(e.target.value)} /></Form.Group>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Fecha Inicio</Form.Label><Form.Control type="date" value={newElectionStartDate} onChange={(e) => setNewElectionStartDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3"><Form.Label>Hora Inicio</Form.Label><Form.Control type="time" value={newElectionStartTime} onChange={(e) => setNewElectionStartTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Fecha Fin</Form.Label><Form.Control type="date" value={newElectionEndDate} onChange={(e) => setNewElectionEndDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3"><Form.Label>Hora Fin</Form.Label><Form.Control type="time" value={newElectionEndTime} onChange={(e) => setNewElectionEndTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Nivel</Form.Label><Form.Select value={newElectionLevel} onChange={(e) => {
                const level = e.target.value;
                setNewElectionLevel(level);
                if (level === 'presidencial') {
                    setNewElectionProvince('');
                    setNewElectionMunicipality('');
                } else if (level === 'senatorial' || level === 'diputados') {
                    setNewElectionMunicipality('');
                }
            }}>
                <option value="">Seleccione...</option><option value="presidencial">Presidencial</option>
                <option value="senatorial">Senatorial</option><option value="diputados">Diputados</option>
                <option value="municipal">Municipal</option></Form.Select></Form.Group>

            {(newElectionLevel === "senatorial" || newElectionLevel === "diputados" || newElectionLevel === "municipal") && (
              <Form.Group className="mb-3" controlId="newElectionProvince">
                <Form.Label>Provincia</Form.Label>
                <Form.Select
                  value={newElectionProvince}
                  onChange={(e) => setNewElectionProvince(e.target.value)}
                >
                  <option value="">-- Seleccione Provincia --</option>
                  {PROVINCES.map(provinceName => (
                    <option key={provinceName} value={provinceName}>{provinceName}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {newElectionLevel === "municipal" && (
              <Form.Group className="mb-3" controlId="newElectionMunicipality">
                <Form.Label>Municipio</Form.Label>
                <Form.Control
                  type="text"
                  value={newElectionMunicipality}
                  onChange={(e) => setNewElectionMunicipality(e.target.value)}
                  placeholder="Nombre del municipio"
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateElectionModal(false)} disabled={actionLoading}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreateElection} disabled={actionLoading}>
            {actionLoading ? <><Spinner as="span" animation="border" size="sm" /> Creando...</> : 'Crear'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Election Modal */}
      <Modal show={showEditElectionModal} onHide={() => setShowEditElectionModal(false)} backdrop="static">
        <Modal.Header closeButton><Modal.Title>Editar Elección</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Título</Form.Label><Form.Control type="text" value={editElectionTitle} onChange={(e) => setEditElectionTitle(e.target.value)} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" rows={3} value={editElectionDescription} onChange={(e) => setEditElectionDescription(e.target.value)} /></Form.Group>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Fecha Inicio</Form.Label><Form.Control type="date" value={editElectionStartDate} onChange={(e) => setEditElectionStartDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3"><Form.Label>Hora Inicio</Form.Label><Form.Control type="time" value={editElectionStartTime} onChange={(e) => setEditElectionStartTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Fecha Fin</Form.Label><Form.Control type="date" value={editElectionEndDate} onChange={(e) => setEditElectionEndDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3"><Form.Label>Hora Fin</Form.Label><Form.Control type="time" value={editElectionEndTime} onChange={(e) => setEditElectionEndTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Nivel</Form.Label><Form.Select value={editElectionLevel} onChange={(e) => {
                const level = e.target.value;
                setEditElectionLevel(level);
                if (level === 'presidencial') {
                    setEditElectionProvince('');
                    setEditElectionMunicipality('');
                } else if (level === 'senatorial' || level === 'diputados') {
                    setEditElectionMunicipality('');
                }
            }}>
                <option value="">Seleccione...</option><option value="presidencial">Presidencial</option>
                <option value="senatorial">Senatorial</option><option value="diputados">Diputados</option>
                <option value="municipal">Municipal</option></Form.Select></Form.Group>

            {(editElectionLevel === "senatorial" || editElectionLevel === "diputados" || editElectionLevel === "municipal") && (
              <Form.Group className="mb-3" controlId="editElectionProvince">
                <Form.Label>Provincia</Form.Label>
                <Form.Select
                  value={editElectionProvince}
                  onChange={(e) => setEditElectionProvince(e.target.value)}
                >
                  <option value="">-- Seleccione Provincia --</option>
                  {PROVINCES.map(provinceName => (
                    <option key={provinceName} value={provinceName}>{provinceName}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {editElectionLevel === "municipal" && (
              <Form.Group className="mb-3" controlId="editElectionMunicipality">
                <Form.Label>Municipio</Form.Label>
                <Form.Control
                  type="text"
                  value={editElectionMunicipality}
                  onChange={(e) => setEditElectionMunicipality(e.target.value)}
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditElectionModal(false)} disabled={actionLoading}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpdateElection} disabled={actionLoading}>
            {actionLoading ? <><Spinner as="span" animation="border" size="sm" /> Actualizando...</> : 'Actualizar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;