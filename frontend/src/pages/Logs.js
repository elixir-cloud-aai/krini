import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FileText, Download, RefreshCw, Search, Filter, Calendar } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { statusService } from '../services/statusService';
import { taskService } from '../services/taskService';
import { workflowService } from '../services/workflowService';
import { batchService } from '../services/batchService';
import { formatDateTime } from '../utils/formatters';

const LogsContainer = styled.div`
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

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  width: 250px;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
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

const LogsSection = styled.div`
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

const LogEntry = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const LogHeader = styled.div`
  background: #f9fafb;
  padding: 1rem;
  display: flex;
  justify-content: between;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f3f4f6;
  }
`;

const LogHeaderLeft = styled.div`
  flex: 1;
`;

const LogHeaderRight = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const LogTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 0.25rem;
`;

const LogMeta = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const LogContent = styled.div`
  padding: 1rem;
  background: #1f2937;
  color: #e5e7eb;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
`;

const DownloadButton = styled.button`
  background: #f3f4f6;
  color: #374151;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`;

const NoLogsMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const Logs = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [logType, setLogType] = useState('all');
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, logType]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const allLogs = [];

      // Get dashboard data for submitted tasks and workflows
      const dashboardData = await taskService.getDashboardData();

      // Add task logs
      if (Array.isArray(dashboardData.submitted_tasks)) {
        for (const task of dashboardData.submitted_tasks.slice(-10)) { // Latest 10 tasks
          try {
            const logContent = await statusService.getTaskLogs(task.task_id);
            allLogs.push({
              id: task.task_id,
              type: 'task',
              title: `Task ${task.task_id}`,
              content: logContent || 'No log content available',
              timestamp: task.submitted_at || new Date().toISOString(),
              metadata: {
                status: task.status,
                tesInstance: task.tes_name || 'Unknown'
              }
            });
          } catch (err) {
            allLogs.push({
              id: task.task_id,
              type: 'task',
              title: `Task ${task.task_id}`,
              content: `Failed to load log: ${err.message}`,
              timestamp: task.submitted_at || new Date().toISOString(),
              metadata: {
                status: task.status,
                tesInstance: task.tes_name || 'Unknown'
              }
            });
          }
        }
      }

      // Add workflow logs
      if (Array.isArray(dashboardData.workflow_runs)) {
        for (const workflow of dashboardData.workflow_runs.slice(-10)) { // Latest 10 workflows
          try {
            const logContent = await workflowService.getWorkflowLogs(workflow.run_id);
            allLogs.push({
              id: workflow.run_id,
              type: 'workflow',
              title: `Workflow ${workflow.type} - ${workflow.run_id}`,
              content: logContent || 'No log content available',
              timestamp: workflow.submitted_at || new Date().toISOString(),
              metadata: {
                status: workflow.status,
                tesInstance: workflow.tes_name || 'Unknown',
                workflowType: workflow.type
              }
            });
          } catch (err) {
            allLogs.push({
              id: workflow.run_id,
              type: 'workflow',
              title: `Workflow ${workflow.type} - ${workflow.run_id}`,
              content: `Failed to load log: ${err.message}`,
              timestamp: workflow.submitted_at || new Date().toISOString(),
              metadata: {
                status: workflow.status,
                tesInstance: workflow.tes_name || 'Unknown',
                workflowType: workflow.type
              }
            });
          }
        }
      }

      // Add batch logs
      try {
        const batchRuns = await batchService.getBatchRuns();
        for (const batch of batchRuns.slice(-10)) { // Latest 10 batch runs
          try {
            const logContent = await batchService.getBatchLog(batch.run_id);
            allLogs.push({
              id: batch.run_id,
              type: 'batch',
              title: `Batch ${batch.workflow_type} - ${batch.run_id}`,
              content: logContent || 'No log content available',
              timestamp: batch.submitted_at || new Date().toISOString(),
              metadata: {
                status: batch.status,
                tesInstance: batch.tes_name || 'Unknown',
                workflowType: batch.workflow_type,
                mode: batch.mode
              }
            });
          } catch (err) {
            allLogs.push({
              id: batch.run_id,
              type: 'batch',
              title: `Batch ${batch.workflow_type} - ${batch.run_id}`,
              content: `Failed to load log: ${err.message}`,
              timestamp: batch.submitted_at || new Date().toISOString(),
              metadata: {
                status: batch.status,
                tesInstance: batch.tes_name || 'Unknown',
                workflowType: batch.workflow_type,
                mode: batch.mode
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to load batch logs:', err);
      }

      // Get topology logs
      try {
        const topologyLogs = await statusService.getTopologyLogs();
        if (Array.isArray(topologyLogs)) {
          topologyLogs.forEach((log, index) => {
            allLogs.push({
              id: `topology-${index}`,
              type: 'system',
              title: log.label || `System Log ${index + 1}`,
              content: log.content || 'No content available',
              timestamp: new Date().toISOString(),
              metadata: {
                source: 'topology'
              }
            });
          });
        }
      } catch (err) {
        console.error('Failed to load topology logs:', err);
      }

      // Sort logs by timestamp (newest first)
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setLogs(allLogs);
    } catch (err) {
      setError('Failed to load logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by type
    if (logType !== 'all') {
      filtered = filtered.filter(log => log.type === logType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.metadata.tesInstance && log.metadata.tesInstance.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredLogs(filtered);
  };

  const toggleLogExpansion = (logId) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const downloadLog = (log) => {
    const blob = new Blob([log.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${log.title.replace(/[^a-zA-Z0-9]/g, '_')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <LogsContainer>
      <Header>
        <HeaderLeft>
          <Title>System Logs</Title>
          <Subtitle>View and download logs from tasks, workflows, and system operations</Subtitle>
        </HeaderLeft>
        <Controls>
          <SearchInput
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterSelect value={logType} onChange={(e) => setLogType(e.target.value)}>
            <option value="all">All Logs</option>
            <option value="task">Task Logs</option>
            <option value="workflow">Workflow Logs</option>
            <option value="batch">Batch Logs</option>
            <option value="system">System Logs</option>
          </FilterSelect>
          <RefreshButton onClick={loadLogs} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </Controls>
      </Header>

      {error && <ErrorMessage message={error} />}

      <LogsSection>
        <SectionTitle>
          <FileText size={20} />
          Log Entries ({filteredLogs.length})
        </SectionTitle>

        {loading ? (
          <LoadingSpinner />
        ) : filteredLogs.length === 0 ? (
          <NoLogsMessage>
            {logs.length === 0 ? 'No logs available' : 'No logs match your search criteria'}
          </NoLogsMessage>
        ) : (
          filteredLogs.map((log) => (
            <LogEntry key={log.id}>
              <LogHeader onClick={() => toggleLogExpansion(log.id)}>
                <LogHeaderLeft>
                  <LogTitle>{log.title}</LogTitle>
                  <LogMeta>
                    {formatDateTime(log.timestamp)} • 
                    Type: {log.type} • 
                    {log.metadata.tesInstance && `Instance: ${log.metadata.tesInstance} • `}
                    {log.metadata.status && `Status: ${log.metadata.status}`}
                    {log.metadata.workflowType && ` • Workflow: ${log.metadata.workflowType}`}
                    {log.metadata.mode && ` • Mode: ${log.metadata.mode}`}
                  </LogMeta>
                </LogHeaderLeft>
                <LogHeaderRight>
                  <DownloadButton
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadLog(log);
                    }}
                    title="Download log file"
                  >
                    <Download size={14} />
                  </DownloadButton>
                  <ExpandButton>
                    {expandedLogs.has(log.id) ? '−' : '+'}
                  </ExpandButton>
                </LogHeaderRight>
              </LogHeader>
              
              {expandedLogs.has(log.id) && (
                <LogContent>
                  {log.content || 'No log content available'}
                </LogContent>
              )}
            </LogEntry>
          ))
        )}
      </LogsSection>
    </LogsContainer>
  );
};

export default Logs;
