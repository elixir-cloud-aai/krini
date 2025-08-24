import React, { useState } from 'react';
import styled from 'styled-components';
import { fetchDashboardData, testConnection } from './services/api';
import usePolling from './hooks/usePolling';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { formatDate, formatTaskStatus } from './utils/formatters';
import { TASK_STATE_COLORS, POLLING_INTERVALS } from './utils/constants';
import { 
  Activity, 
  Server, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw 
} from 'lucide-react';

const DashboardContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px 0;
  border-bottom: 1px solid #ddd;
`;

const Title = styled.h1`
  margin: 0;
  color: #333;
  font-size: 28px;
  font-weight: 600;
`;

const ConnectionStatus = styled.div<{ isConnected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  background-color: ${props => props.isConnected ? '#d4edda' : '#f8d7da'};
  color: ${props => props.isConnected ? '#155724' : '#721c24'};
  border: 1px solid ${props => props.isConnected ? '#c3e6cb' : '#f5c6cb'};
`;

const TestConnectionButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #0056b3;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div<{ color?: string }>`
  background: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => props.color || '#0066cc'};
  border: 1px solid #ddd;
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const StatIcon = styled.div<{ color?: string }>`
  margin-right: 12px;
  color: ${props => props.color || '#007bff'};
  display: flex;
  align-items: center;
`;

const StatTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #374151;
  font-weight: 600;
`;

const StatValue = styled.div<{ color?: string }>`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.color || '#333'};
  margin-bottom: 8px;
`;

const StatSubtext = styled.div`
  font-size: 14px;
  color: #666;
  font-weight: 400;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 20px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ddd;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
`;

const RefreshButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #0056b3;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TasksList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const TaskItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
  
  &:hover {
    background-color: #f9f9f9;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TaskDetails = styled.div`
  flex: 1;
`;

const TaskId = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-family: monospace;
  font-size: 12px;
`;

const TaskMeta = styled.div`
  font-size: 12px;
  color: #666;
`;

const TaskStatus = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: ${props => TASK_STATE_COLORS[props.status] || '#6b7280'}20;
  color: ${props => TASK_STATE_COLORS[props.status] || '#6b7280'};
  border: 1px solid ${props => TASK_STATE_COLORS[props.status] || '#6b7280'}40;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #666;
