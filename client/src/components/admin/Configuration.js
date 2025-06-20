import React, { useState, useContext, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import AdminContext from '../../context/AdminContext';
import { toast } from 'react-toastify';

const Configuration = () => {
  const { t } = useTranslation();
  const { adminWalletAddress, updateAdminWallet } = useContext(AdminContext);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    if (adminWalletAddress) {
      setWalletAddress(adminWalletAddress);
    }
  }, [adminWalletAddress]);

  const handleWalletSave = async () => {
    if (!walletAddress.trim()) {
      toast.error('Por favor, introduce una dirección de billetera válida.');
      return;
    }
    const result = await updateAdminWallet(walletAddress.trim());
    if (result.success) {
      toast.success('¡La dirección de la billetera se ha actualizado correctamente!');
    } else {
      toast.error(`Error al actualizar la billetera: ${result.error}`);
    }
  };

  return (
    <Container className="my-5">
      <Card className="shadow-sm">
        <Card.Header>
          <h5>{t('config.title')}</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6} className="mb-4">
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>{t('config.theme_customization')}</Card.Title>
                  <Form>
                    <Form.Group controlId="customThemes">
                      <Form.Label>{t('config.custom_themes')}</Form.Label>
                      <Form.Control type="text" placeholder={t('config.enter_theme_name')} />
                      <Button variant="secondary" className="mt-2">{t('config.apply_theme')}</Button>
                    </Form.Group>
                    <Form.Group controlId="presetThemes">
                      <Form.Label>{t('config.preset_themes')}</Form.Label>
                      <Form.Control as="select">
                        <option>{t('config.theme_corporate')}</option>
                        <option>{t('config.theme_casual')}</option>
                      </Form.Control>
                    </Form.Group>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-4">
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>{t('config.accessibility_enhancements')}</Card.Title>
                  <Form>
                    <Form.Group controlId="keyboardNavigation">
                      <Form.Check type="checkbox" label={t('config.enable_keyboard_navigation')} />
                    </Form.Group>
                    <Form.Group controlId="screenReaderCompatibility">
                      <Form.Check type="checkbox" label={t('config.ensure_screen_reader_compatibility')} />
                    </Form.Group>
                    <Form.Group controlId="colorBlindMode">
                      <Form.Check type="checkbox" label={t('config.provide_color_blind_mode')} />
                    </Form.Group>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mt-4">
            <Col md={12}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>Configuración de la Billetera del Administrador</Card.Title>
                  <Form onSubmit={(e) => { e.preventDefault(); handleWalletSave(); }}>
                    <Form.Group controlId="adminWalletAddress">
                      <Form.Label>Dirección de la Billetera</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Pega la dirección de tu billetera de administrador aquí"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                      />
                    </Form.Group>
                    <Button variant="primary" className="mt-3" onClick={handleWalletSave}>Guardar Dirección de Billetera</Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="mt-4 text-end">
            <Button variant="primary">{t('config.save_changes')}</Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Configuration;
