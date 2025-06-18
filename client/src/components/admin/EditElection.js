import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Breadcrumb } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
import { formatTimestamp } from '../../utils/contractUtils';

const EditElection = () => {
  const { t } = useTranslation();
  const { electionId } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    candidates: []
  });
  
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const fetchElection = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch election details
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || t('admin.election_fetch_error'));
      }
      
      const election = data.election;
      
      // Format dates and times from timestamp
      const startDate = new Date(election.startTime * 1000);
      
      // Only allow editing if election hasn't started yet
      if (startDate <= new Date()) {
        toast.error(t('admin.edit.already_started'));
        navigate('/admin');
        return;
      }
      
      setOriginalData(election);
      
      setFormData({
        title: election.title,
        description: election.description,
        candidates: election.candidates.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description
        }))
      });
      
      setError('');
    } catch (error) {
      console.error('Error fetching election details:', error);
      setError(error.message || t('admin.election_fetch_error'));
      toast.error(error.message || t('admin.election_fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [electionId, navigate, t]);
  
  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }
    
    fetchElection();
  }, [isAuthenticated, isAdmin, navigate, fetchElection]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleCandidateChange = (index, field, value) => {
    const updatedCandidates = [...formData.candidates];
    updatedCandidates[index][field] = value;
    
    setFormData({
      ...formData,
      candidates: updatedCandidates
    });
  };
  
  const validateForm = () => {
    if (!formData.title.trim()) {
      setError(t('admin.create_election.title_required'));
      return false;
    }
    
    if (!formData.description.trim()) {
      setError(t('admin.create_election.description_required'));
      return false;
    }
    
    // Validate candidates
    const invalidCandidates = formData.candidates.some(c => !c.name.trim() || !c.description.trim());
    
    if (invalidCandidates) {
      setError(t('admin.create_election.invalid_candidates'));
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Edit the election using API
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify(formData)
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || t('admin.edit.update_error'));
      }
      
      toast.success(t('admin.edit.update_success'));
      
      // Redirect to admin dashboard
      navigate('/admin');
      
    } catch (error) {
      console.error('Error updating election:', error);
      setError(error.message || t('admin.edit.update_failed'));
      toast.error(error.message || t('admin.edit.update_failed'));
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Container>
        {/* Breadcrumb navigation */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item linkAs={Link} linkProps={{to: '/admin'}}>
            {t('admin.title')}
          </Breadcrumb.Item>
          <Breadcrumb.Item active>
            {t('admin.edit.title')}
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
        
        <h2 className="mb-4">{t('admin.edit.title')}</h2>
        <div className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">{t('common.loading')}</span>
          </Spinner>
          <p className="mt-3">{t('admin.edit.loading_election')}</p>
        </div>
      </Container>
    );
  }
  
  return (
    <Container>
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{to: '/admin'}}>
          {t('admin.title')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {t('admin.edit.title')}
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
      
      <h2 className="mb-4">{t('admin.edit.title')}</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="title">
              <Form.Label>{t('admin.create_election.fields.title')}</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder={t('admin.create_election.fields.title_placeholder')}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-4" controlId="description">
              <Form.Label>{t('admin.create_election.fields.description')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t('admin.create_election.fields.description_placeholder')}
                required
              />
            </Form.Group>
            
            <div className="mb-3">
              <Row>
                <Col md={6}>
                  <Form.Group controlId="startTime">
                    <Form.Label>{t('admin.edit.current_start')}</Form.Label>
                    <Form.Control
                      plaintext
                      readOnly
                      value={formatTimestamp(originalData?.startTime)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="endTime">
                    <Form.Label>{t('admin.edit.current_end')}</Form.Label>
                    <Form.Control
                      plaintext
                      readOnly
                      value={formatTimestamp(originalData?.endTime)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <small className="text-muted">
                {t('admin.edit.time_note')}
              </small>
            </div>
            
            <hr />
            
            <h5 className="mb-3">{t('admin.create_election.candidates_section')}</h5>
            
            {formData.candidates.map((candidate, index) => (
              <Card key={index} className="mb-3 border">
                <Card.Body>
                  <h6 className="mb-3">{t('admin.create_election.candidate.title')} #{index + 1}</h6>
                  
                  <Row>
                    <Col md={12} className="mb-3">
                      <Form.Group controlId={`candidate-${index}-name`}>
                        <Form.Label>{t('admin.create_election.candidate.name')}</Form.Label>
                        <Form.Control
                          type="text"
                          value={candidate.name}
                          onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                          placeholder={t('admin.create_election.candidate.name_placeholder')}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group controlId={`candidate-${index}-description`}>
                        <Form.Label>{t('admin.create_election.candidate.description')}</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={candidate.description}
                          onChange={(e) => handleCandidateChange(index, 'description', e.target.value)}
                          placeholder={t('admin.create_election.candidate.description_placeholder')}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
            
            <div className="d-grid gap-2 mt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
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
                    {t('admin.edit.updating')}
                  </>
                ) : (
                  t('admin.edit.update_button')
                )}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => navigate('/admin')}
                disabled={submitting}
              >
                {t('admin.create_election.buttons.cancel')}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default EditElection;
