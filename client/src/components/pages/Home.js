import React, { useContext } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const { t } = useTranslation();

  return (
    <Container>
      <Row className="mb-5">
        <Col md={12} className="text-center">
          <h1 className="display-4 mb-4">{t('home.title')}</h1>
          <p className="lead">
            {t('home.subtitle')}
          </p>
          <div className="d-flex gap-3 justify-content-center">
            {!isAuthenticated && (
              <Button as={Link} to="/login" variant="primary" size="lg" className="mt-3">
                {t('home.connect_button')}
              </Button>
            )}
            {!isAuthenticated && !isAdmin && (
  <Button
    as={Link}
    to="/admin-login"
    variant="secondary"
    size="lg"
    className="mt-3"
  >
    Acceso Administrador
  </Button>
)}
          </div>
        </Col>
      </Row>

      <Row className="mb-5">
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="text-center mb-3">
                <i className="fas fa-shield-alt fa-3x text-primary"></i>
              </div>
              <Card.Title className="text-center">{t('home.features.auth_title')}</Card.Title>
              <Card.Text>
                {t('home.features.auth_text')}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="text-center mb-3">
                <i className="fas fa-vote-yea fa-3x text-primary"></i>
              </div>
              <Card.Title className="text-center">{t('home.features.voting_title')}</Card.Title>
              <Card.Text>
                {t('home.features.voting_text')}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="text-center mb-3">
                <i className="fas fa-eye-slash fa-3x text-primary"></i>
              </div>
              <Card.Title className="text-center">{t('home.features.privacy_title')}</Card.Title>
              <Card.Text>
                {t('home.features.privacy_text')}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-5">
        <Col md={6} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>{t('home.participate.title')}</Card.Title>
              <Card.Text>
                {t('home.participate.text')}
              </Card.Text>
              <Button as={Link} to="/elections" variant="outline-primary">
                {t('home.participate.button')}
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>
                {isAdmin ? t('home.admin_section.title') : t('home.results_section.title')}
              </Card.Title>
              <Card.Text>
                {isAdmin
                  ? t('home.admin_section.text')
                  : t('home.results_section.text')}
              </Card.Text>
              <Button
                as={Link}
                to={isAdmin ? '/admin' : '/elections'}
                variant="outline-primary"
              >
                {isAdmin ? t('home.admin_section.button') : t('home.results_section.button')}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-5">
        <Col md={12}>
          <Card className="bg-light">
            <Card.Body className="text-center">
              <Card.Title>{t('home.how_it_works.title')}</Card.Title>
              <div className="d-flex flex-wrap justify-content-around mt-4">
                <div className="text-center mb-4 mx-2" style={{ width: '200px' }}>
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                    <span className="h5 mb-0">1</span>
                  </div>
                  <h5>{t('home.how_it_works.step1_title')}</h5>
                  <p className="small">{t('home.how_it_works.step1_text')}</p>
                </div>
                <div className="text-center mb-4 mx-2" style={{ width: '200px' }}>
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                    <span className="h5 mb-0">2</span>
                  </div>
                  <h5>{t('home.how_it_works.step2_title')}</h5>
                  <p className="small">{t('home.how_it_works.step2_text')}</p>
                </div>
                <div className="text-center mb-4 mx-2" style={{ width: '200px' }}>
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                    <span className="h5 mb-0">3</span>
                  </div>
                  <h5>{t('home.how_it_works.step3_title')}</h5>
                  <p className="small">{t('home.how_it_works.step3_text')}</p>
                </div>
                <div className="text-center mb-4 mx-2" style={{ width: '200px' }}>
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                    <span className="h5 mb-0">4</span>
                  </div>
                  <h5>{t('home.how_it_works.step4_title')}</h5>
                  <p className="small">{t('home.how_it_works.step4_text')}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
