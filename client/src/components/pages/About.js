import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const About = () => (
  
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col xl={10} lg={10} md={12}>
          <Card className="shadow-lg border-0" style={{ padding: '2.5rem' }}>
            <Card.Body style={{ fontSize: '1.1rem', lineHeight: '1.7' }}>
              <h2 className="text-primary mb-4">Acerca de Nuestra Plataforma de Votación Digital</h2>
              <p>
                Bienvenido a la Plataforma de Votación Digital de la República Dominicana, que aprovecha el poder de la tecnología blockchain
                para garantizar elecciones seguras, transparentes y eficientes. Nuestra plataforma está diseñada para mejorar el proceso democrático
                proporcionando una experiencia de votación confiable y fácil de usar.
              </p>
              <h4 className="mt-4">Características Clave</h4>
              <ul>
                <li>Seguridad Blockchain: Asegura registros de votación a prueba de manipulaciones.</li>
                <li>Transparencia: Todos los votos se registran y verifican en la blockchain.</li>
                <li>Accesibilidad: Fácil acceso para todos los votantes elegibles.</li>
                <li>Resultados en Tiempo Real: Acceso instantáneo a los resultados de las elecciones.</li>
              </ul>
              <h4 className="mt-4">Nuestra Misión</h4>
              <p>
                Nuestra misión es proporcionar un sistema de votación seguro y transparente que mantenga la integridad del proceso electoral
                y empodere a los ciudadanos para ejercer sus derechos democráticos con confianza.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );

export default About;
