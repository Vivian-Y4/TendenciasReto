import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVoteYea, faUsers, faChartBar, faClock } from '@fortawesome/free-solid-svg-icons';
import AuthContext from '../../context/AuthContext';
import { formatAddress } from '../../utils/web3Utils';
import { isElectionActive, formatTimestamp, hasElectionEnded } from '../../utils/contractUtils';

const Dashboard = () => {
  const { t } = useTranslation();
  const { isAuthenticated, userAddress, isAdmin } = useContext(AuthContext);
  const [activeElections, setActiveElections] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    totalVotes: 0,
    totalVoters: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch active elections
        const electionsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/active`);
        const electionsData = await electionsResponse.json();
        
        if (!electionsData.success) {
          throw new Error(electionsData.message || 'Failed to fetch elections');
        }
        
        setActiveElections(electionsData.elections || []);

        // Fetch statistics
        const statsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/stats`);
        const statsData = await statsResponse.json();
        
        if (!statsData.success) {
          throw new Error(statsData.message || 'Failed to fetch statistics');
        }
        
        setStats(statsData.stats || {
          totalElections: 0,
          activeElections: 0,
          totalVotes: 0,
          totalVoters: 0
        });

        // Fetch recent activity from unified admin endpoint
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const adminToken = localStorage.getItem('adminToken');
        let activityData = null;
        if (adminToken) {
          const response = await fetch(`${apiUrl}/api/admin/activity?limit=5&page=1`, {
            headers: {
              'x-auth-token': adminToken
            }
          });
          activityData = await response.json();
          if (!activityData.success) {
            throw new Error(activityData.message || 'Failed to fetch activity');
          }
          // The API returns data in `data` array
          setRecentActivity(activityData.data || []);
        } else {
          setRecentActivity([]);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (election) => {
    if (isElectionActive(election)) {
      return <Badge bg="success">{t('elections.status.active')}</Badge>;
    } else if (hasElectionEnded(election)) {
      return <Badge bg="secondary">{t('elections.status.ended')}</Badge>;
    } else {
      return <Badge bg="warning">{t('elections.status.upcoming')}</Badge>;
    }
  };

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">{t('common.loading')}...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">{t('dashboard.title')}</h1>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
          <Button 
            variant="outline-danger" 
            size="sm" 
            className="ms-3"
            onClick={() => window.location.reload()}
          >
            {t('errors.retry')}
          </Button>
        </Alert>
      )}

      {/* Welcome Section */}
      <Card className="mb-4 bg-primary text-white shadow">
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <h2>{t('dashboard.welcome.title')}</h2>
              <p className="mb-0">
                {isAuthenticated 
                  ? t('dashboard.welcome.authenticated', { address: formatAddress(userAddress) })
                  : t('dashboard.welcome.not_authenticated')}
              </p>
              {!isAuthenticated && (
                <Button 
                  as={Link} 
                  to="/login" 
                  variant="light" 
                  className="mt-3"
                >
                  {t('auth.connect_button')}
                </Button>
              )}
            </Col>
            <Col md={4} className="text-center text-md-end">
              <FontAwesomeIcon icon={faVoteYea} size="4x" className="text-white-50" />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Statistics Row */}
      <h3 className="mb-3">{t('dashboard.platform_stats')}</h3>
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faVoteYea} size="2x" className="text-primary mb-3" />
              <h4>{stats.totalElections || 0}</h4>
              <p className="text-muted mb-0">{t('admin.stats.total_elections')}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faClock} size="2x" className="text-success mb-3" />
              <h4>{stats.activeElections || 0}</h4>
              <p className="text-muted mb-0">{t('dashboard.stats.active_elections')}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faUsers} size="2x" className="text-info mb-3" />
              <h4>{stats.totalVoters || 0}</h4>
              <p className="text-muted mb-0">{t('admin.stats.registered_voters')}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faChartBar} size="2x" className="text-warning mb-3" />
              <h4>{stats.totalVotes || 0}</h4>
              <p className="text-muted mb-0">{t('admin.stats.total_votes')}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Active Elections */}
      <h3 className="mb-3">{t('dashboard.active_elections')}</h3>
      <Row className="mb-4">
        {activeElections.length === 0 ? (
          <Col>
            <Card className="shadow-sm">
              <Card.Body className="text-center py-4">
                <p className="mb-0">{t('dashboard.no_active_elections')}</p>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          activeElections.slice(0, 3).map((election) => (
            <Col md={4} className="mb-3" key={election.id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="text-truncate">{election.title}</Card.Title>
                    {getStatusBadge(election)}
                  </div>
                  <Card.Text className="text-muted small text-truncate">{election.description}</Card.Text>
                  <div className="small mb-3">
                    <div><strong>{t('elections.fields.end')}:</strong> {formatTimestamp(election.endTime)}</div>
                    <div><strong>{t('elections.fields.candidates')}:</strong> {election.candidateCount}</div>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white">
                  <Button 
                    as={Link} 
                    to={`/elections/${election.id}`} 
                    variant="outline-primary" 
                    className="w-100"
                  >
                    {t('elections.details_button')}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))
        )}
        <Col xs={12} className="text-center mt-2">
          <Button 
            as={Link} 
            to="/elections" 
            variant="primary"
          >
            {t('dashboard.view_all_elections')}
          </Button>
        </Col>
      </Row>

      {/* Admin Section (if user is admin) */}
      {isAdmin && (
        <div className="mb-4">
          <h3 className="mb-3">{t('dashboard.admin_section')}</h3>
          <Row>
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column">
                  <h4>{t('dashboard.admin_cards.create')}</h4>
                  <p className="text-muted flex-grow-1">{t('dashboard.admin_cards.create_text')}</p>
                  <Button 
                    as={Link} 
                    to="/admin/create-election" 
                    variant="success"
                  >
                    {t('admin.create_button')}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column">
                  <h4>{t('dashboard.admin_cards.manage')}</h4>
                  <p className="text-muted flex-grow-1">{t('dashboard.admin_cards.manage_text')}</p>
                  <Button 
                    as={Link} 
                    to="/admin" 
                    variant="info"
                  >
                    {t('dashboard.admin_cards.manage_button')}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column">
                  <h4>{t('dashboard.admin_cards.analytics')}</h4>
                  <p className="text-muted flex-grow-1">{t('dashboard.admin_cards.analytics_text')}</p>
                  <Button 
                    as={Link} 
                    to="/admin/statistics" 
                    variant="warning"
                  >
                    {t('dashboard.admin_cards.analytics_button')}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* Recent Activity */}
      <h3 className="mb-3">{t('admin.activity.title')}</h3>
      <Card className="shadow-sm">
        <Card.Body>
          {recentActivity.length === 0 ? (
            <p className="text-center mb-0">{t('dashboard.no_recent_activity')}</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {recentActivity.map((activity, index) => (
                <li key={index} className={index !== recentActivity.length - 1 ? "mb-3 pb-3 border-bottom" : ""}>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <Badge 
                        pill 
                        bg={activity.type === 'vote' ? 'success' : 
                           activity.type === 'create' ? 'primary' : 
                           activity.type === 'end' ? 'secondary' : 
                           'info'}
                      >
                        {activity.type.charAt(0).toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="mb-0">{activity.description}</p>
                      <small className="text-muted">{new Date(activity.timestamp).toLocaleString()}</small>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Dashboard;
