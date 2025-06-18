// Continuación del componente ElectionDetailAdmin
// Este fragmento se integrará con las partes 1, 2 y 3

// Justo después de cerrar el componente Tabs, agregaríamos los modales:

  {/* Modal de Finalizar Elección */}
  <Modal show={showEndElectionModal} onHide={() => setShowEndElectionModal(false)}>
    <Modal.Header closeButton>
      <Modal.Title>Finalizar Elección</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>¿Estás seguro de que deseas finalizar esta elección?</p>
      <Alert variant="warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Esta acción cerrará la votación inmediatamente, incluso si la fecha de finalización programada aún no ha llegado.
      </Alert>
      
      <p className="mb-0">
        <strong>Título:</strong> {election?.title}
      </p>
      <p className="mb-0">
        <strong>Votos actuales:</strong> {election?.totalVotes || 0}
      </p>
      {election?.settings?.minParticipation && election?.allowedVoters?.length > 0 && (
        <p className="mt-3">
          <strong>Participación:</strong>{' '}
          {((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2)}%
          {((election.totalVotes / election.allowedVoters.length * 100) < election.settings.minParticipation) && (
            <Alert variant="danger" className="mt-2">
              <i className="fas fa-exclamation-circle me-2"></i>
              La participación está por debajo del mínimo requerido ({election.settings.minParticipation}%).
              Los resultados podrían no ser considerados válidos.
            </Alert>
          )}
        </p>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="secondary" 
        onClick={() => setShowEndElectionModal(false)}
        disabled={actionLoading}
      >
        Cancelar
      </Button>
      <Button 
        variant="warning" 
        onClick={handleEndElection}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Finalizando...
          </>
        ) : (
          <>
            <i className="fas fa-stop-circle me-2"></i>
            Sí, Finalizar Elección
          </>
        )}
      </Button>
    </Modal.Footer>
  </Modal>
  
  {/* Modal de Finalizar Resultados */}
  <Modal show={showFinalizeResultsModal} onHide={() => setShowFinalizeResultsModal(false)}>
    <Modal.Header closeButton>
      <Modal.Title>Finalizar y Publicar Resultados</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>¿Estás seguro de que deseas finalizar y publicar los resultados de esta elección?</p>
      <Alert variant="info">
        <i className="fas fa-info-circle me-2"></i>
        Esta acción marcará los resultados como oficiales y los hará visibles públicamente.
        Esta operación no se puede deshacer.
      </Alert>
      
      <p className="mb-0">
        <strong>Título:</strong> {election?.title}
      </p>
      <p className="mb-0">
        <strong>Votos totales:</strong> {election?.totalVotes || 0}
      </p>
      
      {election?.settings?.minParticipation && election?.allowedVoters?.length > 0 && 
      ((election.totalVotes / election.allowedVoters.length * 100) < election.settings.minParticipation) && (
        <Alert variant="danger" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> La participación ({((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2)}%)
          está por debajo del mínimo requerido ({election.settings.minParticipation}%).
          <p className="mb-0 mt-2">
            ¿Estás seguro de que deseas finalizar los resultados a pesar de la baja participación?
          </p>
        </Alert>
      )}
      
      {election?.candidates && election.candidates.length > 0 && election.totalVotes > 0 && (
        <div className="mt-3">
          <p className="mb-2"><strong>Resultados actuales:</strong></p>
          <ul className="list-group">
            {[...election.candidates]
              .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
              .slice(0, 3)
              .map((candidate, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  {candidate.name}
                  <span>
                    {candidate.voteCount || 0} votos 
                    <span className="text-muted ms-2">
                      ({((candidate.voteCount || 0) / election.totalVotes * 100).toFixed(2)}%)
                    </span>
                  </span>
                </li>
              ))
            }
          </ul>
        </div>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="secondary" 
        onClick={() => setShowFinalizeResultsModal(false)}
        disabled={actionLoading}
      >
        Cancelar
      </Button>
      <Button 
        variant="success" 
        onClick={handleFinalizeResults}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Finalizando...
          </>
        ) : (
          <>
            <i className="fas fa-check-double me-2"></i>
            Sí, Finalizar y Publicar Resultados
          </>
        )}
      </Button>
    </Modal.Footer>
  </Modal>
  
  {/* Modal de Eliminar Elección */}
  <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
    <Modal.Header closeButton>
      <Modal.Title>Eliminar Elección</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>¿Estás seguro de que deseas eliminar esta elección?</p>
      <Alert variant="danger">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Esta acción eliminará permanentemente la elección y todos sus datos asociados.
        Esta operación no se puede deshacer.
      </Alert>
      
      <p className="mb-0">
        <strong>Título:</strong> {election?.title}
      </p>
      <p className="mb-0">
        <strong>ID:</strong> {election?._id}
      </p>
      
      {isElectionActive(election) && (
        <Alert variant="warning" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> Esta elección está actualmente activa.
          No se recomienda eliminar elecciones activas.
        </Alert>
      )}
      
      {election?.resultsFinalized && (
        <Alert variant="warning" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> Esta elección tiene resultados finalizados.
          No se recomienda eliminar elecciones con resultados publicados.
        </Alert>
      )}
      
      {election?.blockchain?.contractAddress && (
        <Alert variant="warning" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> Esta elección está desplegada en la blockchain.
          El contrato inteligente seguirá existiendo en la blockchain aunque elimines la elección de la base de datos.
        </Alert>
      )}
      
      <div className="mt-3">
        <p className="mb-2 fw-bold">Confirma que entiendes las consecuencias:</p>
        <p className="mb-0">Por favor, escribe "ELIMINAR" en el siguiente campo para confirmar:</p>
        <input 
          type="text" 
          className="form-control mt-2" 
          placeholder="ELIMINAR"
          onChange={(e) => {
            if (e.target.value === "ELIMINAR") {
              // Habilitaría el botón de eliminar
            }
          }}
        />
      </div>
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="secondary" 
        onClick={() => setShowDeleteModal(false)}
        disabled={actionLoading}
      >
        Cancelar
      </Button>
      <Button 
        variant="danger" 
        onClick={handleDeleteElection}
        disabled={actionLoading /* o la condición de validación del campo de texto */}
      >
        {actionLoading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Eliminando...
          </>
        ) : (
          <>
            <i className="fas fa-trash-alt me-2"></i>
            Eliminar Permanentemente
          </>
        )}
      </Button>
    </Modal.Footer>
  </Modal>
