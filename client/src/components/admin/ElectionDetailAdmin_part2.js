// Continuación del componente ElectionDetailAdmin
// Este fragmento se integrará con la parte 1 y otras partes

// Dentro del componente ElectionDetailAdmin, después del encabezado agregaríamos:

  {/* Contenido principal - Pestañas */}
  <Tabs
    activeKey={activeTab}
    onSelect={(key) => setActiveTab(key)}
    className="mb-4"
  >
    {/* Pestaña de Detalles */}
    <Tab eventKey="details" title="Detalles">
      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Información General</h5>
                {adminPermissions.canEditElection && !hasElectionEnded(election) && (
                  <Button
                    as={Link}
                    to={`/admin/elections/${electionId}/edit`}
                    variant="outline-primary"
                    size="sm"
                  >
                    <i className="fas fa-edit me-2"></i>
                    Editar
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Título</p>
                  <h6>{election.title}</h6>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Estado</p>
                  <h6>{getStatusBadge()}</h6>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Fecha de Inicio</p>
                  <h6>{formatTimestamp(election.startTime)}</h6>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Fecha de Finalización</p>
                  <h6>{formatTimestamp(election.endTime)}</h6>
                </Col>
                <Col md={12} className="mb-3">
                  <p className="mb-1 text-muted">Descripción</p>
                  <p>{election.description}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Candidatos</p>
                  <h6>{election.candidates?.length || 0}</h6>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Votos Emitidos</p>
                  <h6>{election.totalVotes || 0}</h6>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Creado por</p>
                  <h6>{election.createdBy?.username || 'Admin'}</h6>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted">Fecha de Creación</p>
                  <h6>{new Date(election.createdAt).toLocaleString()}</h6>
                </Col>
                {election.resultsFinalized && (
                  <Col md={12}>
                    <p className="mb-1 text-muted">Resultados Finalizados</p>
                    <h6>{new Date(election.resultsPublishedAt).toLocaleString()}</h6>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Candidatos</h5>
            </Card.Header>
            <Card.Body>
              {election.candidates && election.candidates.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th className="text-end">Votos</th>
                      <th className="text-end">Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {election.candidates.map((candidate, index) => {
                      const votePercentage = election.totalVotes > 0
                        ? ((candidate.voteCount || 0) / election.totalVotes * 100).toFixed(2)
                        : '0.00';
                        
                      return (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{candidate.name}</td>
                          <td className="text-truncate" style={{ maxWidth: '250px' }}>
                            {candidate.description}
                          </td>
                          <td className="text-end">{candidate.voteCount || 0}</td>
                          <td className="text-end">{votePercentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : (
                <p className="text-center mb-0 py-3">No hay candidatos registrados</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Estado y Estadísticas</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <div className="text-center px-3">
                  <h3 className="mb-1">{election.totalVotes || 0}</h3>
                  <p className="text-muted mb-0">Votos Emitidos</p>
                </div>
                <div className="text-center px-3">
                  <h3 className="mb-1">{election.blockchain?.totalVotes || 0}</h3>
                  <p className="text-muted mb-0">Votos en Blockchain</p>
                </div>
                <div className="text-center px-3">
                  <h3 className="mb-1">{election.allowedVoters?.length || '∞'}</h3>
                  <p className="text-muted mb-0">Votantes Elegibles</p>
                </div>
              </div>
              
              <hr />
              
              <div className="mb-3">
                <p className="mb-1 text-muted">Tasa de Participación</p>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="progress w-75" style={{ height: '10px' }}>
                    <div 
                      className="progress-bar bg-primary" 
                      role="progressbar" 
                      style={{ 
                        width: `${election.allowedVoters?.length > 0 
                          ? (election.totalVotes / election.allowedVoters.length * 100) 
                          : 0}%` 
                      }}
                      aria-valuenow={election.allowedVoters?.length > 0 
                        ? (election.totalVotes / election.allowedVoters.length * 100) 
                        : 0}
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <span className="fw-bold">
                    {election.allowedVoters?.length > 0 
                      ? ((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2) 
                      : '0.00'}%
                  </span>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="mb-1 text-muted">Tiempo Restante</p>
                {isElectionActive(election) ? (
                  <p className="mb-0">
                    <span className="fw-bold">
                      {Math.floor((election.endTime * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} días,{' '}
                      {Math.floor((election.endTime * 1000 - Date.now()) % (1000 * 60 * 60 * 24) / (1000 * 60 * 60))} horas
                    </span>
                  </p>
                ) : (
                  <p className="mb-0 fw-bold">
                    {hasElectionEnded(election) ? 'Elección finalizada' : 'Elección no iniciada'}
                  </p>
                )}
              </div>
              
              <hr />
              
              <div className="d-grid gap-2">
                {election.resultsFinalized ? (
                  <Button
                    as={Link}
                    to={`/elections/${electionId}/results`}
                    variant="primary"
                  >
                    <i className="fas fa-chart-pie me-2"></i>
                    Ver Resultados Públicos
                  </Button>
                ) : (
                  <Button
                    as={Link}
                    to={`/admin/elections/${electionId}/results`}
                    variant="outline-primary"
                  >
                    <i className="fas fa-chart-bar me-2"></i>
                    Ver Resultados Preliminares
                  </Button>
                )}
                
                <Button
                  as={Link}
                  to={`/admin/statistics/elections/${electionId}`}
                  variant="outline-secondary"
                >
                  <i className="fas fa-analytics me-2"></i>
                  Ver Estadísticas Detalladas
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Blockchain</h5>
            </Card.Header>
            <Card.Body>
              {election.blockchain?.contractAddress ? (
                <>
                  <div className="mb-3">
                    <p className="mb-1 text-muted">Dirección del Contrato</p>
                    <p className="mb-0 text-break fw-bold">
                      <small>{election.blockchain.contractAddress}</small>
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="mb-1 text-muted">Red</p>
                    <p className="mb-0 fw-bold">{election.blockchain.networkInfo?.name || 'Ethereum Testnet'}</p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="mb-1 text-muted">Fecha de Despliegue</p>
                    <p className="mb-0 fw-bold">
                      {election.blockchain.deploymentTimestamp 
                        ? new Date(election.blockchain.deploymentTimestamp).toLocaleString() 
                        : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <Button
                      as={Link}
                      to={`/admin/elections/${electionId}/blockchain`}
                      variant="primary"
                    >
                      <i className="fas fa-cube me-2"></i>
                      Gestionar Blockchain
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3 text-center">
                    Esta elección aún no ha sido desplegada en la blockchain.
                  </p>
                  
                  <div className="d-grid">
                    <Button
                      as={Link}
                      to={`/admin/elections/${electionId}/blockchain`}
                      variant="primary"
                    >
                      <i className="fas fa-rocket me-2"></i>
                      Desplegar en Blockchain
                    </Button>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Tab>
    
    {/* Pestaña de Configuración */}
    <Tab eventKey="configuration" title="Configuración">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Configuración de la Elección</h5>
            <Button
              as={Link}
              to={`/admin/elections/${electionId}/configure`}
              variant="primary"
              size="sm"
              disabled={election.resultsFinalized}
            >
              <i className="fas fa-cog me-2"></i>
              Editar Configuración
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4} className="mb-3">
              <p className="mb-1 text-muted">Visibilidad</p>
              <h6>
                {election.settings?.isPublic !== false ? 'Pública' : 'Privada'}
              </h6>
            </Col>
            <Col md={4} className="mb-3">
              <p className="mb-1 text-muted">Verificación de Identidad</p>
              <h6>
                {election.settings?.requiresVerification !== false ? 'Requerida' : 'No requerida'}
              </h6>
            </Col>
            <Col md={4} className="mb-3">
              <p className="mb-1 text-muted">Abstención</p>
              <h6>
                {election.settings?.allowAbstention ? 'Permitida' : 'No permitida'}
              </h6>
            </Col>
            <Col md={4} className="mb-3">
              <p className="mb-1 text-muted">Comentarios</p>
              <h6>
                {election.settings?.allowVoterComments ? 'Permitidos' : 'No permitidos'}
              </h6>
            </Col>
            <Col md={4} className="mb-3">
              <p className="mb-1 text-muted">Participación Mínima</p>
              <h6>
                {(election.settings?.minParticipation || 0) > 0 
                  ? `${election.settings.minParticipation}%` 
                  : 'No establecida'}
              </h6>
            </Col>
            <Col md={4} className="mb-3">
              <p className="mb-1 text-muted">Elegibilidad</p>
              <h6>
                {election.settings?.voterEligibility === 'all' && 'Todos los votantes'}
                {election.settings?.voterEligibility === 'district' && 'Por distrito'}
                {election.settings?.voterEligibility === 'custom' && 'Lista personalizada'}
                {!election.settings?.voterEligibility && 'Todos los votantes'}
              </h6>
            </Col>
            
            <Col md={12} className="mt-2">
              <p className="mb-1 text-muted">Categorías</p>
              <div>
                {election.categories && election.categories.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {election.categories.map((category, index) => (
                      <Badge bg="secondary" key={index} className="py-2 px-3">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">No hay categorías asignadas</p>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {election.settings?.voterEligibility === 'custom' && election.allowedVoters && election.allowedVoters.length > 0 && (
        <Card className="shadow-sm">
          <Card.Header className="bg-white">
            <h5 className="mb-0">Votantes Elegibles ({election.allowedVoters.length})</h5>
          </Card.Header>
          <Card.Body>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <Table hover responsive size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID / Email</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {election.allowedVoters.slice(0, 100).map((voter, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{voter.email || voter._id || voter.id}</td>
                      <td>
                        {voter.hasVoted ? (
                          <Badge bg="success">Votó</Badge>
                        ) : (
                          <Badge bg="secondary">Pendiente</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {election.allowedVoters.length > 100 && (
                    <tr>
                      <td colSpan="3" className="text-center">
                        <em>Y {election.allowedVoters.length - 100} más...</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Tab>
    
    {/* Aquí se añadirán más pestañas en la parte 3 */}
  </Tabs>

  {/* Modales de confirmación que se incluirán en la parte 4 */}
