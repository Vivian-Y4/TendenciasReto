import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Container, Card, Row, Col, Alert, Spinner, Button, Tabs, Tab, Breadcrumb } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Chart from 'chart.js/auto';
import AuthContext from '../../context/AuthContext';
import { formatTimestamp } from '../../utils/contractUtils';

const ElectionStatistics = () => {
  const { t } = useTranslation();
  const { electionId } = useParams();
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Refs for charts
  const votesChartRef = useRef(null);
  const votesChartInstance = useRef(null);
  const voterParticipationRef = useRef(null);
  const voterParticipationInstance = useRef(null);
  const timeDistributionRef = useRef(null);
  const timeDistributionInstance = useRef(null);
  
  // Función para obtener los datos de la elección y estadísticas
  const fetchElectionStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch election details
      const electionResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      
      const electionData = await electionResponse.json();
      
      if (!electionData.success) {
        throw new Error(electionData.message || t('admin.stats.election_fetch_error'));
      }
      
      setElection(electionData.election);
      
      // Fetch election statistics
      const statsResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}/statistics`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      
      const statsData = await statsResponse.json();
      
      if (!statsData.success) {
        throw new Error(statsData.message || t('admin.stats.stats_fetch_error'));
      }
      
      setStats(statsData.statistics);
      
      // Small delay to ensure DOM elements are ready
      setTimeout(() => {
        if (statsData.statistics) {
          renderCharts(statsData.statistics);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error fetching election statistics:', error);
      setError(error.message || t('admin.stats.fetch_error'));
      toast.error(error.message || t('admin.stats.fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [electionId, t]);

  // Effect para cargar datos al montar el componente
  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }
    
    fetchElectionStats();
    
    // Cleanup charts on unmount
    return () => {
      if (votesChartInstance.current) {
        votesChartInstance.current.destroy();
      }
      if (voterParticipationInstance.current) {
        voterParticipationInstance.current.destroy();
      }
      if (timeDistributionInstance.current) {
        timeDistributionInstance.current.destroy();
      }
    };
  }, [isAuthenticated, isAdmin, navigate, fetchElectionStats]);

  const renderCharts = (statistics) => {
    // 1. Votes Distribution Chart
    renderVotesChart(statistics);
    
    // 2. Voter Participation Chart
    renderParticipationChart(statistics);
    
    // 3. Vote Time Distribution (if available)
    if (statistics.voteTimeDistribution) {
      renderTimeDistributionChart(statistics.voteTimeDistribution);
    }
  };

  const renderVotesChart = (statistics) => {
    // Clear previous chart
    if (votesChartInstance.current) {
      votesChartInstance.current.destroy();
    }

    const ctx = votesChartRef.current.getContext('2d');
    
    const labels = statistics.candidateStats.map(c => c.name);
    const data = statistics.candidateStats.map(c => c.voteCount);
    
    // Generate colors dynamically
    const backgroundColors = generateColors(labels.length, 0.7);
    const borderColors = generateColors(labels.length, 1);
    
    votesChartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: t('admin.stats.votes'),
          data: data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(2) + '%';
                return `${context.label}: ${value} (${percentage})`;
              }
            }
          }
        }
      }
    });
  };

  const renderParticipationChart = (statistics) => {
    // Clear previous chart
    if (voterParticipationInstance.current) {
      voterParticipationInstance.current.destroy();
    }

    const ctx = voterParticipationRef.current.getContext('2d');
    
    const notVoted = statistics.totalRegisteredVoters - statistics.totalVotesCast;
    
    voterParticipationInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [t('admin.stats.voted'), t('admin.stats.not_voted')],
        datasets: [{
          data: [statistics.totalVotesCast, notVoted],
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(201, 203, 207, 0.7)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(201, 203, 207, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(2) + '%';
                return `${context.label}: ${value} (${percentage})`;
              }
            }
          }
        }
      }
    });
  };

  const renderTimeDistributionChart = (timeDistribution) => {
    // Clear previous chart
    if (timeDistributionInstance.current) {
      timeDistributionInstance.current.destroy();
    }

    const ctx = timeDistributionRef.current.getContext('2d');
    
    // Extract data for chart
    const labels = Object.keys(timeDistribution);
    const data = Object.values(timeDistribution);
    
    timeDistributionInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: t('admin.stats.number_of_votes'),
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            title: {
              display: true,
              text: t('admin.stats.votes_count')
            }
          },
          x: {
            title: {
              display: true,
              text: t('admin.stats.time_period')
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  };

  const generateColors = (count, alpha = 1) => {
    const colors = [];
    const hueStep = 360 / count;
    
    for (let i = 0; i < count; i++) {
      // Create a hue rotation around the color wheel
      const hue = i * hueStep;
      
      // Keep saturation and lightness consistent
      const saturation = 65; // %
      const lightness = 65; // %
      
      // Use HSL color format with specified alpha
      colors.push(`hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
    }
    
    return colors;
  };

  const downloadReport = () => {
    if (!stats || !election) return;
    
    try {
      // Create report content
      let reportContent = `# ${election.title} - ${t('admin.stats.title')}\n`;
      reportContent += `${t('election_details.info.results_finalized')}: ${election.resultsFinalized ? 'Sí' : 'No'}\n`;
      reportContent += `${t('admin.stats.registered_voters')}: ${stats.totalRegisteredVoters}\n`;
      reportContent += `${t('admin.stats.votes_cast')}: ${stats.totalVotesCast}\n`;
      reportContent += `${t('admin.stats.participation_rate')}: ${stats.totalRegisteredVoters > 0 ? 
        (stats.totalVotesCast / stats.totalRegisteredVoters * 100).toFixed(2) : 0}%\n\n`;
      
      // Add candidate results
      reportContent += `## ${t('admin.stats.voting_results')}\n`;
      reportContent += `| ${t('admin.stats.candidate')} | ${t('admin.stats.votes')} | ${t('admin.stats.percentage')} |\n`;
      reportContent += `| --- | --- | --- |\n`;
      
      stats.candidateStats.forEach(candidate => {
        const percentage = stats.totalVotesCast > 0 ? 
          (candidate.voteCount / stats.totalVotesCast * 100).toFixed(2) : 0;
        reportContent += `| ${candidate.name} | ${candidate.voteCount} | ${percentage}% |\n`;
      });
      
      // Create download link
      const element = document.createElement('a');
      const file = new Blob([reportContent], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `election_${electionId}_report.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast.success(t('common.copied_to_clipboard'));
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report');
    }
  };

  return (
    <Container>
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{to: '/admin'}}>
          {t('admin.title')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {t('admin.stats.title')}
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
      
      <h2 className="mb-4">{t('admin.stats.title')}</h2>
      
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">{t('admin.stats.loading')}</p>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : !stats ? (
        <Alert variant="info">{t('admin.stats.no_stats_available')}</Alert>
      ) : (
        <>
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">{election.title}</h5>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={downloadReport}
                      className="d-flex align-items-center gap-2"
                    >
                      <i className="fas fa-download"></i>
                      {t('admin.stats.download_report')}
                    </Button>
                  </div>
                  
                  <Row className="g-4 mb-4">
                    <Col md={4}>
                      <div className="border rounded p-3 text-center">
                        <h6>{t('admin.stats.registered_voters')}</h6>
                        <h3>{stats.totalRegisteredVoters}</h3>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-3 text-center">
                        <h6>{t('admin.stats.votes_cast')}</h6>
                        <h3>{stats.totalVotesCast}</h3>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-3 text-center">
                        <h6>{t('admin.stats.participation_rate')}</h6>
                        <h3>
                          {stats.totalRegisteredVoters > 0 ? 
                            `${(stats.totalVotesCast / stats.totalRegisteredVoters * 100).toFixed(2)}%` : 
                            '0%'}
                        </h3>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Tabs defaultActiveKey="results" id="election-stats-tabs" className="mb-4">
            <Tab eventKey="results" title={t('admin.stats.voting_results')}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h5 className="mb-4">{t('admin.stats.candidate_votes')}</h5>
                  
                  <div className="chart-container" style={{ position: 'relative', height: '300px', maxWidth: '600px', margin: '0 auto' }}>
                    <canvas ref={votesChartRef}></canvas>
                  </div>
                  
                  <div className="table-responsive mt-4">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>{t('admin.stats.candidate')}</th>
                          <th>{t('admin.stats.votes')}</th>
                          <th>{t('admin.stats.percentage')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.candidateStats.map((candidate, index) => (
                          <tr key={index}>
                            <td>{candidate.name}</td>
                            <td>{candidate.voteCount}</td>
                            <td>
                              {stats.totalVotesCast > 0 ? 
                                `${(candidate.voteCount / stats.totalVotesCast * 100).toFixed(2)}%` : 
                                '0%'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="participation" title={t('admin.stats.voter_participation')}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h5 className="mb-4">{t('admin.stats.participation')}</h5>
                  
                  <div className="chart-container" style={{ position: 'relative', height: '300px', maxWidth: '600px', margin: '0 auto' }}>
                    <canvas ref={voterParticipationRef}></canvas>
                  </div>
                  
                  <div className="text-center mt-4">
                    <div className="row justify-content-center">
                      <div className="col-md-4">
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6>{t('admin.stats.participation_summary')}</h6>
                            <p className="mb-1">
                              <strong>{t('admin.stats.registered')}:</strong> {stats.totalRegisteredVoters}
                            </p>
                            <p className="mb-1">
                              <strong>{t('admin.stats.voted')}:</strong> {stats.totalVotesCast}
                            </p>
                            <p className="mb-1">
                              <strong>{t('admin.stats.not_voted')}:</strong> {stats.totalRegisteredVoters - stats.totalVotesCast}
                            </p>
                            <p className="mb-0">
                              <strong>{t('admin.stats.participation_rate')}:</strong> 
                              {stats.totalRegisteredVoters > 0 ? 
                                `${(stats.totalVotesCast / stats.totalRegisteredVoters * 100).toFixed(2)}%` : 
                                '0%'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            
            {stats.voteTimeDistribution && (
              <Tab eventKey="timing" title={t('admin.stats.voting_timeline')}>
                <Card className="shadow-sm">
                  <Card.Body>
                    <h5 className="mb-4">{t('admin.stats.voting_activity')}</h5>
                    
                    <div className="chart-container" style={{ position: 'relative', height: '300px', margin: '0 auto' }}>
                      <canvas ref={timeDistributionRef}></canvas>
                    </div>
                    
                    <p className="text-center text-muted mt-3">
                      {t('admin.stats.votes_over_time')}
                    </p>
                  </Card.Body>
                </Card>
              </Tab>
            )}
          </Tabs>
        </>
      )}
    </Container>
  );
};

export default ElectionStatistics;
