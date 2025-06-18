import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Card,
  Table,
  Spinner,
  Alert,
  Form,
  Row,
  Col,
  InputGroup,
  Pagination,
  Badge
} from "react-bootstrap";
import { FaSearch } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL;

const initialFilters = {
  tipo: "",
  usuario: "",
  dateFrom: "",
  dateTo: ""
};

const activityTypes = [
  { value: "", label: "Todos" },
  { value: "login", label: "Inicio de sesión" },
  { value: "logout", label: "Cierre de sesión" },
  { value: "create", label: "Creación" },
  { value: "update", label: "Actualización" },
  { value: "delete", label: "Eliminación" }
];

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

const getActivityBadgeClass = (type) => {
  switch (type) {
    case "login":
      return "bg-success";
    case "logout":
      return "bg-secondary";
    case "create":
      return "bg-primary";
    case "update":
      return "bg-warning text-dark";
    case "delete":
      return "bg-danger";
    default:
      return "bg-info";
  }
};

const validateDates = (dateFrom, dateTo) => {
  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    return fromDate <= toDate;
  }
  return true;
};

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateError, setDateError] = useState("");
  const limit = 10;

  const fetchLogs = useCallback(async () => {
    if (!validateDates(filters.dateFrom, filters.dateTo)) {
      setDateError("La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'");
      return;
    }
    setDateError("");

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("No se encontró token de autenticación");
      }

      const params = {
        limit,
        page,
        ...(filters.tipo && { action: filters.tipo }),
        ...(filters.usuario && { userId: filters.usuario }),
        ...(filters.dateFrom && { startDate: filters.dateFrom }),
        ...(filters.dateTo && { endDate: filters.dateTo })
      };

      const res = await axios.get(`${API_URL}/api/admin/activity`, {
        headers: { "x-auth-token": token },
        params
      });

      if (res.data?.success === false) {
        throw new Error(res.data.message || "Error en la respuesta del servidor");
      }

      setLogs(res.data?.data || []);
      setPages(res.data?.pages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         "Error al cargar el registro de actividad";
      setError(errorMessage);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
    setDateError("");
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      (log.action?.toLowerCase().includes(searchLower)) ||
      (log.user?.username?.toLowerCase().includes(searchLower)) ||
      (log.user?.name?.toLowerCase().includes(searchLower)) ||
      (log.details?.descripcion?.toLowerCase().includes(searchLower)) ||
      (log.details?.description?.toLowerCase().includes(searchLower)) ||
      (typeof log.details === 'string' && log.details.toLowerCase().includes(searchLower)) ||
      (log.metadata?.ip?.includes(searchTerm)) // IP no se convierte a minúsculas
    );
  });

  const renderPagination = () => {
    if (pages <= 1) return null;

    const visiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(visiblePages / 2));
    let endPage = Math.min(pages, startPage + visiblePages - 1);

    if (endPage - startPage + 1 < visiblePages) {
      startPage = Math.max(1, endPage - visiblePages + 1);
    }

    const items = [];
    
    // Botón Anterior
    items.push(
      <Pagination.Prev 
        key="prev" 
        onClick={() => setPage(p => Math.max(1, p - 1))} 
        disabled={page === 1} 
      />
    );

    // Primera página y elipsis si es necesario
    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => setPage(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
      }
    }

    // Páginas visibles
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === page} 
          onClick={() => setPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Última página y elipsis si es necesario
    if (endPage < pages) {
      if (endPage < pages - 1) {
        items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
      }
      items.push(
        <Pagination.Item key={pages} onClick={() => setPage(pages)}>
          {pages}
        </Pagination.Item>
      );
    }

    // Botón Siguiente
    items.push(
      <Pagination.Next 
        key="next" 
        onClick={() => setPage(p => Math.min(pages, p + 1))} 
        disabled={page === pages} 
      />
    );

    return <Pagination className="mb-0">{items}</Pagination>;
  };

  return (
    <Container className="my-4">
      <h2 className="mb-4">Registro de Actividad</h2>
      
      {/* Card de Filtros */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form>
            <Row>
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Tipo de actividad</Form.Label>
                  <Form.Control 
                    as="select" 
                    name="tipo" 
                    value={filters.tipo} 
                    onChange={handleFilterChange}
                  >
                    {activityTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Usuario (ID)</Form.Label>
                  <Form.Control
                    type="text"
                    name="usuario"
                    value={filters.usuario}
                    onChange={handleFilterChange}
                    placeholder="ID de usuario"
                  />
                </Form.Group>
              </Col>
              
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Desde</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="dateFrom" 
                    value={filters.dateFrom} 
                    onChange={handleFilterChange} 
                  />
                </Form.Group>
              </Col>
              
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Hasta</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="dateTo" 
                    value={filters.dateTo} 
                    onChange={handleFilterChange} 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            {dateError && <Alert variant="danger" className="mt-2">{dateError}</Alert>}
            
            <div className="d-flex justify-content-end">
              <button 
                type="button" 
                className="btn btn-outline-secondary me-2" 
                onClick={resetFilters}
                disabled={loading}
              >
                Resetear
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={applyFilters}
                disabled={loading || !!dateError}
              >
                {loading ? 'Cargando...' : 'Aplicar Filtros'}
              </button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Card de Resultados */}
      <Card className="shadow-sm mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Actividades {total > 0 && `(${total} encontradas)`}
            </h5>
            <InputGroup style={{ width: "300px" }}>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </InputGroup>
          </div>
        </Card.Header>
        
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
            </div>
          ) : filteredLogs.length > 0 ? (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Usuario</th>
                      <th>Descripción</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log._id}>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>
                          <Badge pill className={getActivityBadgeClass(log.action)}>
                            {log.action ? log.action.replace(/_/g, " ") : "-"}
                          </Badge>
                        </td>
                        <td>
                          {log.user?.name || log.user?.username || "-"}
                          {log.user?.id && ` (${log.user.id})`}
                        </td>
                        <td>
                          {log.details?.descripcion || 
                           log.details?.description || 
                           log.details || "-"}
                        </td>
                        <td>{log.metadata?.ip || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  Página {page} de {pages}
                </div>
                {renderPagination()}
              </div>
            </>
          ) : (
            <Alert variant="info">
              No se encontraron actividades{searchTerm ? " que coincidan con la búsqueda" : ""}
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ActivityLog;