import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AdminContext from '../../context/AdminContext';
import axios from 'axios';

const ElectionConfiguration = () => {
  const { t } = useTranslation();
  const { electionId } = useParams();
  const { isAdminAuthenticated, adminPermissions } = useContext(AdminContext);
  const navigate = useNavigate();

  // Estados para gestionar los datos de configuración
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [settings, setSettings] = useState({
    isPublic: true,
    requiresVerification: true,
    allowAbstention: false,
    minParticipation: 0,
    allowVoterComments: false,
    voterEligibility: 'all',
    useCustomVoterList: false,
    customVoterList: [],
    blockchainConfiguration: {
      useCustomContract: false,
      contractAddress: '',
      gasLimit: 3000000,
      confirmationsRequired: 2
    }
  });
  
  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('categories');

  // Cargar datos iniciales: categorías y configuración existente
  useEffect(() => {
    // Verificar autenticación y permisos
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
      return;
    }
    
    if (!adminPermissions.canManageElections) {
      toast.error('No tienes permisos para configurar elecciones');
      navigate('/admin');
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        
        // Obtener categorías disponibles
        const categoriesResponse = await axios.get('/api/admin/categories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (categoriesResponse.data.success) {
          setCategories(categoriesResponse.data.data);
        }
        
        // Si tenemos un electionId, cargar configuración existente
        if (electionId) {
          const configResponse = await axios.get(`/api/admin/elections/${electionId}/settings`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (configResponse.data.success) {
            const electionData = configResponse.data.data;
            
            // Actualizar estados con la información existente
            if (electionData.categories) {
              setSelectedCategories(electionData.categories.map(cat => cat.categoryId));
            }
            
            if (electionData.settings) {
              setSettings({
                isPublic: electionData.settings.isPublic ?? true,
                requiresVerification: electionData.settings.requiresVerification ?? true,
                allowAbstention: electionData.settings.allowAbstention ?? false,
                minParticipation: electionData.settings.minParticipation ?? 0,
                allowVoterComments: electionData.settings.allowVoterComments ?? false,
                voterEligibility: electionData.settings.voterEligibility || 'all',
                useCustomVoterList: electionData.allowedVoters && electionData.allowedVoters.length > 0,
                customVoterList: electionData.allowedVoters || [],
                blockchainConfiguration: {
                  useCustomContract: !!electionData.settings.blockchainConfiguration?.contractAddress,
                  contractAddress: electionData.settings.blockchainConfiguration?.contractAddress || '',
                  gasLimit: electionData.settings.blockchainConfiguration?.gasLimit || 3000000,
                  confirmationsRequired: electionData.settings.blockchainConfiguration?.confirmationsRequired || 2
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching configuration data:', error);
        setError('Error al cargar datos de configuración');
        toast.error('Error al cargar datos de configuración');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [electionId, isAdminAuthenticated, adminPermissions, navigate]);

  // Manejar cambios en la selección de categorías
  const handleCategoryChange = (categoryId) => {
    setSelectedCategories(prevSelected => {
      if (prevSelected.includes(categoryId)) {
        return prevSelected.filter(id => id !== categoryId);
      } else {
        return [...prevSelected, categoryId];
      }
    });
  };

  // Manejar cambios en las configuraciones
  const handleSettingChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambios en la configuración de blockchain
  const handleBlockchainConfigChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      blockchainConfiguration: {
        ...prev.blockchainConfiguration,
        [name]: value
      }
    }));
  };

  // Guardar configuración
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError('');
      
      const token = localStorage.getItem('adminToken');
      
      // Preparar datos para enviar
      const configData = {
        categories: selectedCategories.map(catId => ({ categoryId: catId })),
        settings: {
          isPublic: settings.isPublic,
          requiresVerification: settings.requiresVerification,
          allowAbstention: settings.allowAbstention,
          minParticipation: parseInt(settings.minParticipation),
          allowVoterComments: settings.allowVoterComments,
          voterEligibility: settings.voterEligibility,
          blockchainConfiguration: settings.blockchainConfiguration.useCustomContract ? {
            contractAddress: settings.blockchainConfiguration.contractAddress,
            gasLimit: parseInt(settings.blockchainConfiguration.gasLimit),
            confirmationsRequired: parseInt(settings.blockchainConfiguration.confirmationsRequired)
          } : undefined
        },
        allowedVoters: settings.useCustomVoterList ? settings.customVoterList : []
      };
      
      // Enviar configuración
      let response;
      if (electionId) {
        response = await axios.put(`/api/admin/elections/${electionId}/settings`, configData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Si no hay electionId, probablemente estemos en un flujo de creación
        // Guardar en sessionStorage para usar en el proceso de creación
        sessionStorage.setItem('electionConfig', JSON.stringify(configData));
        toast.success('Configuración guardada temporalmente');
        navigate('/admin/elections/create/details');
        return;
      }
      
      if (response.data.success) {
        toast.success('Configuración guardada correctamente');
        navigate(`/admin/elections/${electionId}`);
      } else {
        throw new Error(response.data.message || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error.message || 'Error al guardar configuración');
      toast.error(error.message || 'Error al guardar configuración');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Configuración de Elección</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
            >
              {/* Pestaña de Categorías */}
              <Tab eventKey="categories" title="Categorías">
                <p className="text-muted mb-4">
                  Las categorías ayudan a organizar y filtrar las elecciones. Selecciona todas las que apliquen.
                </p>
                
                {categories.length === 0 ? (
                  <Alert variant="info">
                    No hay categorías disponibles. <Link to="/admin/categories/create">Crear categorías</Link>
                  </Alert>
                ) : (
                  <Row xs={1} md={2} lg={3} className="g-4 mb-4">
                    {categories.map(category => (
                      <Col key={category._id}>
                        <Card className={`h-100 ${selectedCategories.includes(category._id) ? 'border-primary' : ''}`}>
                          <Card.Body>
                            <Form.Check
                              type="checkbox"
                              id={`category-${category._id}`}
                              label={category.name}
                              checked={selectedCategories.includes(category._id)}
                              onChange={() => handleCategoryChange(category._id)}
                              className="mb-2"
                            />
                            <p className="text-muted small mb-0">{category.description}</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Tab>
              
              {/* Pestaña de Configuración General */}
              <Tab eventKey="general" title="Configuración General">
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Visibilidad</Form.Label>
                      <div>
                        <Form.Check
                          type="radio"
                          id="visibility-public"
                          name="visibility"
                          label="Pública (visible para todos)"
                          checked={settings.isPublic}
                          onChange={() => handleSettingChange('isPublic', true)}
                          className="mb-2"
                        />
                        <Form.Check
                          type="radio"
                          id="visibility-private"
                          name="visibility"
                          label="Privada (solo para votantes elegibles)"
                          checked={!settings.isPublic}
                          onChange={() => handleSettingChange('isPublic', false)}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Verificación de Votantes</Form.Label>
                      <div>
                        <Form.Check
                          type="radio"
                          id="verification-required"
                          name="verification"
                          label="Requerir verificación de identidad"
                          checked={settings.requiresVerification}
                          onChange={() => handleSettingChange('requiresVerification', true)}
                          className="mb-2"
                        />
                        <Form.Check
                          type="radio"
                          id="verification-not-required"
                          name="verification"
                          label="No requerir verificación"
                          checked={!settings.requiresVerification}
                          onChange={() => handleSettingChange('requiresVerification', false)}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Opciones de Votación</Form.Label>
                      <div>
                        <Form.Check
                          type="checkbox"
                          id="allow-abstention"
                          label="Permitir abstención"
                          checked={settings.allowAbstention}
                          onChange={() => handleSettingChange('allowAbstention', !settings.allowAbstention)}
                          className="mb-2"
                        />
                        <Form.Check
                          type="checkbox"
                          id="allow-comments"
                          label="Permitir comentarios de votantes"
                          checked={settings.allowVoterComments}
                          onChange={() => handleSettingChange('allowVoterComments', !settings.allowVoterComments)}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Participación Mínima (%)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        value={settings.minParticipation}
                        onChange={(e) => handleSettingChange('minParticipation', e.target.value)}
                      />
                      <Form.Text className="text-muted">
                        Porcentaje mínimo de participación para validar los resultados. 0 = sin mínimo.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-4">
                  <Form.Label>Elegibilidad de Votantes</Form.Label>
                  <div>
                    <Form.Check
                      type="radio"
                      id="eligibility-all"
                      name="eligibility"
                      label="Todos los votantes registrados y verificados"
                      checked={settings.voterEligibility === 'all'}
                      onChange={() => handleSettingChange('voterEligibility', 'all')}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="eligibility-district"
                      name="eligibility"
                      label="Por distrito/región"
                      checked={settings.voterEligibility === 'district'}
                      onChange={() => handleSettingChange('voterEligibility', 'district')}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="eligibility-custom"
                      name="eligibility"
                      label="Lista personalizada de votantes"
                      checked={settings.voterEligibility === 'custom'}
                      onChange={() => {
                        handleSettingChange('voterEligibility', 'custom');
                        handleSettingChange('useCustomVoterList', true);
                      }}
                    />
                  </div>
                </Form.Group>
                
                {settings.voterEligibility === 'district' && (
                  <Form.Group className="mb-4">
                    <Form.Label>Selecciona Distritos</Form.Label>
                    <Form.Select 
                      multiple 
                      className="mb-2"
                      style={{ height: '150px' }}
                    >
                      <option value="distrito1">Distrito Central</option>
                      <option value="distrito2">Distrito Norte</option>
                      <option value="distrito3">Distrito Sur</option>
                      <option value="distrito4">Distrito Este</option>
                      <option value="distrito5">Distrito Oeste</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Mantén presionado Ctrl (o Cmd en Mac) para seleccionar múltiples distritos.
                    </Form.Text>
                  </Form.Group>
                )}
                
                {settings.voterEligibility === 'custom' && (
                  <Form.Group className="mb-4">
                    <Form.Label>Lista de Votantes Elegibles</Form.Label>
                    <div className="d-flex mb-2">
                      <Form.Control
                        type="file"
                        accept=".csv,.txt"
                      />
                      <Button variant="outline-primary" className="ms-2">
                        Importar
                      </Button>
                    </div>
                    <Form.Text className="text-muted mb-3 d-block">
                      Importa un archivo CSV con los IDs o correos electrónicos de los votantes elegibles.
                    </Form.Text>
                    
                    <div className="custom-voter-list border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {settings.customVoterList.length > 0 ? (
                        <ul className="list-unstyled mb-0">
                          {settings.customVoterList.slice(0, 5).map((voter, index) => (
                            <li key={index} className="d-flex justify-content-between align-items-center py-1">
                              <span>{voter.email || voter.id}</span>
                              <Button variant="link" className="text-danger p-0">
                                <i className="fas fa-times"></i>
                              </Button>
                            </li>
                          ))}
                          {settings.customVoterList.length > 5 && (
                            <li className="text-center text-muted">
                              ...y {settings.customVoterList.length - 5} más
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-center text-muted mb-0">No hay votantes en la lista</p>
                      )}
                    </div>
                  </Form.Group>
                )}
              </Tab>
              
              {/* Pestaña de Configuración Blockchain */}
              <Tab eventKey="blockchain" title="Configuración Blockchain">
                <p className="text-muted mb-4">
                  Configura las opciones de blockchain para esta elección. La configuración avanzada solo
                  es recomendada para usuarios con experiencia en contratos inteligentes.
                </p>
                
                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    id="use-custom-contract"
                    label="Usar contrato personalizado"
                    checked={settings.blockchainConfiguration.useCustomContract}
                    onChange={() => handleBlockchainConfigChange('useCustomContract', !settings.blockchainConfiguration.useCustomContract)}
                  />
                  <Form.Text className="text-muted">
                    Si no se selecciona, se usará el contrato principal del sistema.
                  </Form.Text>
                </Form.Group>
                
                {settings.blockchainConfiguration.useCustomContract && (
                  <Row className="mb-4">
                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label>Dirección del Contrato</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="0x..."
                          value={settings.blockchainConfiguration.contractAddress}
                          onChange={(e) => handleBlockchainConfigChange('contractAddress', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Límite de Gas</Form.Label>
                        <Form.Control
                          type="number"
                          min="1000000"
                          step="100000"
                          value={settings.blockchainConfiguration.gasLimit}
                          onChange={(e) => handleBlockchainConfigChange('gasLimit', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Confirmaciones Requeridas</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="12"
                          value={settings.blockchainConfiguration.confirmationsRequired}
                          onChange={(e) => handleBlockchainConfigChange('confirmationsRequired', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}
                
                <div className="bg-light border rounded p-3 mb-4">
                  <h6 className="mb-3">Previsualización de Costos</h6>
                  <Row>
                    <Col md={4}>
                      <p className="mb-1 fw-bold">Costo de Despliegue</p>
                      <p className="text-muted">~0.002 ETH</p>
                    </Col>
                    <Col md={4}>
                      <p className="mb-1 fw-bold">Costo por Voto</p>
                      <p className="text-muted">~0.0005 ETH</p>
                    </Col>
                    <Col md={4}>
                      <p className="mb-1 fw-bold">Costo de Finalización</p>
                      <p className="text-muted">~0.001 ETH</p>
                    </Col>
                  </Row>
                </div>
                
                <Alert variant="info">
                  <i className="fas fa-info-circle me-2"></i>
                  La elección se desplegará en la red {process.env.REACT_APP_NETWORK_NAME || 'Ethereum Testnet'}.
                  Asegúrate de tener fondos suficientes en la cuenta del administrador.
                </Alert>
              </Tab>
            </Tabs>
            
            <div className="d-flex justify-content-between mt-4">
              <Button
                variant="outline-secondary"
                onClick={() => navigate(electionId ? `/admin/elections/${electionId}` : '/admin/elections')}
                disabled={submitting}
              >
                Cancelar
              </Button>
              
              <div>
                {activeTab !== 'categories' && (
                  <Button
                    variant="outline-primary"
                    className="me-2"
                    onClick={() => {
                      const tabs = ['categories', 'general', 'blockchain'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1]);
                      }
                    }}
                  >
                    Anterior
                  </Button>
                )}
                
                {activeTab !== 'blockchain' ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      const tabs = ['categories', 'general', 'blockchain'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) {
                        setActiveTab(tabs[currentIndex + 1]);
                      }
                    }}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="success"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Configuración'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ElectionConfiguration;
