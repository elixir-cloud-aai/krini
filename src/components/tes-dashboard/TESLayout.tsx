import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import TESHeader from './components/TESHeader';
import TESSidebar from './components/TESSidebar';
import TESDashboard from './TESMainDashboard';
import TasksPage from './TasksPage';
import WorkflowsPage from './WorkflowsPage';
import BatchProcessingPage from './BatchProcessingPage';
import NetworkTopologyPage from './NetworkTopologyPage';
import { testConnection } from './services/api';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const MainLayout = styled.div`
  display: flex;
`;

const ContentArea = styled.main`
  flex: 1;
  min-height: calc(100vh - 80px);
  overflow-y: auto;
`;

// Placeholder components for other pages
const SystemStatusPage = () => (
  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
    <h2>System Status</h2>
    <p>Monitor system health and performance metrics</p>
    <p>This page is under construction.</p>
  </div>
);

const ServiceInfoPage = () => (
  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
    <h2>Service Info</h2>
    <p>View TES service information and capabilities</p>
    <p>This page is under construction.</p>
  </div>
);

const LogsPage = () => (
  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
    <h2>Logs</h2>
    <p>View and analyze system logs</p>
    <p>This page is under construction.</p>
  </div>
);

const SettingsPage = () => (
  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
    <h2>Settings</h2>
    <p>Configure dashboard settings and preferences</p>
    <p>This page is under construction.</p>
  </div>
);

interface TESLayoutProps {
  basePath?: string;
}

const TESLayout: React.FC<TESLayoutProps> = ({ basePath = '/federated-analytics-showcase' }) => {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Check connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await testConnection();
        setConnectionStatus('Connected');
        setIsConnected(true);
      } catch (_error) {
        setConnectionStatus('Connection Failed');
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await testConnection();
      setConnectionStatus('Connected');
      setIsConnected(true);
    } catch (_error) {
      setConnectionStatus('Connection Failed');
      setIsConnected(false);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <AppContainer>
      <TESHeader 
        connectionStatus={connectionStatus}
        isConnected={isConnected}
        onTestConnection={handleTestConnection}
        testingConnection={testingConnection}
      />
      <MainLayout>
        <TESSidebar basePath={basePath} />
        <ContentArea>
          <Routes>
            <Route path="" element={<TESDashboard />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="batch" element={<BatchProcessingPage />} />
            <Route path="status" element={<SystemStatusPage />} />
            <Route path="service-info" element={<ServiceInfoPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="topology" element={<NetworkTopologyPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </ContentArea>
      </MainLayout>
    </AppContainer>
  );
};

export default TESLayout;