`;

const TESDashboard: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const { data: dashboardData, loading, error, refetch } = usePolling(
    fetchDashboardData,
    POLLING_INTERVALS.DASHBOARD
  );

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await testConnection();
      setConnectionStatus('Connected');
      setIsConnected(true);
      refetch(); // Refresh dashboard data after successful connection
    } catch (_error) {
      setConnectionStatus('Connection Failed');
      setIsConnected(false);
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <DashboardContainer>
        <LoadingSpinner message="Loading dashboard..." />
      </DashboardContainer>
    );
  }

  if (error && !dashboardData) {
    return (
      <DashboardContainer>
        <ErrorMessage 
          title="Connection Error"
          message="Unable to connect to the TES Dashboard backend. Please make sure the backend service is running."
          onRetry={refetch}
        />
      </DashboardContainer>
    );
  }

  const stats = dashboardData || {};
  const tasks = Array.isArray(stats.tasks) ? stats.tasks : [];
  const workflowRuns = Array.isArray(stats.workflow_runs) ? stats.workflow_runs : [];
  const tesInstances = Array.isArray(stats.tes_instances) ? stats.tes_instances : [];
  
  // Calculate statistics from actual data
  const totalTasks = tasks.length;
  const runningTasks = tasks.filter((task: any) => task.state === 'RUNNING').length;
  const completedTasks = tasks.filter((task: any) => task.state === 'COMPLETE').length;
  const failedTasks = tasks.filter((task: any) => task.state === 'EXECUTOR_ERROR' || task.state === 'SYSTEM_ERROR').length;
  const totalInstances = tesInstances.length;
  const totalBatchRuns = workflowRuns.length;

  return (
    <DashboardContainer>
      <Header>
        <Title>TES Dashboard</Title>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <ConnectionStatus isConnected={isConnected}>
            {isConnected ? '🟢' : '🔴'} {connectionStatus}
          </ConnectionStatus>
          <TestConnectionButton 
            onClick={handleTestConnection} 
            disabled={testingConnection}
          >
            <RefreshCw size={16} />
            Test Connection
          </TestConnectionButton>
        </div>
      </Header>

      <StatsGrid>
        <StatCard color="#3b82f6">
          <StatHeader>
            <StatIcon color="#3b82f6">
              <Activity size={28} />
            </StatIcon>
            <StatTitle>Total Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#3b82f6">{totalTasks}</StatValue>
          <StatSubtext>Across all TES instances</StatSubtext>
        </StatCard>

        <StatCard color="#10b981">
          <StatHeader>
            <StatIcon color="#10b981">
              <PlayCircle size={28} />
            </StatIcon>
            <StatTitle>Running Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#10b981">{runningTasks}</StatValue>
          <StatSubtext>Currently executing</StatSubtext>
        </StatCard>

        <StatCard color="#059669">
          <StatHeader>
            <StatIcon color="#059669">
              <CheckCircle size={28} />
            </StatIcon>
            <StatTitle>Completed</StatTitle>
          </StatHeader>
          <StatValue color="#059669">{completedTasks}</StatValue>
          <StatSubtext>Successfully finished</StatSubtext>
        </StatCard>

        <StatCard color="#ef4444">
          <StatHeader>
            <StatIcon color="#ef4444">
              <XCircle size={28} />
            </StatIcon>
            <StatTitle>Failed Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#ef4444">{failedTasks}</StatValue>
          <StatSubtext>Execution errors</StatSubtext>
        </StatCard>

        <StatCard color="#8b5cf6">
          <StatHeader>
            <StatIcon color="#8b5cf6">
              <Server size={28} />
            </StatIcon>
            <StatTitle>TES Instances</StatTitle>
          </StatHeader>
          <StatValue color="#8b5cf6">{totalInstances}</StatValue>
          <StatSubtext>Available services</StatSubtext>
        </StatCard>

        <StatCard color="#f59e0b">
          <StatHeader>
            <StatIcon color="#f59e0b">
              <Clock size={28} />
            </StatIcon>
            <StatTitle>Workflow Runs</StatTitle>
          </StatHeader>
          <StatValue color="#f59e0b">{totalBatchRuns}</StatValue>
          <StatSubtext>Total executions</StatSubtext>
        </StatCard>
      </StatsGrid>

      <ContentGrid>
        <ContentCard>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <RefreshButton onClick={refetch} disabled={loading}>
              <RefreshCw size={12} />
              Refresh
            </RefreshButton>
          </CardHeader>
          <TasksList>
            {tasks.length === 0 ? (
              <EmptyState>
                {error ? 'Unable to load tasks' : 'No tasks found'}
              </EmptyState>
            ) : (
              tasks.slice(0, 10).map((task: any, index: number) => (
                <TaskItem key={task.id || `task-${index}`}>
                  <TaskDetails>
                    <TaskId>{String(task.name || task.id || 'Unknown Task')}</TaskId>
                    <TaskMeta>
                      {task.tes_instance && `Instance: ${task.tes_instance} • `}
                      Status: {String(task.state || 'UNKNOWN')}
                    </TaskMeta>
                  </TaskDetails>
                  <TaskStatus status={task.state || 'UNKNOWN'}>
                    {formatTaskStatus(task.state || 'unknown')}
                  </TaskStatus>
                </TaskItem>
              ))
            )}
          </TasksList>
        </ContentCard>

        <ContentCard>
          <CardHeader>
            <CardTitle>TES Instances</CardTitle>
            <RefreshButton onClick={refetch} disabled={loading}>
              <RefreshCw size={14} />
              Refresh
            </RefreshButton>
          </CardHeader>
          {error ? (
            <EmptyState>Unable to load instances</EmptyState>
          ) : (
            <TasksList>
              {tesInstances.length === 0 ? (
                <EmptyState>No TES instances found</EmptyState>
              ) : (
                tesInstances.map((instance: any, index: number) => (
                  <TaskItem key={`instance-${index}`}>
                    <TaskDetails>
                      <TaskId>{String(instance.name || 'Unknown Instance')}</TaskId>
                      <TaskMeta>
                        {instance.country && `${instance.country} • `}
                        Status: {String(instance.status || 'Unknown')}
                        {instance.task_count && ` • Tasks: ${instance.task_count}`}
                      </TaskMeta>
                    </TaskDetails>
                    <TaskStatus status={instance.status === 'healthy' ? 'COMPLETE' : 'UNKNOWN'}>
                      {instance.status || 'Unknown'}
                    </TaskStatus>
                  </TaskItem>
                ))
              )}
            </TasksList>
          )}
        </ContentCard>

        <ContentCard>
          <CardHeader>
            <CardTitle>Recent Workflows</CardTitle>
            <RefreshButton onClick={refetch} disabled={loading}>
              <RefreshCw size={14} />
              Refresh
            </RefreshButton>
          </CardHeader>
          {error ? (
            <EmptyState>Unable to load workflows</EmptyState>
          ) : (
            <TasksList>
              {workflowRuns.length === 0 ? (
                <EmptyState>No workflow runs found</EmptyState>
              ) : (
                workflowRuns.slice(0, 8).map((run: any, index: number) => (
                  <TaskItem key={`workflow-${run.run_id || index}`}>
                    <TaskDetails>
                      <TaskId>{String(run.workflow_type || 'Unknown Workflow').toUpperCase()}</TaskId>
                      <TaskMeta>
                        Instance: {String(run.tes_instance_name || 'Unknown')}
                        {run.submitted_at && ` • ${formatDate(run.submitted_at)}`}
                      </TaskMeta>
                    </TaskDetails>
                    <TaskStatus status={run.status || 'UNKNOWN'}>
                      {formatTaskStatus(run.status || 'unknown')}
                    </TaskStatus>
                  </TaskItem>
                ))
              )}
            </TasksList>
          )}
        </ContentCard>
      </ContentGrid>
    </DashboardContainer>
  );
};

export default TESDashboard;
