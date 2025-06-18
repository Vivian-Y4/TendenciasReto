import React, { useState, useEffect } from 'react';
import { Card, Button, Container, Row, Col, Alert, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Redirigir a la nueva página de login con cédula
    navigate('/id-login');
    // Set checking to false since we're just redirecting
    setIsChecking(false);
  }, [navigate]);

  const handleUserNameChange = (e) => {
    setUserName(e.target.value);
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError('');

    // Redirigir al nuevo flujo de autenticación con cédula
    navigate('/id-login');
    setIsLoading(false);
  };

  // Si aún está verificando la conexión de la wallet, mostrar cargando
  if (isChecking) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">{t('common.loading')}</span>
        </Spinner>
        <p className="mt-3">{t('auth.checking_wallet')}</p>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <i className="fas fa-wallet fa-3x text-primary mb-3"></i>
                <h2>{t('auth.connect_wallet')}</h2>
                <p className="text-muted">
                  {t('auth.connect_prompt')}
                </p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form.Group className="mb-3">
                <Form.Label>{t('auth.your_name')}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t('auth.enter_name')}
                  value={userName}
                  onChange={handleUserNameChange}
                  maxLength={50}
                />
                <Form.Text className="text-muted">
                  {t('auth.name_help_text')}
                </Form.Text>
              </Form.Group>
              
              <Button 
                variant="primary" 
                size="lg" 
                className="mb-4 w-100 d-flex align-items-center justify-content-center"
                onClick={connectWallet}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {t('auth.connecting')}
                  </>
                ) : (
                  <>
                    <img 
                      src="https://metamask.io/images/metamask-fox.svg" 
                      alt="MetaMask" 
                      style={{ height: '24px', marginRight: '10px' }} 
                    />
                    {t('auth.connect_button')}
                  </>
                )}
              </Button>
              
              <div className="text-center mt-4">
                <h5>{t('auth.why_connect')}</h5>
                <p className="small">
                  {t('auth.why_text')}
                </p>
                <hr />
                <p className="mb-0 text-muted small">
                  {t('auth.no_wallet')} <a href="https://metamask.io/" target="_blank" rel="noreferrer">{t('auth.install_metamask')}</a>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
