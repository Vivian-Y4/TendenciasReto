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
import ManageCandidates from './ManageCandidates';

// Helper function for translations
function accionEnEspanol(action) {
  const diccionario = {
    'election_create': 'Elección creada',
    'election_update': 'Elección actualizada',
    'election_delete': 'Elección eliminada',
    'election_finalize': 'Elección finalizada',
    'voter_register': 'Votante registrado',
    'admin_login': 'Inicio de sesión admin',
    'admin_logout': 'Cierre de sesión admin',
  };
  return diccionario[action] || action.replace(/_/g, ' ').toUpperCase();
}

const AdminDashboard = () => {
  const [elections, setElections] = useState([]);
  const [voterStats, setVoterStats] = useState({ totalRegistered: 0, totalVoted: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const { isAdminAuthenticated, adminPermissions, adminLogout } = useContext(AdminContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  
  // State for Create Election Modal
  const [showCreateElectionModal, setShowCreateElectionModal] = useState(false);
  const [newElectionTitle, setNewElectionTitle] = useState("");
  const [newElectionDescription, setNewElectionDescription] = useState("");
  const [newElectionStartDate, setNewElectionStartDate] = useState("");
  const [newElectionEndDate, setNewElectionEndDate] = useState("");
  const [newElectionStartTime, setNewElectionStartTime] = useState("");
  const [newElectionEndTime, setNewElectionEndTime] = useState("");
  const [newElectionLevel, setNewElectionLevel] = useState("");

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

  const canCreateElection = adminPermissions?.canCreateElection;
  const canManageElections = adminPermissions?.canManageElections;
  const canFinalizeResults = adminPermissions?.canFinalizeResults;

  const fetchElections = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.get("/api/admin/elections", { headers: { "x-auth-token": token } });
      setElections(res.data.elections || res.data.data || []);
    } catch (error) {
      setError("Error al cargar las elecciones");
    }
  }, []);

  const fetchVoterStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.get("/api/admin/statistics/voters", { headers: { 'x-auth-token': token } });
      setVoterStats(res.data.data || { totalRegistered: 0, totalVoted: 0 });
    } catch (error) {
      setError("Error al cargar las estadísticas de votantes");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/list");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error("Error cargando usuarios conectados");
    }
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }
    setLoading(true);
    Promise.all([fetchElections(), fetchVoterStats(), fetchUsers()])
      .catch(e => console.error("Failed to load initial data:", e))
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
      const payload = {
        title: newElectionTitle.trim(),
        name: newElectionTitle.trim(), // Ensure 'name' is also sent if the backend uses it
        description: newElectionDescription.trim(),
        startDate: new Date(`${newElectionStartDate}T${newElectionStartTime}`).toISOString(),
        endDate: new Date(`${newElectionEndDate}T${newElectionEndTime}`).toISOString(),
        level: newElectionLevel.toLowerCase(),
        votingAddress: process.env.REACT_APP_VOTING_ADDRESS, // Example of using env var
      };
      await axios.post("/api/admin/elections", payload, { headers: { "x-auth-token": token } });
      toast.success("Elección creada correctamente");
      setShowCreateElectionModal(false);
      // Reset form
      setNewElectionTitle("");
      setNewElectionDescription("");
      setNewElectionStartDate("");
      setNewElectionEndDate("");
      setNewElectionStartTime("");
      setNewElectionEndTime("");
      setNewElectionLevel("");
      fetchElections(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al crear la elección");
    } finally {
      setActionLoading(false);
    }
  };

  // Abre el modal para editar y formatea de forma segura las fechas/horas
  const openEditModal = (election) => {
    setEditElectionId(election._id || election.id);
    setEditElectionTitle(election.title ?? election.name ?? "");
    setEditElectionDescription(election.description ?? "");

    // Los valores de fecha pueden venir como:
    // 1. timestamp en segundos (10 dígitos)
    // 2. timestamp en milisegundos (13 dígitos)
    // 3. string ISO.  
    // Necesitamos manejarlos todos para evitar "Invalid time value".
    const parseDate = (raw) => {
      if (!raw) return null;
      // Numérico o string numérica
      if (typeof raw === "number" || /^\d+$/.test(raw)) {
        const num = Number(raw);
        // Si tiene 13 dígitos ya está en ms, si tiene 10 está en s
        return new Date(num > 1e12 ? num : num * 1000);
      }
      // Si es string ISO o formato fecha reconocible
      return new Date(raw);
    };

    const startObj = parseDate(election.startDate ?? election.startTime);
    const endObj   = parseDate(election.endDate ?? election.endTime);

    // Si alguna fecha es inválida, mostramos error y abortamos apertura del modal
    if (!startObj || isNaN(startObj.getTime()) || !endObj || isNaN(endObj.getTime())) {
      toast.error("Fecha de elección inválida");
      return;
    }

    setEditElectionStartDate(startObj.toISOString().split("T")[0]);
    setEditElectionStartTime(startObj.toTimeString().substring(0, 5));
    setEditElectionEndDate(endObj.toISOString().split("T")[0]);
    setEditElectionEndTime(endObj.toTimeString().substring(0, 5));

    setEditElectionLevel(election.level ?? "");
    setShowEditElectionModal(true);
  };

  const handleUpdateElection = async () => {
    if (!editElectionTitle || !editElectionDescription || !editElectionStartDate || !editElectionEndDate || !editElectionStartTime || !editElectionEndTime || !editElectionLevel) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const payload = {
        title: editElectionTitle.trim(),
        description: editElectionDescription.trim(),
        startDate: new Date(`${editElectionStartDate}T${editElectionStartTime}`).toISOString(),
        endDate: new Date(`${editElectionEndDate}T${editElectionEndTime}`).toISOString(),
        level: editElectionLevel.toLowerCase(),
      };
      await axios.put(`/api/admin/elections/${editElectionId}`, payload, { headers: { "x-auth-token": token } });
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
      await axios.delete(`/api/admin/elections/${electionId}`, { headers: { "x-auth-token": token } });
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
      await axios.post(`/api/admin/elections/${electionId}/finalize`, {}, { headers: { "x-auth-token": token } });
      toast.success("Elección finalizada y resultados publicados");
      fetchElections();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al finalizar la elección");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (election) => {
    if (hasElectionEnded(election)) return <Badge bg="danger">Terminada</Badge>;
    if (isElectionActive(election)) return <Badge bg="success">Activa</Badge>;
    return <Badge bg="warning">Pendiente</Badge>;
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col><h1>Panel de Administrador</h1></Col>
        <Col className="text-end"><Button variant="danger" onClick={adminLogout}>Cerrar Sesión</Button></Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="overview" title="Resumen">
          <Row>
            <Col md={4}><Card><Card.Body><Card.Title>Votantes Registrados</Card.Title><Card.Text className="fs-2">{voterStats.totalRegistered}</Card.Text></Card.Body></Card></Col>
            <Col md={4}><Card><Card.Body><Card.Title>Votos Emitidos</Card.Title><Card.Text className="fs-2">{voterStats.totalVoted}</Card.Text></Card.Body></Card></Col>
            <Col md={4}><Card><Card.Body><Card.Title>Elecciones Activas</Card.Title><Card.Text className="fs-2">{elections.filter(isElectionActive).length}</Card.Text></Card.Body></Card></Col>
          </Row>
        </Tab>
        <Tab eventKey="elections" title="Elecciones">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Gestionar Elecciones</h2>
            <Button onClick={() => setShowCreateElectionModal(true)} disabled={!canCreateElection}>Crear Elección</Button>
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
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(election)} disabled={!canManageElections}>Editar</Button>{" "}
                      <Button size="sm" variant="danger" onClick={() => handleDeleteElection(eid)} disabled={!canManageElections}>Eliminar</Button>{" "}
                      <Button size="sm" variant="success" onClick={() => handleFinalizeResults(eid)} disabled={!canFinalizeResults || !hasElectionEnded(election)}>Finalizar</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="stats" title="Estadísticas"><StatsDashboard /></Tab>
        <Tab eventKey="assignTokens" title="Asignar Tokens"><AssignTokens users={users} /></Tab>
        <Tab eventKey="stats" title="Estadísticas"><StatsDashboard /></Tab>
        <Tab eventKey="assignTokens" title="Asignar Tokens"><AssignTokens users={users} /></Tab>
        <Tab eventKey="candidates" title="Gestionar Candidatos">
          <ManageCandidates
            isElectionActive={isElectionActive}
            hasElectionEnded={hasElectionEnded}
            allElections={elections}
          />
        </Tab>

      {/* Create Election Modal */}
      <Modal show={showCreateElectionModal} onHide={() => setShowCreateElectionModal(false)}>
        <Modal.Header closeButton><Modal.Title>Crear Nueva Elección</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="newElectionTitle"><Form.Label>Título</Form.Label><Form.Control type="text" value={newElectionTitle} onChange={(e) => setNewElectionTitle(e.target.value)} /></Form.Group>
            <Form.Group className="mb-3" controlId="newElectionDescription"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" rows={3} value={newElectionDescription} onChange={(e) => setNewElectionDescription(e.target.value)} /></Form.Group>
            <Row>
              <Col><Form.Group className="mb-3" controlId="newElectionStartDate"><Form.Label>Fecha Inicio</Form.Label><Form.Control type="date" value={newElectionStartDate} onChange={(e) => setNewElectionStartDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3" controlId="newElectionStartTime"><Form.Label>Hora Inicio</Form.Label><Form.Control type="time" value={newElectionStartTime} onChange={(e) => setNewElectionStartTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Row>
              <Col><Form.Group className="mb-3" controlId="newElectionEndDate"><Form.Label>Fecha Fin</Form.Label><Form.Control type="date" value={newElectionEndDate} onChange={(e) => setNewElectionEndDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3" controlId="newElectionEndTime"><Form.Label>Hora Fin</Form.Label><Form.Control type="time" value={newElectionEndTime} onChange={(e) => setNewElectionEndTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3" controlId="newElectionLevel"><Form.Label>Nivel</Form.Label><Form.Select value={newElectionLevel} onChange={(e) => setNewElectionLevel(e.target.value)}><option value="">Seleccione...</option><option value="presidencial">Presidencial</option><option value="senatorial">Senatorial</option><option value="diputados">Diputados</option><option value="municipal">Municipal</option></Form.Select></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateElectionModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreateElection} disabled={actionLoading}>{actionLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Crear'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Election Modal */}
      <Modal show={showEditElectionModal} onHide={() => setShowEditElectionModal(false)}>
        <Modal.Header closeButton><Modal.Title>Editar Elección</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="editElectionTitle"><Form.Label>Título</Form.Label><Form.Control type="text" value={editElectionTitle} onChange={(e) => setEditElectionTitle(e.target.value)} /></Form.Group>
            <Form.Group className="mb-3" controlId="editElectionDescription"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" rows={3} value={editElectionDescription} onChange={(e) => setEditElectionDescription(e.target.value)} /></Form.Group>
            <Row>
              <Col><Form.Group className="mb-3" controlId="editElectionStartDate"><Form.Label>Fecha Inicio</Form.Label><Form.Control type="date" value={editElectionStartDate} onChange={(e) => setEditElectionStartDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3" controlId="editElectionStartTime"><Form.Label>Hora Inicio</Form.Label><Form.Control type="time" value={editElectionStartTime} onChange={(e) => setEditElectionStartTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Row>
              <Col><Form.Group className="mb-3" controlId="editElectionEndDate"><Form.Label>Fecha Fin</Form.Label><Form.Control type="date" value={editElectionEndDate} onChange={(e) => setEditElectionEndDate(e.target.value)} /></Form.Group></Col>
              <Col><Form.Group className="mb-3" controlId="editElectionEndTime"><Form.Label>Hora Fin</Form.Label><Form.Control type="time" value={editElectionEndTime} onChange={(e) => setEditElectionEndTime(e.target.value)} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3" controlId="editElectionLevel"><Form.Label>Nivel</Form.Label><Form.Select value={editElectionLevel} onChange={(e) => setEditElectionLevel(e.target.value)}><option value="">Seleccione...</option><option value="presidencial">Presidencial</option><option value="senatorial">Senatorial</option><option value="diputados">Diputados</option><option value="municipal">Municipal</option></Form.Select></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditElectionModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpdateElection} disabled={actionLoading}>{actionLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Actualizar'}</Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default AdminDashboard;