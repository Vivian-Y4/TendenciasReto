import React from 'react';
import { Container, Row, Col, Card, Accordion } from 'react-bootstrap';

const Help = () => {
  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col xl={10} lg={10} md={12}>
          <Card className="shadow-lg border-0" style={{ padding: '2.5rem' }}>
            <Card.Body style={{ fontSize: '1.1rem', lineHeight: '1.7' }}>
              <h2 className="text-primary mb-4">Ayuda y Soporte</h2>
              <p>
                Si tienes alguna pregunta o necesitas asistencia con la Plataforma de Votación Digital, por favor consulta los siguientes recursos:
              </p>
              <h4 className="mt-4">Preguntas Frecuentes</h4>
              <Accordion flush>
                <Accordion.Item eventKey="0">
                  <Accordion.Header>¿Cómo me registro para votar?</Accordion.Header>
                  <Accordion.Body>
                    Para registrarte debes autenticarte con tu billetera y completar el proceso de verificación de identidad en la sección de registro.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                  <Accordion.Header>¿Qué es la tecnología blockchain?</Accordion.Header>
                  <Accordion.Body>
                    Blockchain es un libro de registros descentralizado e inmutable que garantiza la transparencia y seguridad de todas las transacciones, incluyendo los votos.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="2">
                  <Accordion.Header>¿Cómo se asegura mi voto?</Accordion.Header>
                  <Accordion.Body>
                    Tu voto se cifra y registra en la blockchain, haciendo imposible alterarlo o eliminarlo una vez confirmado.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="3">
                  <Accordion.Header>¿A quién puedo contactar para obtener soporte?</Accordion.Header>
                  <Accordion.Body>
                    Puedes escribirnos a <a href="mailto:support@votingplatform.do">support@votingplatform.do</a> y nuestro equipo te responderá lo antes posible.
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>

              <h4 className="mt-5">Contactar Soporte</h4>
              <p>
                Para más asistencia, por favor contacta a nuestro equipo de soporte en <a href="mailto:support@votingplatform.do">support@votingplatform.do</a>.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Help;
