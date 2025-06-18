
import React, { useState, useContext, useEffect } from 'react';
import { Card, Button, Container, Row, Col, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ethers } from 'ethers';

const IdLogin = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useContext(AuthContext);
  const [cedula, setCedula] = useState('');
  const [province, setProvince] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Validar formato de la cédula
  const validateCedula = (value) => {
    const cleanValue = value.replace(/[-\s]/g, '');
    if (!/^\d+$/.test(cleanValue)) {
      return false;
    }
    const regex = /^(012|402)\d{8}$/;
    return regex.test(cleanValue) && cleanValue.length === 11;
  };

  const handleCedulaChange = (e) => {
    const value = e.target.value.replace(/[^0-9\-\s]/g, '');
    setCedula(value);
    const cleanValue = value.replace(/[-\s]/g, '');
    let newErrors = {};
    let valid = true;
    if (value.trim() === '') {
      newErrors.cedula = t('auth.id_required');
      valid = false;
    } else if (!/^\d+$/.test(cleanValue)) {
      newErrors.cedula = t('auth.only_numbers');
      valid = false;
    } else if (!validateCedula(cleanValue)) {
      newErrors.cedula = t('auth.invalid_id_format');
      valid = false;
    }
    if (!province) {
      newErrors.province = 'Seleccione una provincia';
      valid = false;
    }
    setErrors(newErrors);
    setIsValid(valid && Object.keys(newErrors).length === 0);
  };

  const handleProvinceChange = (e) => {
    const value = e.target.value;
    setProvince(value);
    let newErrors = {};
    let valid = true;
    const cleanCedula = cedula.replace(/[-\s]/g, '');
    if (!value) {
      newErrors.province = 'Seleccione una provincia';
      valid = false;
    }
    if (!cedula || cedula.trim() === '') {
      newErrors.cedula = t('auth.id_required');
      valid = false;
    } else if (!/^\d+$/.test(cleanCedula)) {
      newErrors.cedula = t('auth.only_numbers');
      valid = false;
    } else if (!validateCedula(cleanCedula)) {
      newErrors.cedula = t('auth.invalid_id_format');
      valid = false;
    }
    setErrors(newErrors);
    setIsValid(valid && Object.keys(newErrors).length === 0);
  };

  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask no detectado. Instala la extensión y recarga la página.');
        return;
      }

      if (!province) {
        setErrors({ province: 'Seleccione una provincia' });
        return;
      }

      // 1. Verifica si ya hay cuentas conectadas
      let accounts = await window.ethereum.request({ method: 'eth_accounts' });

      // 2. Si no hay cuentas, solicita conexión (esto abre MetaMask)
      if (!accounts || accounts.length === 0) {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      }

      if (!accounts || accounts.length === 0) {
        alert('No se encontró ninguna cuenta en MetaMask.');
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      // Pass province along with cedula in login flow (update as needed in parent)
      onLoginSuccess(address, provider, signer, cedula, province);
    } catch (error) {
      if (error.code === 4001) {
        alert('Debes aprobar la conexión en MetaMask.');
      } else {
        alert('Error conectando con MetaMask: ' + (error.message || error));
      }
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <i className="fas fa-vote-yea fa-3x text-primary mb-3"></i>
                <h2>Tu voto R.D.</h2>
                <p className="text-muted">
                  {t('auth.id_verification_prompt')}
                </p>
              </div>
              <Form>
                <Form.Group className="mb-4">
                  <Form.Label>Coloque su cédula</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="012XXXXXXXX o 402XXXXXXXX"
                      value={cedula}
                      onChange={handleCedulaChange}
                      isInvalid={!!errors.cedula}
                      maxLength={13}
                      className="form-control-lg"
                      inputMode="numeric"
                      pattern="[0-9\-\s]*"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.cedula}
                    </Form.Control.Feedback>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    {t('auth.id_format_help')}
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Provincia</Form.Label>
                  <Form.Select
                    value={province}
                    onChange={handleProvinceChange}
                    isInvalid={!!errors.province}
                    className="form-control-lg"
                  >
                    <option value="">Seleccione una provincia</option>
                    <option value="Azua">Azua</option>
                    <option value="Bahoruco">Bahoruco</option>
                    <option value="Barahona">Barahona</option>
                    <option value="Dajabón">Dajabón</option>
                    <option value="Distrito Nacional">Distrito Nacional</option>
                    <option value="Duarte">Duarte</option>
                    <option value="Elías Piña">Elías Piña</option>
                    <option value="El Seibo">El Seibo</option>
                    <option value="Espaillat">Espaillat</option>
                    <option value="Hato Mayor">Hato Mayor</option>
                    <option value="Hermanas Mirabal">Hermanas Mirabal</option>
                    <option value="Independencia">Independencia</option>
                    <option value="La Altagracia">La Altagracia</option>
                    <option value="La Romana">La Romana</option>
                    <option value="La Vega">La Vega</option>
                    <option value="María Trinidad Sánchez">María Trinidad Sánchez</option>
                    <option value="Monseñor Nouel">Monseñor Nouel</option>
                    <option value="Monte Cristi">Monte Cristi</option>
                    <option value="Monte Plata">Monte Plata</option>
                    <option value="Pedernales">Pedernales</option>
                    <option value="Peravia">Peravia</option>
                    <option value="Puerto Plata">Puerto Plata</option>
                    <option value="Samaná">Samaná</option>
                    <option value="San Cristóbal">San Cristóbal</option>
                    <option value="San José de Ocoa">San José de Ocoa</option>
                    <option value="San Juan">San Juan</option>
                    <option value="San Pedro de Macorís">San Pedro de Macorís</option>
                    <option value="Sánchez Ramírez">Sánchez Ramírez</option>
                    <option value="Santiago">Santiago</option>
                    <option value="Santiago Rodríguez">Santiago Rodríguez</option>
                    <option value="Santo Domingo">Santo Domingo</option>
                    <option value="Valverde">Valverde</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.province}
                  </Form.Control.Feedback>
                </Form.Group>
                <Button
                  variant="success"
                  size="lg"
                  className="w-100 mt-3"
                  onClick={handleConnectWallet}
                  disabled={!isValid}
                  type="button"
                >
                  Conectar con MetaMask
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default IdLogin;