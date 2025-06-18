import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const AppNavbar = () => {
  const { isAuthenticated, userAddress, userName, isAdmin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Formatea el address para mostrarlo resumido
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <i className="fas fa-vote-yea me-2"></i>
          {t('app.title')}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">{t('navbar.home')}</Nav.Link>
            <Nav.Link as={Link} to="/elections">{t('navbar.elections')}</Nav.Link>
            <Nav.Link as={Link} to="/about">{t('navbar.about')}</Nav.Link>
            <Nav.Link as={Link} to="/help">{t('navbar.help')}</Nav.Link>
            {isAdmin && (
              <Nav.Link as={Link} to="/admin">{t('navbar.admin')}</Nav.Link>
            )}
          </Nav>
          <Nav className="ms-auto align-items-center">
            {isAuthenticated ? (
              <>
                {userName && (
                  <Navbar.Text className="me-3">
                    <span className="fw-bold">{userName}</span>
                  </Navbar.Text>
                )}
                {userAddress && (
                  <Navbar.Text className="me-3">
                    <span className="text-light">{formatAddress(userAddress)}</span>
                  </Navbar.Text>
                )}
                <Button variant="outline-light" onClick={handleLogout}>
                  {t('navbar.logout')}
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" variant="outline-light">
                {t('navbar.connect')}
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;