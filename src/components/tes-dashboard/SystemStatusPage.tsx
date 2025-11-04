/**
 * Professional System Status Page
 * Comprehensive monitoring dashboard for system health, services, and performance
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Network,
  Shield,
  Cpu,
  HardDrive,
  MemoryStick,
  Settings,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Info,
  Zap,
  Eye
} from 'lucide-react';

// Styled Components with Professional Design (No Gradients)
const StatusPageContainer = styled.div`
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 24px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 32px;
  padding: 24px 32px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const HeaderTitle = styled.h1`
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  display: flex;
  align-items: center;
  gap: 12px;

  .status-icon {
    padding: 8px;
    border-radius: 8px;
    background-color: #f0f9ff;
    color: #0369a1;
  }
`;

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 16px;
  color: #64748b;
  font-weight: 500;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;

  ${props => props.variant === 'primary' ? `
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
    
    &:hover {
      background-color: #2563eb;
      border-color: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  ` : `
    background-color: white;
    color: #475569;
    border-color: #cbd5e1;
    
    &:hover {
      background-color: #f8fafc;
      border-color: #94a3b8;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  `}
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const StatusCard = styled.div<{ status?: 'healthy' | 'warning' | 'critical' | 'offline' }>`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: #cbd5e1;
  }

  ${props => {
    const colors = {
      healthy: { border: '#10b981', bg: '#ecfdf5' },
      warning: { border: '#f59e0b', bg: '#fffbeb' },
      critical: { border: '#ef4444', bg: '#fef2f2' },
      offline: { border: '#6b7280', bg: '#f9fafb' }
    };
    const color = colors[props.status || 'healthy'];
    return `
      border-left: 4px solid ${color.border};
      
      .status-header {
        background-color: ${color.bg};
      }
    `;
  }}
`;

const CardHeader = styled.div`
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f1f5f9;
  
  .card-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }
  
  .card-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
  }
`;

const CardContent = styled.div`
  padding: 20px 24px;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f8fafc;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  .metric-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
  }
  
  .metric-value {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }
`;

const ProgressBar = styled.div<{ percentage: number; color?: string }>`
  width: 100%;
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
  
  .progress-fill {
    height: 100%;
    background-color: ${props => props.color || '#3b82f6'};
    width: ${props => props.percentage}%;
    transition: width 0.3s ease;
    border-radius: 4px;
  }
`;

const AlertsSection = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
`;

const SectionHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 12px;
  }
`;

const AlertItem = styled.div<{ severity: 'info' | 'warning' | 'critical' }>`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #f8fafc;
  
  &:last-child {
    border-bottom: none;
  }
  
  .alert-icon {
    margin-top: 2px;
    padding: 6px;
    border-radius: 6px;
    ${props => {
      const colors = {
        info: { bg: '#eff6ff', color: '#2563eb' },
        warning: { bg: '#fffbeb', color: '#d97706' },
        critical: { bg: '#fef2f2', color: '#dc2626' }
      };
      const color = colors[props.severity];
      return `
        background-color: ${color.bg};
        color: ${color.color};
      `;
    }}
  }
  
  .alert-content {
    flex: 1;
  }
  
  .alert-title {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }
  
  .alert-message {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
  }
  
  .alert-time {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 8px;
  }
`;

const StatusIndicator = styled.span<{ status: 'healthy' | 'warning' | 'critical' | 'offline' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    ${props => {
      const colors = {
        healthy: '#10b981',
        warning: '#f59e0b',
        critical: '#ef4444',
        offline: '#6b7280'
      };
      return `background-color: ${colors[props.status]};`;
    }}
  }
  
  .status-text {
    font-size: 13px;
    font-weight: 500;
    color: ${props => {
      const colors = {
        healthy: '#059669',
        warning: '#d97706',
        critical: '#dc2626',
        offline: '#4b5563'
      };
      return colors[props.status];
    }};
    text-transform: capitalize;
  }
`;

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface ServiceStatus {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: string;
  responseTime: number;
  lastCheck: string;
}

interface AlertItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
}

const SystemStatusPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0
  });
  
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Simulate real-time data updates
  useEffect(() => {
    const generateMetrics = (): SystemMetrics => ({
      cpu: Math.floor(Math.random() * 40) + 20, // 20-60%
      memory: Math.floor(Math.random() * 30) + 40, // 40-70%
      disk: Math.floor(Math.random() * 20) + 65, // 65-85%
      network: Math.floor(Math.random() * 25) + 15 // 15-40%
    });

    const generateServices = (): ServiceStatus[] => [
      {
        id: 'tes-api',
        name: 'TES API Server',
        status: Math.random() > 0.1 ? 'healthy' : 'warning',
        uptime: '7d 14h 23m',
        responseTime: Math.floor(Math.random() * 50) + 10,
        lastCheck: new Date().toLocaleTimeString()
      },
      {
        id: 'database',
        name: 'PostgreSQL Database',
        status: Math.random() > 0.05 ? 'healthy' : 'critical',
        uptime: '15d 8h 45m',
        responseTime: Math.floor(Math.random() * 20) + 5,
        lastCheck: new Date().toLocaleTimeString()
      },
      {
        id: 'redis',
        name: 'Redis Cache',
        status: Math.random() > 0.15 ? 'healthy' : 'warning',
        uptime: '12d 3h 12m',
        responseTime: Math.floor(Math.random() * 10) + 2,
        lastCheck: new Date().toLocaleTimeString()
      },
      {
        id: 'workflow-engine',
        name: 'Workflow Engine',
        status: Math.random() > 0.2 ? 'healthy' : 'offline',
        uptime: '2d 19h 56m',
        responseTime: Math.floor(Math.random() * 100) + 50,
        lastCheck: new Date().toLocaleTimeString()
      },
      {
        id: 'file-storage',
        name: 'File Storage Service',
        status: 'healthy',
        uptime: '23d 11h 8m',
        responseTime: Math.floor(Math.random() * 30) + 15,
        lastCheck: new Date().toLocaleTimeString()
      },
      {
        id: 'auth-service',
        name: 'Authentication Service',
        status: Math.random() > 0.1 ? 'healthy' : 'warning',
        uptime: '9d 22h 34m',
        responseTime: Math.floor(Math.random() * 40) + 20,
        lastCheck: new Date().toLocaleTimeString()
      }
    ];

    const generateAlerts = (): AlertItem[] => [
      {
        id: '1',
        severity: 'warning',
        title: 'High Memory Usage Detected',
        message: 'System memory usage has exceeded 70% for the past 5 minutes.',
        timestamp: '2 minutes ago'
      },
      {
        id: '2',
        severity: 'info',
        title: 'Scheduled Maintenance Complete',
        message: 'Database maintenance window completed successfully.',
        timestamp: '15 minutes ago'
      },
      {
        id: '3',
        severity: 'critical',
        title: 'Service Endpoint Timeout',
        message: 'Workflow engine experiencing intermittent timeouts.',
        timestamp: '1 hour ago'
      }
    ];

    const updateData = () => {
      setMetrics(generateMetrics());
      setServices(generateServices());
      setAlerts(generateAlerts());
      setLastUpdated(new Date());
    };

    // Initial data load
    updateData();

    // Update every 30 seconds
    const interval = setInterval(updateData, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMetrics({
      cpu: Math.floor(Math.random() * 40) + 20,
      memory: Math.floor(Math.random() * 30) + 40,
      disk: Math.floor(Math.random() * 20) + 65,
      network: Math.floor(Math.random() * 25) + 15
    });
    
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const getOverallStatus = (): 'healthy' | 'warning' | 'critical' => {
    const criticalServices = services.filter(s => s.status === 'critical' || s.status === 'offline').length;
    const warningServices = services.filter(s => s.status === 'warning').length;
    
    if (criticalServices > 0) return 'critical';
    if (warningServices > 0) return 'warning';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  return (
    <StatusPageContainer>
      <PageHeader>
        <HeaderContent>
          <HeaderTitle>
            <div className="status-icon">
              <Activity size={24} />
            </div>
            System Status Dashboard
          </HeaderTitle>
          <HeaderSubtitle>
            Real-time monitoring and health status • Last updated: {lastUpdated.toLocaleTimeString()}
          </HeaderSubtitle>
        </HeaderContent>
        <HeaderActions>
          <ActionButton variant="secondary">
            <Settings size={16} />
            Configure
          </ActionButton>
          <ActionButton 
            variant="primary" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </ActionButton>
        </HeaderActions>
      </PageHeader>

      {/* Overall System Status */}
      <StatusCard status={overallStatus} style={{ marginBottom: '32px' }}>
        <CardHeader className="status-header">
          <h3 className="card-title">
            <Shield size={20} />
            Overall System Health
          </h3>
          <div className="card-status">
            <StatusIndicator status={overallStatus}>
              <div className="status-dot" />
              <span className="status-text">{overallStatus}</span>
            </StatusIndicator>
          </div>
        </CardHeader>
        <CardContent>
          <MetricRow>
            <div className="metric-label">
              <CheckCircle size={16} />
              Healthy Services
            </div>
            <div className="metric-value">
              {services.filter(s => s.status === 'healthy').length} / {services.length}
            </div>
          </MetricRow>
          <MetricRow>
            <div className="metric-label">
              <Clock size={16} />
              System Uptime
            </div>
            <div className="metric-value">99.9% (30 days)</div>
          </MetricRow>
          <MetricRow>
            <div className="metric-label">
              <TrendingUp size={16} />
              Performance
            </div>
            <div className="metric-value">Excellent</div>
          </MetricRow>
        </CardContent>
      </StatusCard>

      {/* System Metrics */}
      <StatusGrid>
        <StatusCard status={metrics.cpu > 80 ? 'critical' : metrics.cpu > 60 ? 'warning' : 'healthy'}>
          <CardHeader>
            <h3 className="card-title">
              <Cpu size={20} />
              CPU Usage
            </h3>
            <div className="card-status">
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                {metrics.cpu}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ProgressBar 
              percentage={metrics.cpu} 
              color={metrics.cpu > 80 ? '#ef4444' : metrics.cpu > 60 ? '#f59e0b' : '#10b981'}
            >
              <div className="progress-fill" />
            </ProgressBar>
            <MetricRow>
              <div className="metric-label">Load Average</div>
              <div className="metric-value">0.{Math.floor(Math.random() * 90) + 10}</div>
            </MetricRow>
            <MetricRow>
              <div className="metric-label">Cores</div>
              <div className="metric-value">8 cores</div>
            </MetricRow>
          </CardContent>
        </StatusCard>

        <StatusCard status={metrics.memory > 85 ? 'critical' : metrics.memory > 70 ? 'warning' : 'healthy'}>
          <CardHeader>
            <h3 className="card-title">
              <MemoryStick size={20} />
              Memory Usage
            </h3>
            <div className="card-status">
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                {metrics.memory}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ProgressBar 
              percentage={metrics.memory} 
              color={metrics.memory > 85 ? '#ef4444' : metrics.memory > 70 ? '#f59e0b' : '#10b981'}
            >
              <div className="progress-fill" />
            </ProgressBar>
            <MetricRow>
              <div className="metric-label">Used</div>
              <div className="metric-value">{(metrics.memory * 0.16).toFixed(1)} GB</div>
            </MetricRow>
            <MetricRow>
              <div className="metric-label">Total</div>
              <div className="metric-value">16 GB</div>
            </MetricRow>
          </CardContent>
        </StatusCard>

        <StatusCard status={metrics.disk > 90 ? 'critical' : metrics.disk > 80 ? 'warning' : 'healthy'}>
          <CardHeader>
            <h3 className="card-title">
              <HardDrive size={20} />
              Disk Usage
            </h3>
            <div className="card-status">
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                {metrics.disk}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ProgressBar 
              percentage={metrics.disk} 
              color={metrics.disk > 90 ? '#ef4444' : metrics.disk > 80 ? '#f59e0b' : '#10b981'}
            >
              <div className="progress-fill" />
            </ProgressBar>
            <MetricRow>
              <div className="metric-label">Used</div>
              <div className="metric-value">{(metrics.disk * 5).toFixed(0)} GB</div>
            </MetricRow>
            <MetricRow>
              <div className="metric-label">Total</div>
              <div className="metric-value">500 GB</div>
            </MetricRow>
          </CardContent>
        </StatusCard>

        <StatusCard status={metrics.network > 80 ? 'warning' : 'healthy'}>
          <CardHeader>
            <h3 className="card-title">
              <Network size={20} />
              Network Usage
            </h3>
            <div className="card-status">
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                {metrics.network}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ProgressBar 
              percentage={metrics.network} 
              color={metrics.network > 80 ? '#f59e0b' : '#10b981'}
            >
              <div className="progress-fill" />
            </ProgressBar>
            <MetricRow>
              <div className="metric-label">Bandwidth</div>
              <div className="metric-value">{(metrics.network * 10).toFixed(0)} Mbps</div>
            </MetricRow>
            <MetricRow>
              <div className="metric-label">Latency</div>
              <div className="metric-value">{Math.floor(Math.random() * 10) + 5}ms</div>
            </MetricRow>
          </CardContent>
        </StatusCard>
      </StatusGrid>

      {/* Services Status */}
      <StatusGrid>
        {services.map(service => (
          <StatusCard key={service.id} status={service.status}>
            <CardHeader>
              <h3 className="card-title">
                <Server size={20} />
                {service.name}
              </h3>
              <div className="card-status">
                <StatusIndicator status={service.status}>
                  <div className="status-dot" />
                  <span className="status-text">{service.status}</span>
                </StatusIndicator>
              </div>
            </CardHeader>
            <CardContent>
              <MetricRow>
                <div className="metric-label">
                  <Clock size={16} />
                  Uptime
                </div>
                <div className="metric-value">{service.uptime}</div>
              </MetricRow>
              <MetricRow>
                <div className="metric-label">
                  <Zap size={16} />
                  Response Time
                </div>
                <div className="metric-value">{service.responseTime}ms</div>
              </MetricRow>
              <MetricRow>
                <div className="metric-label">
                  <Eye size={16} />
                  Last Check
                </div>
                <div className="metric-value">{service.lastCheck}</div>
              </MetricRow>
            </CardContent>
          </StatusCard>
        ))}
      </StatusGrid>

      {/* Recent Alerts */}
      <AlertsSection>
        <SectionHeader>
          <h2>
            <AlertTriangle size={20} />
            Recent Alerts & Events
          </h2>
        </SectionHeader>
        {alerts.map(alert => (
          <AlertItem key={alert.id} severity={alert.severity}>
            <div className="alert-icon">
              {alert.severity === 'critical' && <AlertCircle size={16} />}
              {alert.severity === 'warning' && <AlertTriangle size={16} />}
              {alert.severity === 'info' && <Info size={16} />}
            </div>
            <div className="alert-content">
              <h4 className="alert-title">{alert.title}</h4>
              <p className="alert-message">{alert.message}</p>
              <div className="alert-time">{alert.timestamp}</div>
            </div>
          </AlertItem>
        ))}
      </AlertsSection>
    </StatusPageContainer>
  );
};

export default SystemStatusPage;
