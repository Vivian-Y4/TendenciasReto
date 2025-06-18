import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Table, Form, Button, Alert, Spinner, InputGroup, Badge, Modal, Breadcrumb } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AdminContext from '../../context/AdminContext';
import { isElectionActive, hasElectionEnded } from '../../utils/contractUtils';

const ManageVoters = () => {
  const { t } = useTranslation();
  const { electionId } = useParams();
  const { isAdminAuthenticated, adminPermissions, adminLoading } = useContext(AdminContext);

  const [election, setElection] = useState(null);
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [newVoterIdentifier, setNewVoterIdentifier] = useState(''); // Changed from newVoterAddress
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [voterToRemove, setVoterToRemove] = useState(null); // This will hold the voter object { identifier: '...' }
  const [bulkIdentifiers, setBulkIdentifiers] = useState(''); // Changed from bulkAddresses
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchElectionAndVoters = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch election details
      const electionResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/api/elections/${electionId}`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      const electionData = await electionResponse.json();
      if (!electionData.success) {
        throw new Error(electionData.message || t('admin.voters.election_fetch_error'));
      }
      setElection(electionData.election);
      // Fetch voters for this election
      const votersResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/api/elections/${electionId}/voters`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      const votersData = await votersResponse.json();
      if (!votersData.success) {
        throw new Error(votersData.message || t('admin.voters.voters_fetch_error'));
      }
      setVoters(votersData.voters || []);
      setFilteredVoters(votersData.voters || []);
    } catch (error) {
      setError(error.message || t('admin.voters.fetch_error'));
      toast.error(error.message || t('admin.voters.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated && adminPermissions) {
      fetchElectionAndVoters();
    }
  }, [isAdminAuthenticated, adminPermissions, electionId]);

  useEffect(() => {
    // Filter voters based on search term
    if (searchTerm.trim() === '') {
      setFilteredVoters(voters);
    } else {
      // Assuming voter object now has 'identifier' instead of 'address' for searching
      const filtered = voters.filter(voter =>
        (voter.identifier && voter.identifier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (voter.name && voter.name.toLowerCase().includes(searchTerm.toLowerCase())) // Keep name search if applicable
      );
      setFilteredVoters(filtered);
    }
  }, [searchTerm, voters]);

  const validateBytes32 = (identifier) => {
    return /^0x[a-fA-F0-9]{64}$/.test(identifier);
  };

  const handleAddVoter = async () => {
    if (!validateBytes32(newVoterIdentifier)) {
      toast.error(t('admin.voters.invalid_identifier_format', 'Formato de identificador inválido. Debe ser un string hexadecimal de 32 bytes (0x...).'));
      return;
    }
    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/elections/${electionId}/voters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('adminToken')
          },
          body: JSON.stringify({
            voterIdentifier: newVoterIdentifier // Changed from voterAddress
          })
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || t('admin.voters.add_error'));
      }
      toast.success(t('admin.voters.add_success'));
      setNewVoterIdentifier(''); // Clear newVoterIdentifier
      setShowAddModal(false);
      fetchElectionAndVoters();
    } catch (error) {
      toast.error(error.message || t('admin.voters.add_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAddVoters = async () => {
    const identifiersArray = bulkIdentifiers.split(/[\s,]+/) // Changed from bulkAddresses
      .map(id => id.trim())
      .filter(id => id.length > 0);
    const invalidIdentifiers = identifiersArray.filter(id => !validateBytes32(id)); // Changed validation
    if (invalidIdentifiers.length > 0) {
      toast.error(t('admin.voters.some_invalid_identifiers', 'Algunos identificadores tienen formato inválido.'));
      return;
    }
    if (identifiersArray.length === 0) {
      toast.error(t('admin.voters.no_identifiers', 'No se proporcionaron identificadores.'));
      return;
    }
    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/elections/${electionId}/voters/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('adminToken')
          },
          body: JSON.stringify({
            voterIdentifiers: identifiersArray // Changed from addresses
          })
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || t('admin.voters.bulk_add_error'));
      }
      toast.success(t('admin.voters.bulk_add_success', { count: identifiersArray.length }));
      setBulkIdentifiers(''); // Clear bulkIdentifiers
      setShowBulkModal(false);
      fetchElectionAndVoters();
    } catch (error) {
      toast.error(error.message || t('admin.voters.bulk_add_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const openRemoveModal = (voter) => {
    setVoterToRemove(voter);
    setShowRemoveModal(true);
  };

  const handleRemoveVoter = async () => {
    if (!voterToRemove) return;
    try {
      setActionLoading(true);
      // Assuming voterToRemove object now has 'identifier' property
      const voterIdentifierToRemove = voterToRemove.identifier || voterToRemove.id; // Adapt based on actual voter object structure
      if (!voterIdentifierToRemove) {
        toast.error("Error: Voter identifier missing for removal.");
        setActionLoading(false);
        return;
      }
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/elections/${electionId}/voters/${voterIdentifierToRemove}`,
        {
          method: 'DELETE',
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || t('admin.voters.remove_error'));
      }
      toast.success(t('admin.voters.remove_success'));
      setShowRemoveModal(false);
      setVoterToRemove(null);
      fetchElectionAndVoters();
    } catch (error) {
      toast.error(error.message || t('admin.voters.remove_error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Si está cargando, muestra spinner
  if (adminLoading || loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">{t('common.loading')}</span>
        </Spinner>
        <p className="mt-3">{t('admin.voters.loading')}</p>
      </Container>
    );
  }

  // Si no eres admin o no estás autenticado, no muestres nada (la protección ya la hace AdminRoute)
  if (!isAdminAuthenticated || !adminPermissions) {
    return null;
  }

  // Determine if we can modify voters (only before election starts)
  const canModifyVoters = election && !isElectionActive(election) && !hasElectionEnded(election);

  return (
    <Container>
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{to: '/admin'}}>
          {t('admin.title')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {t('admin.voters.title')}
        </Breadcrumb.Item>
      </Breadcrumb>
      {/* Back button */}
      <div className="mb-4">
        <Button 
          as={Link} 
          to="/admin" 
          variant="outline-secondary" 
          size="sm"
          className="d-flex align-items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i>
          {t('common.back')}
        </Button>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>{t('admin.voters.title')}</h2>
          <p className="text-muted">
            {election ? election.title : ''} - {t('admin.voters.registered_count', { count: voters.length })}
          </p>
        </div>
        <Button variant="outline-secondary" as={Link} to="/admin">
          <i className="fas fa-arrow-left me-2"></i>
          {t('common.back')}
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {!canModifyVoters && (
        <Alert variant="warning">
          <i className="fas fa-info-circle me-2"></i>
          {t('admin.voters.cannot_modify')}
        </Alert>
      )}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Form.Group className="mb-0" style={{ width: '60%' }}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={t('admin.voters.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Form.Group>
            <div>
              <Button
                variant="success"
                className="me-2"
                onClick={() => setShowAddModal(true)}
                disabled={!canModifyVoters}
              >
                <i className="fas fa-plus me-2"></i>
                {t('admin.voters.add_voter')}
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => setShowBulkModal(true)}
                disabled={!canModifyVoters}
              >
                <i className="fas fa-upload me-2"></i>
                {t('admin.voters.bulk_add')}
              </Button>
            </div>
          </div>
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('admin.voters.identifier', 'Identifier')}</th>
                  <th>{t('admin.voters.registration_date')}</th>
                  <th>{t('admin.voters.status')}</th>
                  <th>{t('admin.voters.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-3">
                      {searchTerm ? t('admin.voters.no_results') : t('admin.voters.no_voters')}
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((voter, index) => (
                    // Assuming voter object has 'identifier' and 'id' or unique key
                    <tr key={voter.id || voter.identifier}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <span className="d-inline-block text-truncate" style={{ maxWidth: '250px' }}>
                            {voter.identifier} {/* Display identifier */}
                          </span>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 ms-2"
                            onClick={() => {
                              navigator.clipboard.writeText(voter.identifier);
                              toast.info(t('common.copied_to_clipboard'));
                            }}
                          >
                            <i className="fas fa-copy"></i>
                          </Button>
                        </div>
                      </td>
                      <td>{new Date(voter.registeredAt).toLocaleString()}</td>
                      <td>
                        {voter.hasVoted ? (
                          <Badge bg="success">{t('admin.voters.has_voted')}</Badge>
                        ) : (
                          <Badge bg="secondary">{t('admin.voters.not_voted')}</Badge>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => openRemoveModal(voter)} // voter object passed here
                          disabled={!canModifyVoters || voter.hasVoted}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          {filteredVoters.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">
                {searchTerm ?
                  t('admin.voters.showing_filtered', { count: filteredVoters.length, total: voters.length }) :
                  t('admin.voters.showing_all', { count: voters.length })}
              </small>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setSearchTerm('')}
                disabled={!searchTerm}
              >
                {t('admin.voters.clear_search')}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      {/* Add Voter Modal */}
      <Modal show={showAddModal} onHide={() => !actionLoading && setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.voters.add_voter_identifier', 'Add Voter by Identifier')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="voterIdentifier">
            <Form.Label>{t('admin.voters.enter_identifier', 'Enter Voter Identifier (bytes32)')}</Form.Label>
            <Form.Control
              type="text"
              placeholder="0x..."
              value={newVoterIdentifier}
              onChange={(e) => setNewVoterIdentifier(e.target.value)}
              disabled={actionLoading}
            />
            <Form.Text className="text-muted">
              {t('admin.voters.identifier_format_help', 'Must be a 32-byte hexadecimal string, e.g., 0x123...abc.')}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={actionLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="success" onClick={handleAddVoter} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.processing')}
              </>
            ) : (
              t('admin.voters.add')
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Bulk Add Voters Modal */}
      <Modal
        show={showBulkModal}
        onHide={() => !actionLoading && setShowBulkModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.voters.bulk_add_identifiers', 'Bulk Add Voter Identifiers')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="bulkIdentifiers">
            <Form.Label>{t('admin.voters.enter_identifiers_list', 'Enter Voter Identifiers (bytes32, one per line or separated by comma/space)')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              placeholder="0xabc...def\n0x123...789"
              value={bulkIdentifiers}
              onChange={(e) => setBulkIdentifiers(e.target.value)}
              disabled={actionLoading}
            />
            <Form.Text className="text-muted">
              {t('admin.voters.identifiers_format_help', 'Each identifier must be a 32-byte hex string.')}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkModal(false)} disabled={actionLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="success" onClick={handleBulkAddVoters} disabled={actionLoading || !bulkIdentifiers.trim()}>
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.processing')}
              </>
            ) : (
              t('admin.voters.add_multiple')
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Remove Voter Confirmation Modal */}
      <Modal
        show={showRemoveModal}
        onHide={() => !actionLoading && setShowRemoveModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.voters.remove_voter_identifier', 'Remove Voter by Identifier')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('admin.voters.remove_confirm_identifier', 'Are you sure you want to remove the following voter identifier from this election?')}</p>
          <div className="bg-light p-3 rounded mb-3">
            <code>{voterToRemove?.identifier}</code> {/* Display identifier to remove */}
          </div>
          <Alert variant="warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {t('admin.voters.remove_warning')}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveModal(false)} disabled={actionLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleRemoveVoter} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.processing')}
              </>
            ) : (
              t('admin.voters.remove')
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageVoters;