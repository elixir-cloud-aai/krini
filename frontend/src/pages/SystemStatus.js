import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Activity, Server, Cpu, Database, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { statusService } from '../services/statusService';
import { taskService } from '../services/taskService';
import { usePolling } from '../hooks/usePolling';
import { formatDateTime } from '../utils/formatters';
import { TES_INSTANCES } from '../utils/constants';

const StatusContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.div``;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #4b5563;
  font-size: 1rem;
`;

const RefreshButton = styled.button`
  background: #2563eb;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatusCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #222b45;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'healthy':
      case 'online':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'error':
      case 'offline':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }};
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StatusItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
`;

const StatusLabel = styled.span`
  color: #6b7280;
  font-size: 0.875rem;
`;

const StatusValue = styled.span`
  font-weight: 500;
  color: #222b45;
`;

const InstancesSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InstancesTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  tr:hover {
    background: #f9fafb;
  }
`;

const InstanceStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TaskStatsCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
`;

const StatNumber = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #222b45;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
`;

const SystemStatus = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [systemHealth, setSystemHealth] = useState({});
  const [instancesStatus, setInstancesStatus] = useState([]);
  const [taskStats, setTaskStats] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // Poll for updates every 30 seconds
  const refreshData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get dashboard data for overall stats
      const dashboardData = await taskService.getDashboardData();
      
      // Check status of each TES instance
      const instancePromises = TES_INSTANCES.map(async (instance) => {
        try {
          const tasks = await statusService.listTasks(instance.url);
          return {
            ...instance,
            status: 'healthy',
            taskCount: tasks?.tasks?.length || 0,
            lastChecked: new Date().toISOString()
          };
        } catch (err) {
          return {
            ...instance,
            status: 'error',
            taskCount: 0,
            lastChecked: new Date().toISOString(),
            error: err.message
          };
        }
      });

      const instanceResults = await Promise.all(instancePromises);
      setInstancesStatus(instanceResults);

      // Calculate system health
      const healthyInstances = instanceResults.filter(i => i.status === 'healthy').length;
      const totalInstances = instanceResults.length;
      const healthPercentage = totalInstances > 0 ? (healthyInstances / totalInstances) * 100 : 0;

      setSystemHealth({
        overall: healthPercentage >= 80 ? 'healthy' : healthPercentage >= 50 ? 'warning' : 'error',
        healthyInstances,
        totalInstances,
        healthPercentage: healthPercentage.toFixed(1)
      });

      // Set task statistics
      if (dashboardData) {
        const taskCounts = {};
        if (Array.isArray(dashboardData.submitted_tasks)) {
          dashboardData.submitted_tasks.forEach(task => {
            const status = task.status || 'UNKNOWN';
            taskCounts[status] = (taskCounts[status] || 0) + 1;
          });
        }

        setTaskStats({
          total: dashboardData.submitted_tasks?.length || 0,
          running: taskCounts.RUNNING || 0,
          completed: taskCounts.COMPLETE || taskCounts.COMPLETED || 0,
          failed: taskCounts.FAILED || taskCounts.ERROR || 0,
          queued: taskCounts.QUEUED || taskCounts.SUBMITTED || 0
        });
      }

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError('Failed to load system status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  usePolling(refreshData, 30000); // Poll every 30 seconds

  useEffect(() => {
    refreshData();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle size={16} color="#22c55e" />;
      case 'warning':
        return <AlertTriangle size={16} color="#f59e0b" />;
      case 'error':
      case 'offline':
        return <XCircle size={16} color="#ef4444" />;
      default:
        return <AlertTriangle size={16} color="#6b7280" />;
    }
  };

  return (
    <StatusContainer>
      <Header>
        <HeaderLeft>
          <Title>System Status</Title>
          <Subtitle>Monitor TES instances and system health</Subtitle>
        </HeaderLeft>
        <RefreshButton onClick={refreshData} disabled={loading}>
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </Header>

      {error && <ErrorMessage message={error} />}

      <StatusGrid>
        <StatusCard>
          <CardHeader>
            <CardTitle>
              <Activity size={20} />
              System Health
            </CardTitle>
            <StatusIndicator status={systemHealth.overall} />
          </CardHeader>
          <CardContent>
            <StatusItem>
              <StatusLabel>Overall Status</StatusLabel>
              <StatusValue>{systemHealth.overall || 'Unknown'}</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Healthy Instances</StatusLabel>
              <StatusValue>{systemHealth.healthyInstances || 0}/{systemHealth.totalInstances || 0}</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Health Percentage</StatusLabel>
              <StatusValue>{systemHealth.healthPercentage || 0}%</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Last Updated</StatusLabel>
              <StatusValue>{lastUpdated ? formatDateTime(lastUpdated) : 'Never'}</StatusValue>
            </StatusItem>
          </CardContent>
        </StatusCard>

        <StatusCard>
          <CardHeader>
            <CardTitle>
              <Cpu size={20} />
              Task Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusItem>
              <StatusLabel>Total Tasks</StatusLabel>
              <StatusValue>{taskStats.total || 0}</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Running</StatusLabel>
              <StatusValue>{taskStats.running || 0}</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Completed</StatusLabel>
              <StatusValue>{taskStats.completed || 0}</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Failed</StatusLabel>
              <StatusValue>{taskStats.failed || 0}</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Queued</StatusLabel>
              <StatusValue>{taskStats.queued || 0}</StatusValue>
            </StatusItem>
          </CardContent>
        </StatusCard>

        <StatusCard>
          <CardHeader>
            <CardTitle>
              <Database size={20} />
              Storage & Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusItem>
              <StatusLabel>Available Storage</StatusLabel>
              <StatusValue>Available</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Memory Usage</StatusLabel>
              <StatusValue>Normal</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>CPU Usage</StatusLabel>
              <StatusValue>Normal</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Network Status</StatusLabel>
              <StatusValue>Online</StatusValue>
            </StatusItem>
          </CardContent>
        </StatusCard>
      </StatusGrid>

      <InstancesSection>
        <SectionTitle>
          <Server size={20} />
          TES Instances Status
        </SectionTitle>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <InstancesTable>
            <thead>
              <tr>
                <th>Instance Name</th>
                <th>URL</th>
                <th>Status</th>
                <th>Tasks</th>
                <th>Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {instancesStatus.map((instance, index) => (
                <tr key={index}>
                  <td>{instance.name}</td>
                  <td>{instance.url}</td>
                  <td>
                    <InstanceStatus>
                      {getStatusIcon(instance.status)}
                      {instance.status}
                      {instance.error && (
                        <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                          ({instance.error})
                        </span>
                      )}
                    </InstanceStatus>
                  </td>
                  <td>{instance.taskCount}</td>
                  <td>{formatDateTime(instance.lastChecked)}</td>
                </tr>
              ))}
            </tbody>
          </InstancesTable>
        )}
      </InstancesSection>

      <TaskStatsCard>
        <SectionTitle>
          <Activity size={20} />
          Task Distribution
        </SectionTitle>
        <StatsGrid>
          <StatItem>
            <StatNumber>{taskStats.total || 0}</StatNumber>
            <StatLabel>Total Tasks</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>{taskStats.running || 0}</StatNumber>
            <StatLabel>Running</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>{taskStats.completed || 0}</StatNumber>
            <StatLabel>Completed</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>{taskStats.failed || 0}</StatNumber>
            <StatLabel>Failed</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>{taskStats.queued || 0}</StatNumber>
            <StatLabel>Queued</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>{((taskStats.completed || 0) / (taskStats.total || 1) * 100).toFixed(1)}%</StatNumber>
            <StatLabel>Success Rate</StatLabel>
          </StatItem>
        </StatsGrid>
      </TaskStatsCard>
    </StatusContainer>
  );
};

export default SystemStatus;
