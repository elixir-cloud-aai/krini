import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetails from './pages/TaskDetails';
import SubmitTask from './pages/SubmitTask';
import Workflows from './pages/Workflows';
import BatchProcessing from './pages/BatchProcessing';
import SystemStatus from './pages/SystemStatus';
import ServiceInfo from './pages/ServiceInfo';
import Logs from './pages/Logs';
import NetworkTopology from './pages/NetworkTopology';
import Settings from './pages/Settings';
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
`;

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);

  // Check connection on app load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await testConnection();
        setConnectionStatus('Connected');
        setIsConnected(true);
      } catch (error) {
        setConnectionStatus('Connection Failed');
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, []);

  return (
    <Router>
      <AppContainer>
        <Header 
          connectionStatus={connectionStatus} 
          isConnected={isConnected} 
        />
        <MainLayout>
          <Sidebar />
          <ContentArea>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/task-details" element={<TaskDetails />} />
              <Route path="/submit-task" element={<SubmitTask />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/batch" element={<BatchProcessing />} />
              <Route path="/status" element={<SystemStatus />} />
              <Route path="/service-info" element={<ServiceInfo />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/topology" element={<NetworkTopology />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ContentArea>
        </MainLayout>
      </AppContainer>
    </Router>
  );
}

export default App;