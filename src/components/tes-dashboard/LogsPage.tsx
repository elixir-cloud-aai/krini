/**
 * Professional Logs Page
 * Comprehensive log monitoring, filtering, and analysis dashboard
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FileText,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
  EyeOff,
  Bug,
  Activity,
  Copy
} from 'lucide-react';

// Styled Components with Professional Design (No Gradients)
const LogsPageContainer = styled.div`
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

  .logs-icon {
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

const FiltersSection = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  padding: 20px 24px;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 16px;
  align-items: end;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }
`;

const SearchInput = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SelectInput = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const LogsContainer = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const LogsHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .logs-info {
    font-size: 14px;
    color: #64748b;
  }
`;

const LogsContent = styled.div`
  max-height: 600px;
  overflow-y: auto;
`;

const LogEntry = styled.div<{ level: 'info' | 'warn' | 'error' | 'debug' | 'success' }>`
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;
  border-left: 4px solid;
  
  ${props => {
    const colors = {
      info: { border: '#3b82f6', bg: '#eff6ff' },
      warn: { border: '#f59e0b', bg: '#fffbeb' },
      error: { border: '#ef4444', bg: '#fef2f2' },
      debug: { border: '#6b7280', bg: '#f9fafb' },
      success: { border: '#10b981', bg: '#ecfdf5' }
    };
    const color = colors[props.level];
    return `
      border-left-color: ${color.border};
      
      &:hover {
        background-color: ${color.bg};
      }
    `;
  }}
  
  &:last-child {
    border-bottom: none;
  }
`;

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const LogMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LogLevel = styled.span<{ level: 'info' | 'warn' | 'error' | 'debug' | 'success' }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 4px;
  
  ${props => {
    const colors = {
      info: { bg: '#dbeafe', color: '#1d4ed8' },
      warn: { bg: '#fef3c7', color: '#92400e' },
      error: { bg: '#fee2e2', color: '#b91c1c' },
      debug: { bg: '#f3f4f6', color: '#374151' },
      success: { bg: '#dcfce7', color: '#166534' }
    };
    const color = colors[props.level];
    return `
      background-color: ${color.bg};
      color: ${color.color};
    `;
  }}
`;

const LogTimestamp = styled.span`
  font-size: 12px;
  color: #6b7280;
  font-family: 'Courier New', monospace;
`;

const LogSource = styled.span`
  font-size: 12px;
  color: #6b7280;
  padding: 2px 6px;
  background-color: #f3f4f6;
  border-radius: 4px;
`;

const LogActions = styled.div`
  display: flex;
  gap: 8px;
`;

const LogActionButton = styled.button`
  padding: 4px 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  color: #6b7280;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f3f4f6;
    color: #374151;
  }
`;

const LogMessage = styled.div`
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
`;

const LogDetails = styled.div<{ expanded: boolean }>`
  margin-top: 12px;
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  display: ${props => props.expanded ? 'block' : 'none'};
  
  .details-content {
    font-size: 13px;
    color: #4b5563;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  text-align: center;
  
  .stat-icon {
    display: inline-flex;
    padding: 8px;
    border-radius: 6px;
    margin-bottom: 8px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
    text-transform: uppercase;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 40px;
  color: #64748b;
  
  .empty-icon {
    margin-bottom: 16px;
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: #374151;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

// Interfaces
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  source: string;
  message: string;
  details?: string;
}

interface LogFilters {
  search: string;
  level: string;
  source: string;
  timeRange: string;
}

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    level: 'all',
    source: 'all',
    timeRange: '24h'
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Generate mock log data
  useEffect(() => {
    const generateLogs = (): LogEntry[] => {
      const sources = ['TES-API', 'DATABASE', 'WORKFLOW', 'AUTH', 'STORAGE', 'NETWORK'];
      const levels: Array<'info' | 'warn' | 'error' | 'debug' | 'success'> = ['info', 'warn', 'error', 'debug', 'success'];
      const messages = [
        'Task execution started for task_12345',
        'Database connection established successfully',
        'Workflow validation completed',
        'Authentication token refreshed',
        'File upload completed: workflow_data.zip',
        'Network connectivity check passed',
        'Task execution failed: timeout exceeded',
        'Database query optimization applied',
        'Container image pull completed',
        'Service health check successful',
        'Memory usage warning: 85% threshold reached',
        'SSL certificate validation successful',
        'Background job queue processed 150 items',
        'Cache invalidation completed',
        'API rate limit approaching for client_xyz'
      ];

      const mockLogs: LogEntry[] = [];
      for (let i = 0; i < 50; i++) {
        const level = levels[Math.floor(Math.random() * levels.length)];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString();
        
        mockLogs.push({
          id: `log_${i}`,
          timestamp,
          level,
          source,
          message,
          details: level === 'error' ? `Stack trace:\n  at TaskProcessor.execute(task.js:123)\n  at WorkflowEngine.run(workflow.js:456)\n  at main(app.js:789)` : undefined
        });
      }
      
      return mockLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    setLogs(generateLogs());
  }, []);

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.level !== 'all' && log.level !== filters.level) {
      return false;
    }
    if (filters.source !== 'all' && log.source !== filters.source) {
      return false;
    }
    return true;
  });

  // Calculate log statistics
  const logStats = {
    total: filteredLogs.length,
    errors: filteredLogs.filter(log => log.level === 'error').length,
    warnings: filteredLogs.filter(log => log.level === 'warn').length,
    info: filteredLogs.filter(log => log.level === 'info').length
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyLogEntry = (log: LogEntry) => {
    const logText = `[${log.timestamp}] ${log.level.toUpperCase()} ${log.source}: ${log.message}`;
    navigator.clipboard.writeText(logText);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle size={12} />;
      case 'warn': return <AlertTriangle size={12} />;
      case 'info': return <Info size={12} />;
      case 'debug': return <Bug size={12} />;
      case 'success': return <CheckCircle size={12} />;
      default: return <Info size={12} />;
    }
  };

  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()} ${log.source}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <LogsPageContainer>
      <PageHeader>
        <HeaderContent>
          <HeaderTitle>
            <div className="logs-icon">
              <FileText size={24} />
            </div>
            System Logs
          </HeaderTitle>
          <HeaderSubtitle>
            Monitor system activity and troubleshoot issues • Last updated: {lastUpdated.toLocaleTimeString()}
          </HeaderSubtitle>
        </HeaderContent>
        <HeaderActions>
          <ActionButton variant="secondary" onClick={exportLogs}>
            <Download size={16} />
            Export Logs
          </ActionButton>
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

      {/* Log Statistics */}
      <StatsGrid>
        <StatCard>
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <FileText size={20} />
          </div>
          <div className="stat-value">{logStats.total}</div>
          <div className="stat-label">Total Logs</div>
        </StatCard>
        <StatCard>
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
            <XCircle size={20} />
          </div>
          <div className="stat-value">{logStats.errors}</div>
          <div className="stat-label">Errors</div>
        </StatCard>
        <StatCard>
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-value">{logStats.warnings}</div>
          <div className="stat-label">Warnings</div>
        </StatCard>
        <StatCard>
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <Info size={20} />
          </div>
          <div className="stat-value">{logStats.info}</div>
          <div className="stat-label">Info</div>
        </StatCard>
      </StatsGrid>

      {/* Filters Section */}
      <FiltersSection>
        <FiltersGrid>
          <FilterGroup>
            <label htmlFor="search">Search Logs</label>
            <SearchInput
              id="search"
              type="text"
              placeholder="Search messages, sources, or details..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </FilterGroup>
          <FilterGroup>
            <label htmlFor="level">Log Level</label>
            <SelectInput
              id="level"
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="success">Success</option>
            </SelectInput>
          </FilterGroup>
          <FilterGroup>
            <label htmlFor="source">Source</label>
            <SelectInput
              id="source"
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            >
              <option value="all">All Sources</option>
              <option value="TES-API">TES API</option>
              <option value="DATABASE">Database</option>
              <option value="WORKFLOW">Workflow</option>
              <option value="AUTH">Authentication</option>
              <option value="STORAGE">Storage</option>
              <option value="NETWORK">Network</option>
            </SelectInput>
          </FilterGroup>
          <FilterGroup>
            <label htmlFor="timeRange">Time Range</label>
            <SelectInput
              id="timeRange"
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </SelectInput>
          </FilterGroup>
          <ActionButton variant="secondary">
            <Filter size={16} />
            Clear
          </ActionButton>
        </FiltersGrid>
      </FiltersSection>

      {/* Logs Container */}
      <LogsContainer>
        <LogsHeader>
          <h2>
            <Activity size={18} />
            System Activity ({filteredLogs.length} entries)
          </h2>
          <div className="logs-info">
            Showing {filters.level !== 'all' ? filters.level : 'all'} logs 
            {filters.source !== 'all' && ` from ${filters.source}`}
          </div>
        </LogsHeader>
        
        <LogsContent>
          {filteredLogs.length === 0 ? (
            <EmptyState>
              <div className="empty-icon">
                <FileText size={48} color="#9ca3af" />
              </div>
              <h3>No logs found</h3>
              <p>Try adjusting your filters or check back later for new log entries.</p>
            </EmptyState>
          ) : (
            filteredLogs.map(log => (
              <LogEntry key={log.id} level={log.level}>
                <LogHeader>
                  <LogMeta>
                    <LogLevel level={log.level}>
                      {getLevelIcon(log.level)}
                      {log.level}
                    </LogLevel>
                    <LogTimestamp>
                      {new Date(log.timestamp).toLocaleString()}
                    </LogTimestamp>
                    <LogSource>{log.source}</LogSource>
                  </LogMeta>
                  <LogActions>
                    <LogActionButton onClick={() => copyLogEntry(log)}>
                      <Copy size={14} />
                    </LogActionButton>
                    {log.details && (
                      <LogActionButton onClick={() => toggleLogExpansion(log.id)}>
                        {expandedLogs.has(log.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </LogActionButton>
                    )}
                  </LogActions>
                </LogHeader>
                <LogMessage>{log.message}</LogMessage>
                {log.details && (
                  <LogDetails expanded={expandedLogs.has(log.id)}>
                    <div className="details-content">{log.details}</div>
                  </LogDetails>
                )}
              </LogEntry>
            ))
          )}
        </LogsContent>
      </LogsContainer>
    </LogsPageContainer>
  );
};

export default LogsPage;
