import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Container, Row, Col, Form, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AdminContext from '../../context/AdminContext';

const AdminLogin = () => {
  const [activeTab, setActiveTab] = useState('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Usa el método del contexto
  const { isAdminAuthenticated, adminLoading, adminLogin } = useContext(AdminContext);

  useEffect(() => {
    if (!adminLoading && isAdminAuthenticated) {
      navigate('/admin');
    }
  }, [isAdminAuthenticated, adminLoading, navigate]);

  const handleUsernameChange = (e) => setUsername(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!username || !password) {
      setError('Por favor ingrese usuario y contraseña');
      setIsLoading(false);
      return;
    }

    try {
      // Usa el método del contexto para login
      const result = await adminLogin(username, password);

      if (!result.success) {
        throw new Error(result.error || 'Error de autenticación');
      }

      toast.success('Inicio de sesión exitoso');
      navigate('/admin'); // Redirige inmediatamente después del login exitoso
    } catch (error) {
      console.error('Error de login:', error);
      setError(error.message || 'Error en la autenticación');
      toast.error(error.message || 'Error en la autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center py-3">
              <h2>Panel de Administración</h2>
            </Card.Header>
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                <Tab eventKey="credentials" title="Credenciales">
                  <Form onSubmit={handleCredentialsLogin}>
                    <Alert variant="info" className="mb-3">
                      Iniciar sesión como administrador
                    </Alert>
                    <Form.Group className="mb-3">
                      <Form.Label>Usuario</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ingrese su nombre de usuario (katriel)"
                        value={username}
                        onChange={handleUsernameChange}
                        disabled={isLoading}
                      />
                    </Form.Group>
                    <Form.Group className="mb-4">
                      <Form.Label>Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Ingrese su contraseña"
                        value={password}
                        onChange={handlePasswordChange}
                        disabled={isLoading}
                      />
                    </Form.Group>
                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Iniciando sesión...
                        </>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>
                  </Form>
                </Tab>
              </Tabs>
              <div className="mt-4 text-center">
                <p className="text-muted">
                  Panel exclusivo para administradores. Si no es administrador, por favor vuelva a la{' '}
                  <a href="/">página principal</a>.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminLogin;