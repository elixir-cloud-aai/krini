/**
 * Professional Service Info Page
 * Comprehensive TES service information and capabilities dashboard
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Server,
  Info,
  Settings,
  Database,
  Network,
  Shield,
  Code,
  Globe,
  Clock,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Cpu,
  HardDrive,
  Zap,
  FileText,
  Tag,
  Calendar,
  MapPin
} from 'lucide-react';

// Styled Components with Professional Design (No Gradients)
const ServiceInfoContainer = styled.div`
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 24px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
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

  .service-icon {
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

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled.div`
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
  
  .card-description {
    margin: 0;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
  }
`;

const CardContent = styled.div`
  padding: 20px 24px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f8fafc;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  .info-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
  }
  
  .info-value {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }
`;

const CodeBlock = styled.div`
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #374151;
  margin: 12px 0;
  position: relative;
  
  .copy-button {
    position: absolute;
    top: 8px;
    right: 8px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    color: #6b7280;
    
    &:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }
  }
`;

const Badge = styled.span<{ variant?: 'success' | 'warning' | 'info' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    const variants = {
      success: { bg: '#ecfdf5', color: '#059669', border: '#10b981' },
      warning: { bg: '#fffbeb', color: '#d97706', border: '#f59e0b' },
      info: { bg: '#eff6ff', color: '#2563eb', border: '#3b82f6' },
      neutral: { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' }
    };
    const variant = variants[props.variant || 'neutral'];
    return `
      background-color: ${variant.bg};
      color: ${variant.color};
      border: 1px solid ${variant.border};
    `;
  }}
`;

const CapabilitiesList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 16px 0;
`;

const CapabilityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  
  .capability-icon {
    color: #059669;
  }
  
  .capability-text {
    font-size: 13px;
    color: #374151;
    font-weight: 500;
  }
`;

const EndpointsList = styled.div`
  margin: 16px 0;
`;

const EndpointItem = styled.div`
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  
  .endpoint-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .endpoint-method {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .method-get { background-color: #dbeafe; color: #1d4ed8; }
  .method-post { background-color: #dcfce7; color: #166534; }
  .method-put { background-color: #fef3c7; color: #92400e; }
  .method-delete { background-color: #fee2e2; color: #b91c1c; }
  
  .endpoint-path {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    color: #374151;
    font-weight: 500;
  }
  
  .endpoint-description {
    font-size: 13px;
    color: #6b7280;
    margin-top: 4px;
  }
`;

const TabsContainer = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
`;

const TabsHeader = styled.div`
  display: flex;
  border-bottom: 1px solid #e2e8f0;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 16px 24px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.active ? `
    color: #3b82f6;
    background-color: #f0f9ff;
    border-bottom: 2px solid #3b82f6;
  ` : `
    color: #64748b;
    
    &:hover {
      color: #1e293b;
      background-color: #f8fafc;
    }
  `}
`;

const TabContent = styled.div`
  padding: 24px;
`;

interface ServiceInfo {
  name: string;
  version: string;
  description: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  lastRestart: string;
  endpoint: string;
  documentation: string;
}

interface ServiceCapabilities {
  taskExecution: boolean;
  workflowSupport: boolean;
  batchProcessing: boolean;
  containerSupport: string[];
  storageBackends: string[];
  authMethods: string[];
}

const ServiceInfoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'configuration' | 'logs'>('overview');
  const [serviceInfo] = useState<ServiceInfo>({
    name: 'TES (Task Execution Service)',
    version: '1.1.0',
    description: 'A standardized RESTful web service for describing and executing batch execution tasks',
    status: 'running',
    uptime: '7 days, 14 hours, 23 minutes',
    lastRestart: '2025-10-21 09:15:32',
    endpoint: 'http://localhost:8080/ga4gh/tes/v1',
    documentation: 'https://ga4gh.github.io/task-execution-schemas/'
  });

  const [capabilities] = useState<ServiceCapabilities>({
    taskExecution: true,
    workflowSupport: true,
    batchProcessing: true,
    containerSupport: ['Docker', 'Singularity', 'Podman'],
    storageBackends: ['Local', 'S3', 'GCS', 'Azure Blob'],
    authMethods: ['OAuth 2.0', 'API Key', 'JWT Token']
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // API endpoints configuration
  const apiEndpoints = [
    {
      method: 'GET',
      path: '/service-info',
      description: 'Get service information and capabilities'
    },
    {
      method: 'GET',
      path: '/tasks',
      description: 'List tasks with optional filtering'
    },
    {
      method: 'POST',
      path: '/tasks',
      description: 'Create a new task'
    },
    {
      method: 'GET',
      path: '/tasks/{id}',
      description: 'Get task information by ID'
    },
    {
      method: 'DELETE',
      path: '/tasks/{id}',
      description: 'Cancel a task'
    },
    {
      method: 'POST',
      path: '/tasks/{id}:cancel',
      description: 'Cancel a running task'
    }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <ServiceInfoContainer>
      <PageHeader>
        <HeaderContent>
          <HeaderTitle>
            <div className="service-icon">
              <Server size={24} />
            </div>
            Service Information
          </HeaderTitle>
          <HeaderSubtitle>
            TES service details, capabilities, and API documentation • Last updated: {lastUpdated.toLocaleTimeString()}
          </HeaderSubtitle>
        </HeaderContent>
        <HeaderActions>
          <ActionButton variant="secondary">
            <ExternalLink size={16} />
            API Docs
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

      {/* Service Overview Cards */}
      <ContentGrid>
        <InfoCard>
          <CardHeader>
            <h3 className="card-title">
              <Info size={20} />
              Service Details
            </h3>
            <p className="card-description">
              Basic information about the TES service instance
            </p>
          </CardHeader>
          <CardContent>
            <InfoRow>
              <div className="info-label">
                <Tag size={16} />
                Service Name
              </div>
              <div className="info-value">{serviceInfo.name}</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Code size={16} />
                Version
              </div>
              <div className="info-value">
                <Badge variant="info">{serviceInfo.version}</Badge>
              </div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Activity size={16} />
                Status
              </div>
              <div className="info-value">
                <Badge variant={serviceInfo.status === 'running' ? 'success' : 'warning'}>
                  {serviceInfo.status === 'running' && <CheckCircle size={12} />}
                  {serviceInfo.status !== 'running' && <AlertTriangle size={12} />}
                  {serviceInfo.status.charAt(0).toUpperCase() + serviceInfo.status.slice(1)}
                </Badge>
              </div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Clock size={16} />
                Uptime
              </div>
              <div className="info-value">{serviceInfo.uptime}</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Calendar size={16} />
                Last Restart
              </div>
              <div className="info-value">{serviceInfo.lastRestart}</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Globe size={16} />
                Endpoint
              </div>
              <div className="info-value">
                <CodeBlock>
                  {serviceInfo.endpoint}
                  <button 
                    className="copy-button"
                    onClick={() => copyToClipboard(serviceInfo.endpoint)}
                  >
                    <Copy size={12} />
                  </button>
                </CodeBlock>
              </div>
            </InfoRow>
          </CardContent>
        </InfoCard>

        <InfoCard>
          <CardHeader>
            <h3 className="card-title">
              <Settings size={20} />
              Service Capabilities
            </h3>
            <p className="card-description">
              Features and capabilities supported by this TES instance
            </p>
          </CardHeader>
          <CardContent>
            <CapabilitiesList>
              <CapabilityItem>
                <CheckCircle size={16} className="capability-icon" />
                <span className="capability-text">Task Execution</span>
              </CapabilityItem>
              <CapabilityItem>
                <CheckCircle size={16} className="capability-icon" />
                <span className="capability-text">Workflow Support</span>
              </CapabilityItem>
              <CapabilityItem>
                <CheckCircle size={16} className="capability-icon" />
                <span className="capability-text">Batch Processing</span>
              </CapabilityItem>
              <CapabilityItem>
                <CheckCircle size={16} className="capability-icon" />
                <span className="capability-text">Container Runtime</span>
              </CapabilityItem>
              <CapabilityItem>
                <CheckCircle size={16} className="capability-icon" />
                <span className="capability-text">Storage Integration</span>
              </CapabilityItem>
              <CapabilityItem>
                <CheckCircle size={16} className="capability-icon" />
                <span className="capability-text">Authentication</span>
              </CapabilityItem>
            </CapabilitiesList>
            
            <InfoRow>
              <div className="info-label">
                <Database size={16} />
                Container Support
              </div>
              <div className="info-value">
                {capabilities.containerSupport.map(container => (
                  <Badge key={container} variant="neutral" style={{ marginLeft: '4px' }}>
                    {container}
                  </Badge>
                ))}
              </div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <HardDrive size={16} />
                Storage Backends
              </div>
              <div className="info-value">
                {capabilities.storageBackends.map(storage => (
                  <Badge key={storage} variant="info" style={{ marginLeft: '4px' }}>
                    {storage}
                  </Badge>
                ))}
              </div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Shield size={16} />
                Authentication
              </div>
              <div className="info-value">
                {capabilities.authMethods.map(auth => (
                  <Badge key={auth} variant="success" style={{ marginLeft: '4px' }}>
                    {auth}
                  </Badge>
                ))}
              </div>
            </InfoRow>
          </CardContent>
        </InfoCard>
      </ContentGrid>

      {/* Resource Information */}
      <ContentGrid>
        <InfoCard>
          <CardHeader>
            <h3 className="card-title">
              <Cpu size={20} />
              Resource Limits
            </h3>
            <p className="card-description">
              Available computing resources and limits
            </p>
          </CardHeader>
          <CardContent>
            <InfoRow>
              <div className="info-label">
                <Cpu size={16} />
                CPU Cores
              </div>
              <div className="info-value">16 cores</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Zap size={16} />
                Memory
              </div>
              <div className="info-value">64 GB</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <HardDrive size={16} />
                Storage
              </div>
              <div className="info-value">1 TB SSD</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Network size={16} />
                Network
              </div>
              <div className="info-value">10 Gbps</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Users size={16} />
                Max Concurrent Tasks
              </div>
              <div className="info-value">100</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Clock size={16} />
                Max Task Duration
              </div>
              <div className="info-value">24 hours</div>
            </InfoRow>
          </CardContent>
        </InfoCard>

        <InfoCard>
          <CardHeader>
            <h3 className="card-title">
              <MapPin size={20} />
              Service Location
            </h3>
            <p className="card-description">
              Geographic and network location information
            </p>
          </CardHeader>
          <CardContent>
            <InfoRow>
              <div className="info-label">
                <Globe size={16} />
                Region
              </div>
              <div className="info-value">US East (N. Virginia)</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <MapPin size={16} />
                Data Center
              </div>
              <div className="info-value">AWS us-east-1a</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Network size={16} />
                IP Address
              </div>
              <div className="info-value">192.168.1.100</div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Shield size={16} />
                SSL Certificate
              </div>
              <div className="info-value">
                <Badge variant="success">Valid</Badge>
              </div>
            </InfoRow>
            <InfoRow>
              <div className="info-label">
                <Clock size={16} />
                Timezone
              </div>
              <div className="info-value">UTC-5 (EST)</div>
            </InfoRow>
          </CardContent>
        </InfoCard>
      </ContentGrid>

      {/* API Endpoints Documentation */}
      <TabsContainer>
        <TabsHeader>
          <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            API Overview
          </Tab>
          <Tab active={activeTab === 'endpoints'} onClick={() => setActiveTab('endpoints')}>
            Endpoints
          </Tab>
          <Tab active={activeTab === 'configuration'} onClick={() => setActiveTab('configuration')}>
            Configuration
          </Tab>
          <Tab active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
            Service Logs
          </Tab>
        </TabsHeader>

        <TabContent>
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>API Overview</h3>
              <p style={{ color: '#64748b', marginBottom: '24px' }}>
                The Task Execution Service (TES) API provides a standardized interface for submitting and managing computational tasks. 
                It follows the GA4GH TES specification and supports RESTful operations for task lifecycle management.
              </p>
              
              <InfoRow>
                <div className="info-label">
                  <Globe size={16} />
                  Base URL
                </div>
                <div className="info-value">
                  <CodeBlock>
                    {serviceInfo.endpoint}
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(serviceInfo.endpoint)}
                    >
                      <Copy size={12} />
                    </button>
                  </CodeBlock>
                </div>
              </InfoRow>
              
              <InfoRow>
                <div className="info-label">
                  <FileText size={16} />
                  Content Type
                </div>
                <div className="info-value">application/json</div>
              </InfoRow>
              
              <InfoRow>
                <div className="info-label">
                  <Shield size={16} />
                  Authentication
                </div>
                <div className="info-value">Bearer Token (OAuth 2.0)</div>
              </InfoRow>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Available Endpoints</h3>
              <EndpointsList>
                {apiEndpoints.map((endpoint, index) => (
                  <EndpointItem key={index}>
                    <div className="endpoint-header">
                      <div>
                        <span className={`endpoint-method method-${endpoint.method.toLowerCase()}`}>
                          {endpoint.method}
                        </span>
                        <span className="endpoint-path" style={{ marginLeft: '12px' }}>
                          {endpoint.path}
                        </span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`${endpoint.method} ${serviceInfo.endpoint}${endpoint.path}`)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="endpoint-description">
                      {endpoint.description}
                    </div>
                  </EndpointItem>
                ))}
              </EndpointsList>
            </div>
          )}

          {activeTab === 'configuration' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Service Configuration</h3>
              <CodeBlock>
{`{
  "service": {
    "name": "${serviceInfo.name}",
    "version": "${serviceInfo.version}",
    "description": "${serviceInfo.description}"
  },
  "capabilities": {
    "taskExecution": ${capabilities.taskExecution},
    "workflowSupport": ${capabilities.workflowSupport},
    "batchProcessing": ${capabilities.batchProcessing},
    "containerSupport": ${JSON.stringify(capabilities.containerSupport)},
    "storageBackends": ${JSON.stringify(capabilities.storageBackends)},
    "authMethods": ${JSON.stringify(capabilities.authMethods)}
  },
  "limits": {
    "maxConcurrentTasks": 100,
    "maxTaskDuration": "24h",
    "maxCpuCores": 16,
    "maxMemoryGB": 64,
    "maxStorageGB": 1000
  }
}`}
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard('Service configuration copied to clipboard')}
                >
                  <Copy size={12} />
                </button>
              </CodeBlock>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Recent Service Logs</h3>
              <CodeBlock>
{`[2025-10-28 00:58:32] INFO - TES service started successfully
[2025-10-28 00:58:33] INFO - Database connection established
[2025-10-28 00:58:34] INFO - Authentication service initialized
[2025-10-28 00:58:35] INFO - Container runtime Docker detected
[2025-10-28 00:58:36] INFO - Storage backends configured: Local, S3
[2025-10-28 00:58:37] INFO - API endpoints registered
[2025-10-28 00:58:38] INFO - TES service ready to accept requests
[2025-10-28 00:59:15] INFO - Task submitted: task_001
[2025-10-28 00:59:16] INFO - Task started: task_001
[2025-10-28 01:02:45] INFO - Task completed: task_001`}
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard('Service logs copied to clipboard')}
                >
                  <Copy size={12} />
                </button>
              </CodeBlock>
            </div>
          )}
        </TabContent>
      </TabsContainer>
    </ServiceInfoContainer>
  );
};

export default ServiceInfoPage;
