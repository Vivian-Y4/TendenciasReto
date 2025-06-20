import React, { useState, useContext, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, ListGroup, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext'; // Importar AdminContext
import { PROVINCES } from '../../constants/provinces';
import { setupWeb3Provider } from '../../utils/web3Utils';
import { getContractInstance } from '../../utils/contractUtils';

const CreateElection = ({ onElectionCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    electoralLevel: '',
    province: ''
  });

  const [candidates, setCandidates] = useState([]);
  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { connectWalletForAdmin } = useContext(AuthContext); // Obtener función para conectar
  const { isAdminAuthenticated, adminWalletAddress } = useContext(AdminContext); // Usar AdminContext para la autenticación y la dirección del admin

  useEffect(() => {
    if (!isAdminAuthenticated) {
      toast.warn('Acceso denegado. Se requieren privilegios de administrador.');
    }
  }, [isAdminAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddCandidate = () => {
    if (candidateName.trim() && !candidates.includes(candidateName.trim())) {
      setCandidates([...candidates, candidateName.trim()]);
      setCandidateName('');
    } else {
      toast.warn('El nombre del candidato no puede estar vacío o ya existe.');
    }
  };

  const handleRemoveCandidate = (indexToRemove) => {
    setCandidates(candidates.filter((_, index) => index !== indexToRemove));
  };

  const validateForm = () => {
    setError('');
    if (!formData.title.trim() || !formData.description.trim() || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime || !formData.electoralLevel) {
      setError('Todos los campos de la elección son obligatorios.');
      return false;
    }
    if (['Municipal', 'Senatorial', 'Diputados'].includes(formData.electoralLevel) && !formData.province) {
      setError('Debe seleccionar una provincia para el nivel electoral seleccionado.');
      return false;
    }
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    if (startDateTime >= endDateTime) {
      setError('La fecha de fin debe ser posterior a la de inicio.');
      return false;
    }
    if (startDateTime < new Date()) {
      setError('La fecha de inicio no puede ser en el pasado.');
      return false;
    }
    if (candidates.length < 2) {
      setError('Debe añadir al menos dos candidatos a la elección.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // 1. Verificar que la dirección del admin esté configurada
      if (!adminWalletAddress) {
        toast.error('La cuenta de administrador no tiene una dirección de billetera configurada.');
        setError('No se puede crear una elección porque el perfil de administrador no está vinculado a una billetera. Por favor, actualice la configuración.');
        setLoading(false);
        return;
      }

      // 2. Preparar datos y crear la elección en la blockchain
      const startTimestamp = Math.floor(new Date(`${formData.startDate}T${formData.startTime}`).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(`${formData.endDate}T${formData.endTime}`).getTime() / 1000);

      // Conectar con el proveedor y obtener el contrato
      const web3Setup = await setupWeb3Provider();
      if (!web3Setup) throw new Error("No se pudo conectar con la billetera.");
      const { signer } = web3Setup;
      const contract = await getContractInstance(signer);
      if (!contract) throw new Error("No se pudo obtener la instancia del contrato.");

      // Paso 1: Crear la elección sin candidatos
      const createTx = await contract.createElection(
        formData.title,
        formData.description,
        startTimestamp,
        endTimestamp
      );
      toast.info("Creando la elección en la blockchain... por favor espera.");
      const createReceipt = await createTx.wait();

      // Lógica de reintentos para encontrar el evento, manejando la latencia del nodo RPC
      let event = null;
      const retries = 5;
      const delay = 2000; // 2 segundos

      for (let i = 0; i < retries; i++) {
        try {
          const filter = contract.filters.ElectionCreated();
          const logs = await contract.queryFilter(filter, createReceipt.blockNumber);
          const foundEvent = logs.find(log => log.transactionHash === createReceipt.transactionHash);

          if (foundEvent) {
            console.log(`Evento 'ElectionCreated' encontrado en el intento ${i + 1}.`);
            event = foundEvent;
            break; // Salir del bucle si se encuentra el evento
          }
        } catch (e) {
          console.warn(`Intento ${i + 1} para buscar el evento falló:`, e);
        }

        if (i < retries - 1) {
          console.log(`Evento no encontrado, reintentando en ${delay / 1000} segundos...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      let electionId;
      if (event) {
        electionId = event.args.electionId.toNumber();
      } else {
        // Fallback: Si no se encuentra el evento, obtener el ID desde el contador del contrato.
        console.warn("No se pudo encontrar el evento 'ElectionCreated'. Usando método alternativo para obtener el ID.");
        toast.warn("No se pudo verificar el evento. Obteniendo ID desde el estado del contrato.");
        
        const count = await contract.electionCount();
        electionId = count.toNumber() - 1;

        if (electionId < 0) {
          throw new Error("Error crítico: el contador de elecciones es inválido. No se puede continuar.");
        }
        console.log(`ID de elección obtenido por fallback: ${electionId}`);
      }

      // Paso 3: Añadir cada candidato a la elección recién creada en la blockchain
      toast.info(`Añadiendo ${candidates.length} candidatos a la elección #${electionId}...`);
      for (const candidateName of candidates) {
        console.log(`Añadiendo candidato: ${candidateName} a la elección ${electionId}`);
        const addCandidateTx = await contract.addCandidate(electionId, candidateName, ""); // Descripción vacía por ahora
        await addCandidateTx.wait(); // Esperar a que cada candidato sea añadido
        toast.success(`Candidato "${candidateName}" añadido a la elección #${electionId}.`);
      }

      // 4. Notificar al backend sobre la nueva elección
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No se encontró el token de autenticación.');

      const electionDataForBackend = {
        id: electionId,
        title: formData.title,
        description: formData.description,
        startDate: new Date(startTimestamp * 1000).toISOString(),
        endDate: new Date(endTimestamp * 1000).toISOString(),
        electoralLevel: formData.electoralLevel,
        province: formData.province || null,
        candidates: candidates // Send candidates to backend as well
      };

      const response = await fetch('/api/admin/elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(electionDataForBackend),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Error al registrar la elección en el backend.');
      }

      toast.success(`¡Elección #${electionId} creada y registrada con éxito! Todos los candidatos han sido añadidos.`);
      if (onElectionCreated) {
        onElectionCreated(result);
      }

    } catch (err) {
      if (err.code === 4001) { // MetaMask user rejected transaction
        toast.error("Transacción rechazada por el usuario.");
      } else {
        setError(err.message || 'Ocurrió un error inesperado.');
        toast.error(err.message || 'Error al crear la elección');
        console.error("Error en handleSubmit de CreateElection:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    await connectWalletForAdmin();
  };

  return (
    <Container className="my-4">
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Header><Card.Title as="h3">Detalles de la Elección</Card.Title></Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Título</Form.Label><Form.Control type="text" name="title" value={formData.title} onChange={handleInputChange} required /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" name="description" rows={3} value={formData.description} onChange={handleInputChange} required /></Form.Group></Col>
            </Row>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Fecha de Inicio</Form.Label><Form.Control type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Hora de Inicio</Form.Label><Form.Control type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} required /></Form.Group></Col>
            </Row>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Fecha de Fin</Form.Label><Form.Control type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Hora de Fin</Form.Label><Form.Control type="time" name="endTime" value={formData.endTime} onChange={handleInputChange} required /></Form.Group></Col>
            </Row>
            <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nivel Electoral</Form.Label>
                    <Form.Select name="electoralLevel" value={formData.electoralLevel} onChange={handleInputChange} required>
                      <option value="">Seleccione...</option>
                      <option value="Presidencial">Presidencial</option>
                      <option value="Senatorial">Senatorial</option>
                      <option value="Municipal">Municipal</option>
                      <option value="Diputados">Diputados</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                {['Senatorial', 'Municipal', 'Diputados'].includes(formData.electoralLevel) && (
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Provincia</Form.Label>
                      <Form.Select name="province" value={formData.province} onChange={handleInputChange} required>
                        <option value="">Seleccione...</option>
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}
            </Row>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Header><Card.Title as="h3">Gestión de Candidatos</Card.Title></Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Label>Añadir Candidato</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Nombre del candidato"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCandidate())}
                />
                <Button variant="outline-primary" onClick={handleAddCandidate}>Añadir</Button>
              </InputGroup>
            </Form.Group>
            {candidates.length > 0 && (
              <ListGroup className="mt-3">
                {candidates.map((name, index) => (
                  <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                    {name}
                    <Button variant="danger" size="sm" onClick={() => handleRemoveCandidate(index)}>Quitar</Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>

        {error && <Alert variant="danger">{error}</Alert>}

        <div className="d-grid">
          <Button variant="primary" size="lg" type="submit" disabled={loading || !isAdminAuthenticated}>
            {loading ? <><Spinner as="span" animation="border" size="sm" /> Creando Elección...</> : 'Crear Elección y Registrar Candidatos'}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default CreateElection;