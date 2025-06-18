import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AdminContext from '../../context/AdminContext';
import { Spinner, Container } from 'react-bootstrap';

/**
 * Componente para proteger rutas de administrador
 * @param {Object} props - Propiedades del componente
 * @param {JSX.Element} props.element - Elemento a renderizar si el usuario es administrador
 * @returns {JSX.Element}
 */
const AdminRoute = ({ element }) => {
  const { isAdminAuthenticated, adminLoading } = useContext(AdminContext);
  const location = useLocation();

  // Mientras carga el contexto, muestra spinner (¡esto evita redirecciones incorrectas!)
  if (adminLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  // Si no está autenticado como admin, redirige al login de admin
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  // Renderiza el componente protegido
  return element;
};

export default AdminRoute;