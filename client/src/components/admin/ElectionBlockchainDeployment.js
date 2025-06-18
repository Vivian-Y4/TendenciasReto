import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Button, Row, Col, Alert, Spinner, ProgressBar, Table, Badge } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import AdminContext from '../../context/AdminContext';
import axios from 'axios';

const ElectionBlockchainDeployment = () => {
  const { t } = useTranslation();
  const { electionId } = useParams();
  const { isAdminAuthenticated, adminPermissions } = useContext(AdminContext);
  const navigate = useNavigate();

  // Estados para datos de la elección
  const [election, setElection] = useState(null);
  const [blockchainStatus, setBlockchainStatus] = useState({
    isDeployed: false,
    contractAddress: '',
    deploymentTxHash: '',
    blockNumber: null,
    deploymentTimestamp: null,
    confirmations: 0,
    networkInfo: {
      name: 'Ethereum Testnet',
      chainId: 5, // Goerli por defecto
      explorerUrl: 'https://goerli.etherscan.io'
    }
  });

  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [error, setError] = useState('');
  
  // Estado para simular el proveedor blockchain
  const [provider, setProvider] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [networkBalance, setNetworkBalance] = useState('0');

  // Cargar datos de la elección y estado de blockchain
  useEffect(() => {
    // Verificar autenticación y permisos
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
      return;
    }
    
    if (!adminPermissions.canManageElections) {
      toast.error('No tienes permisos para gestionar elecciones en blockchain');
      navigate('/admin');
      return;
    }
    
    const fetchElectionData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        
        // Obtener datos de la elección
        const electionResponse = await axios.get(`/api/admin/elections/${electionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (electionResponse.data.success) {
          setElection(electionResponse.data.data);
          
          // Verificar si ya está desplegada en blockchain
          if (electionResponse.data.data.blockchain) {
            const blockchainData = electionResponse.data.data.blockchain;
            setBlockchainStatus({
              isDeployed: !!blockchainData.contractAddress,
              contractAddress: blockchainData.contractAddress || '',
              deploymentTxHash: blockchainData.deploymentTxHash || '',
              blockNumber: blockchainData.blockNumber,
              deploymentTimestamp: blockchainData.deploymentTimestamp,
              confirmations: blockchainData.confirmations || 0,
              networkInfo: blockchainData.networkInfo || {
                name: 'Ethereum Testnet',
                chainId: 5,
                explorerUrl: 'https://goerli.etherscan.io'
              }
            });
          }
        } else {
          throw new Error(electionResponse.data.message || 'Error al cargar datos de la elección');
        }
        
        // Inicializar el proveedor de blockchain (simulado para este ejemplo)
        initializeBlockchainProvider();
        
      } catch (error) {
        console.error('Error fetching election data:', error);
        setError(error.message || 'Error al cargar datos de la elección');
        toast.error(error.message || 'Error al cargar datos de la elección');
      } finally {
        setLoading(false);
      }
    };
    
    fetchElectionData();
  }, [electionId, isAdminAuthenticated, adminPermissions, navigate]);

  // Inicializar proveedor blockchain (simulado)
  const initializeBlockchainProvider = async () => {
    try {
      // En un entorno real, esto conectaría con la red Ethereum
      // Para este ejemplo, usamos una simulación
      
      // Simular conexión exitosa después de un breve retraso
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Establecer estado del proveedor simulado
      setProvider({
        network: {
          name: 'Goerli Test Network',
          chainId: 5
        },
        isConnected: true
      });
      
      // Simular wallet conectada
      setWallet({
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        isConnected: true
      });
      
      // Simular balance en la red
      setNetworkBalance('0.158');
      
    } catch (error) {
      console.error('Error initializing blockchain provider:', error);
      toast.error('Error al conectar con la red blockchain');
    }
  };

  // Manejar despliegue de la elección a blockchain
  const handleDeployToBlockchain = async () => {
    try {
      setDeploying(true);
      setError('');
      setDeploymentStep(1);
      
      // Paso 1: Preparar contrato
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDeploymentStep(2);
      
      // Paso 2: Firmar transacción
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDeploymentStep(3);
      
      // Paso 3: Enviar a la red
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Simular respuesta exitosa
      const mockBlockchainResponse = {
        contractAddress: '0x0123456789012345678901234567890123456789',
        deploymentTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 7654321,
        deploymentTimestamp: Date.now(),
        confirmations: 1,
        networkInfo: {
          name: 'Goerli Test Network',
          chainId: 5,
          explorerUrl: 'https://goerli.etherscan.io'
        }
      };
      
      // Actualizar estado de blockchain
      setBlockchainStatus({
        isDeployed: true,
        ...mockBlockchainResponse
      });
      
      // Simulando actualización de confirmaciones
      let confirmations = 1;
      const confirmationInterval = setInterval(() => {
        if (confirmations >= 12) {
          clearInterval(confirmationInterval);
          return;
        }
        
        confirmations++;
        setBlockchainStatus(prev => ({
          ...prev,
          confirmations
        }));
      }, 1500);
      
      // Guardar datos en backend
      const token = localStorage.getItem('adminToken');
      await axios.post(`/api/admin/elections/${electionId}/blockchain`, mockBlockchainResponse, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Elección desplegada exitosamente en blockchain');
      setDeploymentStep(4);
      
    } catch (error) {
      console.error('Error deploying to blockchain:', error);
      setError(error.message || 'Error al desplegar en blockchain');
      toast.error(error.message || 'Error al desplegar en blockchain');
    } finally {
      setDeploying(false);
    }
  };

  // Verificar estado del contrato en la blockchain
  const handleVerifyContract = async () => {
    try {
      setVerifying(true);
      
      // Simular verificación
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar estado (simulado)
      setBlockchainStatus(prev => ({
        ...prev,
        lastVerification: Date.now(),
        isVerified: true,
        voterCount: 0,
        voteCount: 0
      }));
      
      toast.success('Contrato verificado correctamente');
    } catch (error) {
      console.error('Error verifying contract:', error);
      toast.error('Error al verificar contrato');
    } finally {
      setVerifying(false);
    }
  };

  // Sincronizar datos con blockchain
  const handleSyncWithBlockchain = async () => {
    try {
      toast.info('Sincronizando datos con blockchain...');
      
      // Simular sincronización
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Datos sincronizados correctamente');
    } catch (error) {
      console.error('Error syncing with blockchain:', error);
      toast.error('Error al sincronizar con blockchain');
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Despliegue en Blockchain</h2>
        <Button
          as={Link}
          to={`/admin/elections/${electionId}`}
          variant="outline-secondary"
        >
          Volver a Detalles
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row className="g-4">
        <Col lg={8}>
          {/* Tarjeta de información de la elección */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-primary bg-opacity-10">
              <h5 className="mb-0">Información de la Elección</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p className="mb-1"><strong>Título:</strong></p>
                  <p className="mb-3">{election?.title}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Estado:</strong></p>
                  <p className="mb-3">
                    {blockchainStatus.isDeployed ? (
                      <Badge bg="success">Desplegada en Blockchain</Badge>
                    ) : (
                      <Badge bg="warning">Pendiente de Despliegue</Badge>
                    )}
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Inicio:</strong></p>
                  <p className="mb-3">{new Date(election?.startTime * 1000).toLocaleString()}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Fin:</strong></p>
                  <p className="mb-3">{new Date(election?.endTime * 1000).toLocaleString()}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Candidatos:</strong></p>
                  <p className="mb-3">{election?.candidates?.length || 0}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1"><strong>Categorías:</strong></p>
                  <p className="mb-3">
                    {election?.categories?.map(cat => cat.name).join(', ') || 'Ninguna'}
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
          {/* Tarjeta de despliegue */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-info bg-opacity-10">
              <h5 className="mb-0">Despliegue en Blockchain</h5>
            </Card.Header>
            <Card.Body>
              {!blockchainStatus.isDeployed ? (
                <>
                  <p className="mb-4">
                    Esta elección aún no ha sido desplegada en la blockchain. El despliegue en blockchain
                    garantiza la inmutabilidad y transparencia de los resultados.
                  </p>
                  
                  {deploying ? (
                    <div className="text-center py-3">
                      <h6>Desplegando elección en blockchain...</h6>
                      <ProgressBar 
                        now={deploymentStep * 25} 
                        label={`${deploymentStep * 25}%`} 
                        className="my-3" 
                        animated
                      />
                      <p className="text-muted">
                        {deploymentStep === 1 && 'Preparando contrato...'}
                        {deploymentStep === 2 && 'Firmando transacción...'}
                        {deploymentStep === 3 && 'Enviando a la red...'}
                        {deploymentStep === 4 && 'Despliegue completado'}
                      </p>
                    </div>
                  ) : (
                    <div className="d-grid gap-2">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleDeployToBlockchain}
                        disabled={!provider?.isConnected || !wallet?.isConnected}
                      >
                        <i className="fas fa-rocket me-2"></i>
                        Desplegar en Blockchain
                      </Button>
                      
                      {(!provider?.isConnected || !wallet?.isConnected) && (
                        <Alert variant="warning" className="mt-3">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Necesitas conectar tu wallet para desplegar la elección en blockchain.
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <h6>Estado del Despliegue</h6>
                    <Table bordered hover size="sm">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '180px' }}>Dirección del Contrato</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <code>{blockchainStatus.contractAddress}</code>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="ms-2 p-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(blockchainStatus.contractAddress);
                                  toast.info('Dirección copiada al portapapeles');
                                }}
                              >
                                <i className="far fa-copy"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Hash de Transacción</td>
                          <td>
                            <a 
                              href={`${blockchainStatus.networkInfo.explorerUrl}/tx/${blockchainStatus.deploymentTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-break"
                            >
                              {blockchainStatus.deploymentTxHash}
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Bloque</td>
                          <td>
                            <a 
                              href={`${blockchainStatus.networkInfo.explorerUrl}/block/${blockchainStatus.blockNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {blockchainStatus.blockNumber}
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Confirmaciones</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <Badge 
                                bg={blockchainStatus.confirmations >= 12 ? 'success' : 'warning'} 
                                className="me-2"
                              >
                                {blockchainStatus.confirmations}/12
                              </Badge>
                              {blockchainStatus.confirmations < 12 && (
                                <Spinner animation="border" size="sm" />
                              )}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Red</td>
                          <td>{blockchainStatus.networkInfo.name} (Chain ID: {blockchainStatus.networkInfo.chainId})</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Fecha de Despliegue</td>
                          <td>{new Date(blockchainStatus.deploymentTimestamp).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                  
                  <div className="d-flex gap-2 mb-3">
                    <Button 
                      variant="outline-primary" 
                      onClick={handleVerifyContract}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle me-2"></i>
                          Verificar Contrato
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline-info" 
                      onClick={handleSyncWithBlockchain}
                    >
                      <i className="fas fa-sync me-2"></i>
                      Sincronizar con Blockchain
                    </Button>
                    
                    <Button 
                      variant="outline-secondary"
                      as="a"
                      href={`${blockchainStatus.networkInfo.explorerUrl}/address/${blockchainStatus.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-external-link-alt me-2"></i>
                      Ver en Explorador
                    </Button>
                  </div>
                  
                  {blockchainStatus.isVerified && (
                    <Alert variant="success">
                      <i className="fas fa-check-circle me-2"></i>
                      Contrato verificado correctamente. Última verificación: {new Date(blockchainStatus.lastVerification).toLocaleString()}
                    </Alert>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          {/* Tarjeta de conexión blockchain */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-secondary bg-opacity-10">
              <h5 className="mb-0">Conexión Blockchain</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <p className="mb-1"><strong>Estado:</strong></p>
                <p className="mb-0">
                  <Badge bg={provider?.isConnected ? 'success' : 'danger'}>
                    {provider?.isConnected ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </p>
              </div>
              
              <div className="mb-4">
                <p className="mb-1"><strong>Red:</strong></p>
                <p className="mb-0">{provider?.network?.name || 'No conectado'}</p>
              </div>
              
              <div className="mb-4">
                <p className="mb-1"><strong>Wallet:</strong></p>
                {wallet?.isConnected ? (
                  <p className="mb-0 text-break">{wallet.address}</p>
                ) : (
                  <p className="mb-0 text-muted">No conectada</p>
                )}
              </div>
              
              <div className="mb-4">
                <p className="mb-1"><strong>Balance:</strong></p>
                <p className="mb-0">{wallet?.isConnected ? `${networkBalance} ETH` : 'N/A'}</p>
              </div>
              
              <div className="d-grid">
                {!wallet?.isConnected ? (
                  <Button 
                    variant="primary" 
                    onClick={initializeBlockchainProvider}
                  >
                    <i className="fas fa-wallet me-2"></i>
                    Conectar Wallet
                  </Button>
                ) : (
                  <Button 
                    variant="outline-danger" 
                    onClick={() => {
                      setWallet(null);
                      toast.info('Wallet desconectada');
                    }}
                  >
                    <i className="fas fa-unlink me-2"></i>
                    Desconectar Wallet
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
          
          {/* Tarjeta de estadísticas blockchain */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-success bg-opacity-10">
              <h5 className="mb-0">Estadísticas</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <p className="mb-1"><strong>Costo Estimado:</strong></p>
                <p className="mb-0">~0.008 ETH (≈ $15.20 USD)</p>
              </div>
              
              <div className="mb-3">
                <p className="mb-1"><strong>Gas Usado:</strong></p>
                <p className="mb-0">{blockchainStatus.gasUsed || 'N/A'}</p>
              </div>
              
              <div className="mb-3">
                <p className="mb-1"><strong>Tamaño del Contrato:</strong></p>
                <p className="mb-0">{blockchainStatus.contractSize || 'N/A'}</p>
              </div>
              
              <hr />
              
              <div className="mb-3">
                <p className="mb-1"><strong>Votantes Registrados:</strong></p>
                <p className="mb-0">{blockchainStatus.voterCount || 0}</p>
              </div>
              
              <div className="mb-3">
                <p className="mb-1"><strong>Votos Emitidos:</strong></p>
                <p className="mb-0">{blockchainStatus.voteCount || 0}</p>
              </div>
            </Card.Body>
          </Card>
          
          {/* Tarjeta de logs */}
          <Card className="shadow-sm">
            <Card.Header className="bg-dark bg-opacity-10">
              <h5 className="mb-0">Eventos Blockchain</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="blockchain-events p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {blockchainStatus.isDeployed ? (
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <small className="text-muted">{new Date(blockchainStatus.deploymentTimestamp).toLocaleTimeString()}</small>
                      <p className="mb-0"><strong>ElectionDeployed</strong> - Elección desplegada con éxito</p>
                    </li>
                    {blockchainStatus.confirmations > 3 && (
                      <li className="mb-2">
                        <small className="text-muted">{new Date(blockchainStatus.deploymentTimestamp + 30000).toLocaleTimeString()}</small>
                        <p className="mb-0"><strong>CandidatesRegistered</strong> - {election?.candidates?.length || 0} candidatos registrados</p>
                      </li>
                    )}
                    {blockchainStatus.confirmations > 5 && (
                      <li className="mb-2">
                        <small className="text-muted">{new Date(blockchainStatus.deploymentTimestamp + 60000).toLocaleTimeString()}</small>
                        <p className="mb-0"><strong>ElectionActivated</strong> - Elección activada en la blockchain</p>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-center text-muted mb-0">No hay eventos disponibles</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ElectionBlockchainDeployment;
