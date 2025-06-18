import React, { useState, useContext, useEffect } from 'react';
import { Card, Button, Container, Row, Col, Alert, Spinner, Form } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { isWalletConnected, getConnectedAddress, setupWeb3Provider } from '../../utils/web3Utils';

const ConnectWallet = () => {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Recuperar la cédula del estado de navegación
  const initialCedula = location.state?.cedula || '';
  console.log('Recibiendo cédula del estado:', initialCedula);
  
  const [cedula, setCedula] = useState(initialCedula);
  const [isValidCedula, setIsValidCedula] = useState(false);

  useEffect(() => {
    // Inicializar con la cédula que viene del estado (si existe)
    if (initialCedula) {
      console.log('Inicializando con cédula:', initialCedula);
      setCedula(initialCedula);
      const isValid = validateCedulaFormat(initialCedula);
      console.log('Cédula válida:', isValid);
    } else {
      console.warn('No se encontró cédula en el estado, redirigiendo a login');
      // Si no hay cédula inicial, redirigimos a la página de login de cédula
      navigate('/id-login');
      return;
    }

    const checkWalletConnection = async () => {
      try {
        // Si ya está autenticado en el contexto, redirigir a home
        if (isAuthenticated) {
          navigate('/');
          return;
        }
        
        // Imprimir la cédula para verificar que está presente
        console.log('Cédula actual durante la inicialización:', cedula);

        // Verificar si la wallet está conectada
        const isConnected = await isWalletConnected();
        if (isConnected) {
          const address = await getConnectedAddress();
          
          // Verificar si tenemos una sesión guardada para esta dirección
          const storedAddress = authService.getSavedAddress();
          const token = authService.getAuthToken();
          
          if (address && storedAddress && address.toLowerCase() === storedAddress.toLowerCase() && token) {
            // Si las direcciones coinciden y tenemos un token, login automático
            login(address, token);
            toast.success(t('auth.auto_connected'));
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Error al verificar conexión de wallet:', error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkWalletConnection();
  }, [isAuthenticated, login, navigate, t, initialCedula, cedula]);

  // Validar formato de la cédula
  const validateCedulaFormat = (value) => {
    console.log('Validando formato de cédula:', value);
    
    if (!value) {
      console.error('Valor de cédula vacío');
      setIsValidCedula(false);
      return false;
    }
    
    // Eliminar guiones y espacios
    const cleanValue = value.toString().replace(/[-\s]/g, '');
    console.log('Cédula limpia para validación:', cleanValue);
    
    // Verificar que solo contiene números
    if (!/^\d+$/.test(cleanValue)) {
      console.error('La cédula contiene caracteres no numéricos:', cleanValue);
      setIsValidCedula(false);
      return false;
    }
    
    // Verificar que comienza con 012 o 402 y tiene exactamente 11 dígitos
    const regex = /^(012|402)\d{8}$/;
    const isValid = regex.test(cleanValue) && cleanValue.length === 11;
    
    console.log('Resultado de validación de cédula:', isValid, 'Longitud:', cleanValue.length);
    setIsValidCedula(isValid);
    return isValid;
  };

  const handleCedulaChange = (e) => {
    // Solo permitir números, guiones y espacios
    const value = e.target.value.replace(/[^0-9\-\s]/g, '');
    setCedula(value);
    validateCedulaFormat(value);
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError('');

    // Verificar que tengamos una cédula válida
    console.log('Intentando conectar con cédula:', cedula);
    
    if (!cedula) {
      console.error('Cédula vacía antes de conectar');
      setError('Por favor ingrese una cédula válida');
      setIsLoading(false);
      return;
    }
    
    if (!isValidCedula) {
      console.error('Cédula inválida antes de conectar:', cedula);
      setError('Cédula inválida. Debe comenzar con 012 o 402 y tener 11 dígitos.');
      setIsLoading(false);
      return;
    }
    
    try {
      // Verificar conexión de MetaMask
      const web3Setup = await setupWeb3Provider();
      if (!web3Setup) {
        setError('No se pudo conectar a MetaMask');
        setIsLoading(false);
        return;
      }

      // Obtener dirección de la billetera
      const address = await getConnectedAddress();
      if (!address) {
        setError('No se pudo obtener la dirección de la billetera');
        setIsLoading(false);
        return;
      }

      // Asegurarnos de que la cédula existe y es válida
      if (!cedula) {
        throw new Error('Cédula no proporcionada');
      }
      
      // Limpiar la cédula antes de enviarla
      const cleanCedula = cedula.replace(/[-\s]/g, '');
      console.log('Cédula limpia a enviar:', cleanCedula);
      
      // Verificar una última vez el formato de la cédula
      const cedulaRegex = /^(012|402)\d{8}$/;
      if (!cedulaRegex.test(cleanCedula)) {
        throw new Error('Formato de cédula inválido');
      }
      
      // Generar un nombre por defecto si no hay uno proporcionado
      const defaultName = `Usuario ${new Date().getTime().toString().slice(-4)}`;
      
      // Usar el servicio de autenticación para conectar la wallet
      console.log('Enviando al servicio:', { name: defaultName, cedula: cleanCedula });
      const result = await authService.connectWallet(defaultName, cleanCedula);
      
      if (!result.success) {
        throw new Error(result.error || t('auth.connection_failed'));
      }
      
      // Login exitoso - usar la función login del contexto para actualizar el estado de la app
      login(result.address, result.token, result.name);
      authService.saveSession(result.address, result.token, result.name);
      
      toast.success(t('auth.connection_success'));
      navigate('/');
    } catch (error) {
      console.error('Error de login:', error);
      setError(error.message || t('auth.generic_error'));
      toast.error(error.message || t('auth.generic_error'));
    } finally {
      setIsLoading(false);
    }
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
                <Alert variant="info" className="mt-2">
                  {t('auth.id_verified')}: <strong>{cedula}</strong>
                </Alert>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form.Group className="mb-3">
                <Form.Label>Coloque su cédula</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="012XXXXXXXX o 402XXXXXXXX"
                  value={cedula}
                  onChange={handleCedulaChange}
                  isInvalid={cedula.length > 0 && !isValidCedula}
                  maxLength={13}
                  inputMode="numeric"
                  pattern="[0-9\-\s]*"
                />
                {cedula.length > 0 && !isValidCedula && (
                  <Form.Control.Feedback type="invalid">
                    {t('auth.invalid_id_format')}
                  </Form.Control.Feedback>
                )}
                <Form.Text className="text-muted">
                  {t('auth.id_format_help')}
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
              
              <div className="text-center mt-3">
                <Button 
                  variant="link" 
                  className="text-decoration-none" 
                  onClick={() => navigate('/id-login')}
                >
                  {t('auth.use_different_id')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ConnectWallet;
