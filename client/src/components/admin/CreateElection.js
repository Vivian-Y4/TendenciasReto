import React, { useState, useContext, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
import { PROVINCES } from '../../constants/provinces';

const CreateElection = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    level: '',
    province: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Election title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Election description is required');
      return false;
    }
    if (!formData.startDate || !formData.startTime) {
      setError('Start date and time are required');
      return false;
    }
    if (!formData.endDate || !formData.endTime) {
      setError('End date and time are required');
      return false;
    }
    if (!formData.level) {
      setError('Election level is required');
      return false;
    }
    if (["municipal","senatorial","diputados"].includes((formData.level||'').toLowerCase()) && !formData.province) {
      setError('Debe seleccionar una provincia para elecciones regionales o municipales');
      return false;
    }
    // Calculate timestamps
    const startTimestamp = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
    const endTimestamp = new Date(`${formData.endDate}T${formData.endTime}`).getTime();
    const now = Date.now();
    if (startTimestamp < now) {
      setError('La fecha y hora de inicio no puede ser menor a la fecha y hora actual');
      return false;
    }
    if (endTimestamp <= startTimestamp) {
      setError('La fecha y hora de fin debe ser mayor a la de inicio');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      setError('');
      const startTimestamp = Math.floor(new Date(`${formData.startDate}T${formData.startTime}`).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(`${formData.endDate}T${formData.endTime}`).getTime() / 1000);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3333'}/api/admin/elections`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim(),
            startTime: startTimestamp,
            endTime: endTimestamp,
            level: formData.level,
            province: (formData.level === 'municipal' || formData.level === 'senatorial' || formData.level === 'diputados') ? formData.province : undefined
          })
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to create election');
      toast.success('Election created successfully!');
      navigate('/admin'); // Or to the list of elections
    } catch (error) {
      setError(error.message || 'Failed to create election. Please try again.');
      toast.error(error.message || 'Failed to create election');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      {error && (
        <Alert variant="danger" className="mt-3">{error}</Alert>
      )}
      <h2 className="mb-4">Crear Nueva Elección</h2>
      <Card className="shadow-sm">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <h5 className="mb-3">Detalles de la Elección</h5>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="title">
                  <Form.Label>Título de la Elección</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Ingrese el título de la elección"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="description">
                  <Form.Label>Descripción de la Elección</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Ingrese una descripción detallada"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={6} className="mb-3 mb-md-0">
                <Form.Group controlId="startDate">
                  <Form.Label>Fecha de Inicio</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="startTime">
                  <Form.Label>Hora de Inicio</Form.Label>
                  <Form.Control
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-4">
              <Col md={6} className="mb-3 mb-md-0">
                <Form.Group controlId="endDate">
                  <Form.Label>Fecha de Fin</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="endTime">
                  <Form.Label>Hora de Fin</Form.Label>
                  <Form.Control
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-4">
              <Col md={12}>
                <Form.Group controlId="level">
                  <Form.Label>Nivel de la Elección</Form.Label>
                  <Form.Control
                    as="select"
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccione el nivel</option>
                    <option value="presidencial">Presidencial</option>
                    <option value="senatorial">Senatorial</option>
                    <option value="diputados">Diputados</option>
                    <option value="municipal">Municipal</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
            {['municipal','senatorial','diputados'].includes(formData.level?.toLowerCase()?.trim()) && (
              <Row className="mb-4">
                <Col md={12}>
                  <Form.Group controlId="province">
                    <Form.Label>Provincia</Form.Label>
                    <Form.Control
                      as="select"
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccione una provincia</option>
                      {PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Row>
            )}
            <div className="d-grid gap-2 mt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Creando elección...
                  </>
                ) : (
                  'Crear Elección'
                )}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => navigate('/admin')}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CreateElection;