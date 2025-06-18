import React, { useState } from 'react';
import { Container, Tabs, Tab } from 'react-bootstrap';
import StatsOverview from './StatsOverview';
import ElectionStats from './ElectionStats';
import VoterStats from './VoterStats';
import SystemStats from './SystemStats';

const StatsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Panel de Estadísticas</h2>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key)}
        className="mb-4 nav-tabs-custom"
      >
        <Tab eventKey="overview" title="Resumen">
          <StatsOverview />
        </Tab>
        <Tab eventKey="elections" title="Elecciones">
          <ElectionStats />
        </Tab>
        <Tab eventKey="voters" title="Votantes">
          <VoterStats />
        </Tab>
        <Tab eventKey="system" title="Sistema">
          <SystemStats />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default StatsDashboard;
