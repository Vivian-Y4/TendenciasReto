import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Card, Row, Col, Button, Badge, Alert, Spinner, Tabs, Tab, Table, Modal } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axios from 'axios';
import AdminContext from '../../context/AdminContext';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';

// Este es un componente parcial que luego se combinará con otras partes

const ElectionDetailAdmin = () => {
  const { t } = useTranslation();
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { isAdminAuthenticated, adminPermissions } = useContext(AdminContext);

  // Estados
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modales
  const [showEndElectionModal, setShowEndElectionModal] = useState(false);
  const [showFinalizeResultsModal, setShowFinalizeResultsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Cargar datos de la elección
  const fetchElectionData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/elections/${electionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setElection(response.data.data);
      } else {
        throw new Error(response.data.message || 'Error al cargar datos de la elección');
      }
    } catch (error) {
      console.error('Error fetching election data:', error);
      setError(error.message || 'Error al cargar datos de la elección');
      toast.error(error.message || 'Error al cargar datos de la elección');
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  // Verificar autenticación y permisos, y cargar datos
  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
      return;
    }
    
    if (!adminPermissions.canViewElection) {
      toast.error('No tienes permisos para ver detalles de elecciones');
      navigate('/admin');
      return;
    }
    
    fetchElectionData();
  }, [isAdminAuthenticated, adminPermissions, navigate, fetchElectionData]);

  // Funciones para manejar acciones de la elección
  const handleEndElection = async () => {
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `/api/admin/elections/${electionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Elección finalizada correctamente');
        setShowEndElectionModal(false);
        
        // Actualizar datos de la elección
        await fetchElectionData();
      } else {
        throw new Error(response.data.message || 'Error al finalizar la elección');
      }
    } catch (error) {
      console.error('Error ending election:', error);
      toast.error(error.message || 'Error al finalizar la elección');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeResults = async () => {
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `/api/admin/elections/${electionId}/finalize`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Resultados finalizados correctamente');
        setShowFinalizeResultsModal(false);
        
        // Actualizar datos de la elección
        await fetchElectionData();
      } else {
        throw new Error(response.data.message || 'Error al finalizar los resultados');
      }
    } catch (error) {
      console.error('Error finalizing results:', error);
      toast.error(error.message || 'Error al finalizar los resultados');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteElection = async () => {
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.delete(`/api/admin/elections/${electionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success('Elección eliminada correctamente');
        setShowDeleteModal(false);
        navigate('/admin');
      } else {
        throw new Error(response.data.message || 'Error al eliminar la elección');
      }
    } catch (error) {
      console.error('Error deleting election:', error);
      toast.error(error.message || 'Error al eliminar la elección');
    } finally {
      setActionLoading(false);
    }
  };

  // Componente de carga
  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  // Mensaje de error
  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button
            variant="outline-danger"
            onClick={() => navigate('/admin')}
          >
            Volver al Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  // Si no se encontró la elección
  if (!election) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <Alert.Heading>Elección no encontrada</Alert.Heading>
          <p>La elección solicitada no existe o ha sido eliminada.</p>
          <Button
            variant="outline-primary"
            onClick={() => navigate('/admin')}
          >
            Volver al Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  // Estado de la elección
  const getStatusBadge = () => {
    if (election.resultsFinalized) return <Badge bg="success">Finalizada</Badge>;
    if (hasElectionEnded(election)) return <Badge bg="warning">Terminada</Badge>;
    if (isElectionActive(election)) return <Badge bg="primary">Activa</Badge>;
    return <Badge bg="secondary">Pendiente</Badge>;
  };

  return (
    <Container fluid className="py-4">
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">{election.title}</h2>
          <div className="d-flex align-items-center">
            <span className="me-3">{getStatusBadge()}</span>
            <span className="text-muted">ID: {election._id}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          {!hasElectionEnded(election) && adminPermissions.canEndElection && (
            <Button
              variant="warning"
              onClick={() => setShowEndElectionModal(true)}
            >
              <i className="fas fa-stop-circle me-2"></i>
              Finalizar Elección
            </Button>
          )}
          
          {hasElectionEnded(election) && !election.resultsFinalized && adminPermissions.canFinalizeResults && (
            <Button
              variant="success"
              onClick={() => setShowFinalizeResultsModal(true)}
            >
              <i className="fas fa-check-double me-2"></i>
              Finalizar Resultados
            </Button>
          )}
          
          <Button
            variant="outline-danger"
            onClick={() => setShowDeleteModal(true)}
            disabled={isElectionActive(election) || election.resultsFinalized}
          >
            <i className="fas fa-trash-alt me-2"></i>
            Eliminar
          </Button>
          
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/admin')}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Volver
          </Button>
        </div>
      </div>

      {/* Aquí irá el contenido principal, que será agregado en las siguientes partes */}
    </Container>
  );
};

export default ElectionDetailAdmin;
