// Continuación del componente ElectionDetailAdmin
// Este fragmento se integrará con las partes 1, 2 y otras partes

// Dentro del componente Tabs, después de la pestaña de configuración agregaríamos:

    {/* Pestaña de Votantes */}
    <Tab eventKey="voters" title="Votantes">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Estadísticas de Votantes</h5>
            <Button
              as={Link}
              to={`/admin/statistics/voters?electionId=${electionId}`}
              variant="outline-primary"
              size="sm"
            >
              <i className="fas fa-chart-bar me-2"></i>
              Estadísticas Detalladas
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={4} className="text-center mb-3">
              <h3 className="mb-1">{election.totalVotes || 0}</h3>
              <p className="text-muted mb-0">Votos Totales</p>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="mb-1">
                {election.allowedVoters?.length > 0 
                  ? ((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2) 
                  : '0.00'}%
              </h3>
              <p className="text-muted mb-0">Tasa de Participación</p>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="mb-1">{election.voterMetrics?.uniqueIpAddresses || 0}</h3>
              <p className="text-muted mb-0">Direcciones IP Únicas</p>
            </Col>
          </Row>
          
          <h6 className="mb-3">Participación por Fecha</h6>
          <div className="mb-4" style={{ height: '200px' }}>
            {/* Aquí iría un gráfico de participación, pero usaremos un placeholder */}
            <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
              <i className="fas fa-chart-line fa-3x text-muted mb-2"></i>
              <p className="text-muted">Gráfico de Participación por Fecha</p>
            </div>
          </div>
          
          {election.voterMetrics?.demographics && (
            <>
              <h6 className="mb-3 mt-4">Demografía de Votantes</h6>
              <Row>
                <Col md={6}>
                  <div className="mb-4" style={{ height: '200px' }}>
                    <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
                      <i className="fas fa-users fa-3x text-muted mb-2"></i>
                      <p className="text-muted">Distribución por Edad</p>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-4" style={{ height: '200px' }}>
                    <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
                      <i className="fas fa-globe fa-3x text-muted mb-2"></i>
                      <p className="text-muted">Distribución Geográfica</p>
                    </div>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Card.Body>
      </Card>
      
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Historial de Votación</h5>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => window.alert('Exportar historial de votación')}
                className="me-2"
              >
                <i className="fas fa-download me-2"></i>
                Exportar
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => window.alert('Actualizar historial de votación')}
              >
                <i className="fas fa-sync me-2"></i>
                Actualizar
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {election.votes && election.votes.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table responsive hover size="sm">
                <thead>
                  <tr>
                    <th>ID Votante</th>
                    <th>Fecha/Hora</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {election.votes.slice(0, 50).map((vote, index) => (
                    <tr key={index}>
                      <td>
                        <small className="text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                          {vote.voterId || vote.voterAddress || 'Anónimo'}
                        </small>
                      </td>
                      <td><small>{new Date(vote.timestamp).toLocaleString()}</small></td>
                      <td>
                        {vote.blockchain ? (
                          <Badge bg="info">Blockchain</Badge>
                        ) : (
                          <Badge bg="secondary">Estándar</Badge>
                        )}
                      </td>
                      <td>
                        {vote.verified ? (
                          <Badge bg="success">Verificado</Badge>
                        ) : (
                          <Badge bg="warning">Pendiente</Badge>
                        )}
                      </td>
                      <td>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-primary"
                          onClick={() => window.alert(`Ver detalles del voto ${vote._id || index}`)}
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {election.votes.length > 50 && (
                    <tr>
                      <td colSpan="5" className="text-center">
                        <em>Y {election.votes.length - 50} más...</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-vote-yea fa-3x text-muted mb-3"></i>
              <p className="mb-0">No hay votos registrados para esta elección</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Tab>
    
    {/* Pestaña de Resultados */}
    <Tab eventKey="results" title="Resultados">
      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Resultados de la Elección</h5>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => window.alert('Exportar resultados')}
                    className="me-2"
                  >
                    <i className="fas fa-download me-2"></i>
                    Exportar
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => window.alert('Actualizar resultados')}
                  >
                    <i className="fas fa-sync me-2"></i>
                    Actualizar
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {election.totalVotes > 0 ? (
                <>
                  <div className="mb-4" style={{ height: '300px' }}>
                    <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
                      <i className="fas fa-chart-pie fa-3x text-muted mb-2"></i>
                      <p className="text-muted">Gráfico de Resultados</p>
                    </div>
                  </div>
                  
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th>Candidato</th>
                        <th className="text-end">Votos</th>
                        <th className="text-end">Porcentaje</th>
                        <th className="text-center">Gráfico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {election.candidates && election.candidates.sort((a, b) => 
                        (b.voteCount || 0) - (a.voteCount || 0)
                      ).map((candidate, index) => {
                        const votePercentage = election.totalVotes > 0
                          ? ((candidate.voteCount || 0) / election.totalVotes * 100).toFixed(2)
                          : '0.00';
                          
                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{candidate.name}</td>
                            <td className="text-end">{candidate.voteCount || 0}</td>
                            <td className="text-end">{votePercentage}%</td>
                            <td>
                              <div className="progress" style={{ height: '10px' }}>
                                <div 
                                  className="progress-bar bg-primary" 
                                  role="progressbar" 
                                  style={{ width: `${votePercentage}%` }}
                                  aria-valuenow={votePercentage}
                                  aria-valuemin="0" 
                                  aria-valuemax="100"
                                ></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {election.settings?.allowAbstention && (
                        <tr>
                          <td>{election.candidates.length + 1}</td>
                          <td>Abstención</td>
                          <td className="text-end">{election.abstentionCount || 0}</td>
                          <td className="text-end">
                            {election.totalVotes > 0 
                              ? ((election.abstentionCount || 0) / election.totalVotes * 100).toFixed(2) 
                              : '0.00'}%
                          </td>
                          <td>
                            <div className="progress" style={{ height: '10px' }}>
                              <div 
                                className="progress-bar bg-secondary" 
                                role="progressbar" 
                                style={{ 
                                  width: `${election.totalVotes > 0 
                                    ? ((election.abstentionCount || 0) / election.totalVotes * 100) 
                                    : 0}%` 
                                }}
                                aria-valuenow={election.totalVotes > 0 
                                  ? ((election.abstentionCount || 0) / election.totalVotes * 100) 
                                  : 0}
                                aria-valuemin="0" 
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                  <p className="mb-0">No hay votos registrados para esta elección</p>
                </div>
              )}
            </Card.Body>
          </Card>
          
          {election.settings?.allowVoterComments && (
            <Card className="shadow-sm">
              <Card.Header className="bg-white">
                <h5 className="mb-0">Comentarios de Votantes</h5>
              </Card.Header>
              <Card.Body>
                {election.voterComments && election.voterComments.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {election.voterComments.map((comment, index) => (
                      <div key={index} className="mb-3 pb-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold">
                            {comment.anonymous ? 'Votante Anónimo' : comment.voterName || `Votante #${index + 1}`}
                          </span>
                          <small className="text-muted">
                            {new Date(comment.timestamp).toLocaleString()}
                          </small>
                        </div>
                        <p className="mb-0">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-comments fa-3x text-muted mb-3"></i>
                    <p className="mb-0">No hay comentarios de votantes</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Estado de Resultados</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <p className="mb-1 text-muted">Estado</p>
                <h6>
                  {election.resultsFinalized ? (
                    <Badge bg="success">Resultados Finalizados</Badge>
                  ) : hasElectionEnded(election) ? (
                    <Badge bg="warning">Elección Terminada - Resultados Preliminares</Badge>
                  ) : (
                    <Badge bg="info">Elección en Curso - Resultados en Tiempo Real</Badge>
                  )}
                </h6>
              </div>
              
              <div className="mb-3">
                <p className="mb-1 text-muted">Validez</p>
                <h6>
                  {election.settings?.minParticipation && 
                  election.allowedVoters?.length > 0 &&
                  ((election.totalVotes / election.allowedVoters.length * 100) < election.settings.minParticipation) ? (
                    <Badge bg="danger">No Válido - Participación Mínima No Alcanzada</Badge>
                  ) : (
                    <Badge bg="success">Válido</Badge>
                  )}
                </h6>
              </div>
              
              {election.resultsFinalized && (
                <div className="mb-3">
                  <p className="mb-1 text-muted">Publicación de Resultados</p>
                  <h6>{new Date(election.resultsPublishedAt).toLocaleString()}</h6>
                </div>
              )}
              
              <div className="mb-3">
                <p className="mb-1 text-muted">Verificación Blockchain</p>
                <h6>
                  {election.blockchain?.resultsVerified ? (
                    <Badge bg="success">Verificado</Badge>
                  ) : election.blockchain?.contractAddress ? (
                    <Badge bg="warning">Pendiente de Verificación</Badge>
                  ) : (
                    <Badge bg="secondary">No Desplegado en Blockchain</Badge>
                  )}
                </h6>
              </div>
              
              <hr />
              
              <div className="d-grid gap-2">
                {hasElectionEnded(election) && !election.resultsFinalized && adminPermissions.canFinalizeResults && (
                  <Button
                    variant="success"
                    onClick={() => setShowFinalizeResultsModal(true)}
                  >
                    <i className="fas fa-check-double me-2"></i>
                    Finalizar y Publicar Resultados
                  </Button>
                )}
                
                {election.resultsFinalized && (
                  <Button
                    as={Link}
                    to={`/elections/${electionId}/results`}
                    variant="primary"
                  >
                    <i className="fas fa-chart-pie me-2"></i>
                    Ver Resultados Públicos
                  </Button>
                )}
                
                <Button
                  variant="outline-primary"
                  onClick={() => window.alert('Exportar resultados')}
                >
                  <i className="fas fa-file-export me-2"></i>
                  Exportar Resultados
                </Button>
                
                {election.blockchain?.contractAddress && (
                  <Button
                    variant="outline-info"
                    onClick={() => window.alert('Verificar resultados en blockchain')}
                  >
                    <i className="fas fa-cube me-2"></i>
                    Verificar en Blockchain
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Ganador</h5>
            </Card.Header>
            <Card.Body>
              {election.totalVotes > 0 && election.candidates && election.candidates.length > 0 ? (
                (() => {
                  const sortedCandidates = [...election.candidates].sort((a, b) => 
                    (b.voteCount || 0) - (a.voteCount || 0)
                  );
                  
                  const winner = sortedCandidates[0];
                  const runnerUp = sortedCandidates[1];
                  
                  return (
                    <div className="text-center">
                      <div className="mb-3">
                        <div className="d-inline-block bg-light rounded-circle p-3 mb-3">
                          <i className="fas fa-trophy fa-3x text-warning"></i>
                        </div>
                        <h4>{winner.name}</h4>
                        <p className="text-muted mb-1">{winner.description}</p>
                        <h5>
                          {winner.voteCount || 0} votos 
                          <span className="text-muted ms-2">
                            ({((winner.voteCount || 0) / election.totalVotes * 100).toFixed(2)}%)
                          </span>
                        </h5>
                      </div>
                      
                      {runnerUp && (
                        <div className="mt-4 pt-3 border-top">
                          <p className="text-muted mb-1">Segundo Lugar</p>
                          <h5>{runnerUp.name}</h5>
                          <p>
                            {runnerUp.voteCount || 0} votos 
                            <span className="text-muted ms-2">
                              ({((runnerUp.voteCount || 0) / election.totalVotes * 100).toFixed(2)}%)
                            </span>
                          </p>
                          <p className="text-muted mb-0">
                            Diferencia: {((winner.voteCount || 0) - (runnerUp.voteCount || 0))} votos
                            <span className="ms-2">
                              ({(((winner.voteCount || 0) - (runnerUp.voteCount || 0)) / election.totalVotes * 100).toFixed(2)}%)
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-vote-yea fa-3x text-muted mb-3"></i>
                  <p className="mb-0">No hay votos suficientes para determinar un ganador</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Tab>
    
    {/* Pestaña de Blockchain */}
    <Tab eventKey="blockchain" title="Blockchain">
      <div className="text-center py-5">
        <h4 className="mb-3">Gestión de Blockchain</h4>
        <p className="mb-4">Esta funcionalidad se ha trasladado a un componente especializado.</p>
        <Button
          as={Link}
          to={`/admin/elections/${electionId}/blockchain`}
          variant="primary"
          size="lg"
        >
          <i className="fas fa-cube me-2"></i>
          Ir al Gestor de Blockchain
        </Button>
      </div>
    </Tab>
