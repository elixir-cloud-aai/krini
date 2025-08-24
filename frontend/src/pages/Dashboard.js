import React, { useState } from 'react';
import styled from 'styled-components';
import { fetchDashboardData, testConnection } from '../services/api';
import { taskService } from '../services/taskService';
import usePolling from '../hooks/usePolling';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, formatTaskStatus } from '../utils/formatters';
import { TASK_STATE_COLORS, POLLING_INTERVALS } from '../utils/constants';
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
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => props.color || '#007bff'};
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
`;

const StatIcon = styled.div`
  margin-right: 12px;
  color: ${props => props.color || '#007bff'};
`;

const StatTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: ${props => props.color || '#333'};
  margin-bottom: 5px;
`;

const StatSubtext = styled.div`
  font-size: 14px;
  color: #666;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
`;

const RefreshButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 12px;
  
  &:hover {
    background: #0056b3;
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
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TaskInfo = styled.div`
  flex-grow: 1;
`;

const TaskId = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
`;

const TaskMeta = styled.div`
  font-size: 12px;
  color: #666;
`;

const TaskStatus = styled.div`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background-color: ${props => TASK_STATE_COLORS[props.status] || '#6c757d'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const Dashboard = () => {
  const [connectionTest, setConnectionTest] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // Poll dashboard data every 5 seconds
  const { 
    data: dashboardData, 
    loading: dashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = usePolling(fetchDashboardData, POLLING_INTERVALS.NORMAL);

  // Poll task status every 5 seconds
  const { 
    data: tasksData, 
    loading: tasksLoading, 
    error: tasksError,
    refetch: refetchTasks 
  } = usePolling(taskService.listTasks, POLLING_INTERVALS.NORMAL);

  const handleTestConnection = async () => {
    setTestLoading(true);
    try {
      const result = await testConnection();
      setConnectionTest(result);
    } catch (error) {
      setConnectionTest({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const handleRefresh = () => {
    refetchDashboard();
    refetchTasks();
  };

  // Calculate stats - ensure tasksData is an array before using array methods
  const tasksArray = Array.isArray(tasksData) ? tasksData : [];
  const stats = {
    totalTasks: tasksArray.length || 0,
    runningTasks: tasksArray.filter(task => task.state === 'RUNNING').length || 0,
    completedTasks: tasksArray.filter(task => task.state === 'COMPLETE').length || 0,
    failedTasks: tasksArray.filter(task => 
      task.state === 'EXECUTOR_ERROR' || task.state === 'SYSTEM_ERROR'
    ).length || 0,
    tesInstances: dashboardData?.tes_instances?.length || 0,
    workflowRuns: dashboardData?.workflow_runs?.length || 0,
    batchRuns: dashboardData?.batch_runs?.length || 0
  };

  if (dashboardLoading && !dashboardData) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <DashboardContainer>
      {/* Connection Test */}
      <ContentCard style={{ marginBottom: '20px' }}>
        <CardHeader>
          <CardTitle>🔗 Connection Status</CardTitle>
          <RefreshButton onClick={handleTestConnection} disabled={testLoading}>
            <RefreshCw size={14} style={{ marginRight: '5px' }} />
            Test Connection
          </RefreshButton>
        </CardHeader>
        
        {testLoading && <LoadingSpinner size="small" text="Testing connection..." />}
        
        {connectionTest && !testLoading && (
          <div>
            {connectionTest.error ? (
              <ErrorMessage message={connectionTest.error} />
            ) : (
              <div style={{ color: '#28a745', fontWeight: '600' }}>
                ✅ {connectionTest.message} (ID: {connectionTest.timestamp})
              </div>
            )}
          </div>
        )}
      </ContentCard>

      {/* Stats Grid */}
      <StatsGrid>
        <StatCard color="#007bff">
          <StatHeader>
            <StatIcon color="#007bff">
              <Activity size={24} />
            </StatIcon>
            <StatTitle>Total Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#007bff">{stats.totalTasks}</StatValue>
          <StatSubtext>Across all TES instances</StatSubtext>
        </StatCard>

        <StatCard color="#28a745">
          <StatHeader>
            <StatIcon color="#28a745">
              <PlayCircle size={24} />
            </StatIcon>
            <StatTitle>Running Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#28a745">{stats.runningTasks}</StatValue>
          <StatSubtext>Currently executing</StatSubtext>
        </StatCard>

        <StatCard color="#28a745">
          <StatHeader>
            <StatIcon color="#28a745">
              <CheckCircle size={24} />
            </StatIcon>
            <StatTitle>Completed</StatTitle>
          </StatHeader>
          <StatValue color="#28a745">{stats.completedTasks}</StatValue>
          <StatSubtext>Successfully finished</StatSubtext>
        </StatCard>

        <StatCard color="#dc3545">
          <StatHeader>
            <StatIcon color="#dc3545">
              <XCircle size={24} />
            </StatIcon>
            <StatTitle>Failed Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#dc3545">{stats.failedTasks}</StatValue>
          <StatSubtext>Execution errors</StatSubtext>
        </StatCard>

        <StatCard color="#17a2b8">
          <StatHeader>
            <StatIcon color="#17a2b8">
              <Server size={24} />
            </StatIcon>
            <StatTitle>TES Instances</StatTitle>
          </StatHeader>
          <StatValue color="#17a2b8">{stats.tesInstances}</StatValue>
          <StatSubtext>Available services</StatSubtext>
        </StatCard>

        <StatCard color="#ffc107">
          <StatHeader>
            <StatIcon color="#ffc107">
              <Clock size={24} />
            </StatIcon>
            <StatTitle>Batch Runs</StatTitle>
          </StatHeader>
          <StatValue color="#ffc107">{stats.batchRuns}</StatValue>
          <StatSubtext>Batch executions</StatSubtext>
        </StatCard>
      </StatsGrid>

      {/* Content Grid */}
      <ContentGrid>
        {/* Recent Tasks */}
        <ContentCard>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <RefreshButton onClick={refetchTasks} disabled={tasksLoading}>
              <RefreshCw size={14} style={{ marginRight: '5px' }} />
              Refresh
            </RefreshButton>
          </CardHeader>

          {tasksError && <ErrorMessage error={tasksError} />}
          
          {tasksLoading && <LoadingSpinner size="small" text="Loading tasks..." />}
          
          {tasksArray && tasksArray.length > 0 ? (
            <TasksList>
              {tasksArray.slice(0, 10).map((task, index) => (
                <TaskItem key={task.id || index}>
                  <TaskInfo>
                    <TaskId>{task.id || `Task ${index + 1}`}</TaskId>
                    <TaskMeta>
                      Created: {formatDate(task.creation_time)} | 
                      TES: {task.tes_url || 'Unknown'}
                    </TaskMeta>
                  </TaskInfo>
                  <TaskStatus status={task.state}>
                    {formatTaskStatus(task.state)}
                  </TaskStatus>
                </TaskItem>
              ))}
            </TasksList>
          ) : (
            <EmptyState>No tasks found</EmptyState>
          )}
        </ContentCard>

        {/* System Overview */}
        <ContentCard>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <RefreshButton onClick={handleRefresh}>
              <RefreshCw size={14} style={{ marginRight: '5px' }} />
              Refresh
            </RefreshButton>
          </CardHeader>

          {dashboardError && <ErrorMessage error={dashboardError} />}
          
          {dashboardData && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <strong>TES Gateway:</strong> {dashboardData.tes_gateway || 'Not configured'}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>Workflow Runs:</strong> {stats.workflowRuns}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>Latest Path:</strong> {dashboardData.latest_path?.join(', ') || 'None'}
              </div>
              <div>
                <strong>Last Updated:</strong> {formatDate(new Date())}
              </div>
            </div>
          )}
        </ContentCard>
      </ContentGrid>
    </DashboardContainer>
  );
};

export default Dashboard;
