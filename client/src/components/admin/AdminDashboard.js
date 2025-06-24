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
import ManageElections from './ManageElections';
import CreateElection from './CreateElection';
import { PROVINCES } from '../../constants/provinces';
import { setupWeb3Provider } from "../../utils/web3Utils";
import { getContractInstance } from "../../utils/contractUtils";

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
  // const [elections, setElections] = useState([]);
  const [voterStats, setVoterStats] = useState({ totalRegistered: 0, totalVoted: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const { isAdminAuthenticated, adminPermissions, adminLogout } = useContext(AdminContext);
  const navigate = useNavigate();
  // Dirección del contrato ERC-20.  Soportamos ambas variables de entorno por compatibilidad.
  const tokenAddress =
    process.env.REACT_APP_TOKEN_ADDRESS ||
    process.env.REACT_APP_TOKEN_CONTRACT_ADDRESS ||
    '';
  const [users, setUsers] = useState([]); // Se mantiene por compatibilidad futura, aunque no se usa en AssignTokens

  // State for Modals
  const [showCreateElectionModal, setShowCreateElectionModal] = useState(false);
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

  const canCreateElection = adminPermissions?.canCreateElection;
  const canManageElections = adminPermissions?.canManageElections;
  const canFinalizeResults = adminPermissions?.canFinalizeResults;

  const fetchElections = useCallback(async () => {
    // La funcionalidad de listar elecciones aquí ha sido desactivada.
    // La creación y gestión se maneja en la pestaña 'Crear Elección'.
    console.log("fetchElections está desactivado en el AdminDashboard.");
  }, []);

  const fetchVoterStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("No se encontró el token de administrador.");
      }
      const res = await axios.get("/api/admin/statistics/voters", { headers: { 'x-auth-token': token } });
      setVoterStats(res.data.data || { totalRegistered: 0, totalVoted: 0 });
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Ocurrió un error desconocido";
      // No sobreescribir el error principal de las elecciones si ya existe
      setError(prevError => prevError ? `${prevError} | ${errorMessage}` : `Error de estadísticas: ${errorMessage}`);
      toast.warn(`No se pudieron cargar las estadísticas: ${errorMessage}`);
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
    Promise.all([fetchVoterStats(), fetchUsers()])
      .catch(e => console.error("Failed to load initial data:", e))
      .finally(() => setLoading(false));
  }, [isAdminAuthenticated, navigate, fetchElections, fetchVoterStats, fetchUsers]);

  const handleUpdateElection = async () => {
    if (!editElectionTitle || !editElectionDescription || !editElectionStartDate || !editElectionEndDate || !editElectionStartTime || !editElectionEndTime || !editElectionLevel || (['Senatorial', 'Municipal', 'Diputados'].includes(editElectionLevel) && !editElectionProvince)) {
      toast.error("Por favor completa todos los campos, incluyendo la provincia si es necesario.");
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
        electoralLevel: editElectionLevel,
        province: ['Senatorial', 'Municipal', 'Diputados'].includes(editElectionLevel) ? editElectionProvince : undefined,
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
    setActionLoading(true);
    try {
        // 1. Conectar a la blockchain con un signer para autorizar la transacción
        const web3Setup = await setupWeb3Provider();
        if (!web3Setup) {
            throw new Error("No se pudo conectar con la billetera para finalizar la elección.");
        }
        const { provider, signer } = web3Setup;
        const contract = await getContractInstance(provider, signer);
        if (!contract) {
            throw new Error("No se pudo obtener la instancia del contrato.");
        }

        // 2. Llamar a la función endElection del contrato
        const tx = await contract.endElection(electionId);
        toast.info("Procesando finalización en la blockchain... por favor espera.");
        
        // 3. Esperar a que la transacción sea minada y confirmada
        await tx.wait();

        toast.success("Elección finalizada con éxito en la blockchain.");
        fetchElections(); // Refrescar la lista para mostrar el nuevo estado

    } catch (error) {
        if (error.code === 4001) { // Error de MetaMask si el usuario rechaza la transacción
             toast.error("Transacción rechazada por el usuario.");
        } else {
            const msg = error?.data?.message || error.message || "Error al finalizar la elección en la blockchain.";
            toast.error(msg);
            console.error("Error en handleFinalizeResults:", error);
        }
    } finally {
        setActionLoading(false);
    }
  };

  const getStatusBadge = (election) => {
    if (hasElectionEnded(election)) return <Badge bg="danger">Terminada</Badge>;
    if (isElectionActive(election)) return <Badge bg="success">Activa</Badge>;
    return <Badge bg="warning">Pendiente</Badge>;
  };

  const openEditModal = (election) => {
    setEditElectionId(election._id || election.id);
    setEditElectionTitle(election.title ?? election.name ?? "");

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

    setEditElectionLevel(election.electoralLevel ?? "");
    setEditElectionProvince(election.province ?? "");
    setShowEditElectionModal(true);
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
          <Card className="mt-3">
            <Card.Body>
              <Card.Title>Resumen General</Card.Title>
              <Row>

                <Col md={4}>
                  <Card bg="light" text="dark" className="mb-2">
                    <Card.Body>
                      <Card.Title>{voterStats.totalRegistered}</Card.Title>
                      <Card.Text>Votantes Registrados</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card bg="light" text="dark" className="mb-2">
                    <Card.Body>
                      <Card.Title>{voterStats.totalVoted}</Card.Title>
                      <Card.Text>Votos Emitidos</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <hr />
              <h5>Acciones Rápidas</h5>
              {canCreateElection && (
                <Button
                  variant="primary"
                  onClick={() => setShowCreateElectionModal(true)}
                  className="me-2"
                >
                  <i className="fas fa-plus-circle me-2"></i>Crear Nueva Elección
                </Button>
              )}
               <Button variant="info" onClick={() => navigate("/admin/configuration")} className="me-2">
                <i className="fas fa-cog me-2"></i>Ir a Configuración
              </Button>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="elections" title="Gestionar Elecciones">
          <ManageElections />
        </Tab>

        <Tab eventKey="stats" title="Estadísticas"><StatsDashboard /></Tab>
        <Tab eventKey="createElection" title="Crear Elección">
          <CreateElection onElectionCreated={() => {
            toast.success("¡Elección creada con éxito!");
            // Opcional: cambiar a otra pestaña o refrescar datos si es necesario
            setActiveTab('overview');
          }} />
        </Tab>
        <Tab eventKey="assignTokens" title="Asignar Tokens">
          <AssignTokens tokenAddress={tokenAddress} />
        </Tab>
      </Tabs>

      {/* Create Election Modal */}
      <Modal show={showCreateElectionModal} onHide={() => setShowCreateElectionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Crear Nueva Elección</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CreateElection
            onElectionCreated={() => {
              toast.success("¡Elección creada con éxito! Actualizando lista...");
              setShowCreateElectionModal(false);
              fetchElections();
            }}
          />
        </Modal.Body>
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
            <Form.Group className="mb-3" controlId="editElectionLevel">
              <Form.Label>Nivel Electoral</Form.Label>
              <Form.Control as="select" value={editElectionLevel} onChange={(e) => setEditElectionLevel(e.target.value)} required>
                <option value="">Seleccione un nivel</option>
                <option value="Presidencial">Presidencial</option>
                <option value="Senatorial">Senatorial</option>
                <option value="Municipal">Municipal</option>
                <option value="Diputados">Diputados</option>
              </Form.Control>
            </Form.Group>
            {['Senatorial','Diputados', 'Municipal'].includes(editElectionLevel) && (
              <Form.Group className="mb-3">
                <Form.Label>Provincia</Form.Label>
                <Form.Control as="select" value={editElectionProvince} onChange={(e) => setEditElectionProvince(e.target.value)} required>
                  <option value="">Seleccione una provincia</option>
                  {PROVINCES.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </Form.Control>
              </Form.Group>
            )}
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