import React from 'react';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const Configuration = () => {
  const { t } = useTranslation();

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
          <Button variant="primary">{t('config.save_changes')}</Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Configuration;
