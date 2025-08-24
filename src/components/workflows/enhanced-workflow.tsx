import React, { FC, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JSONTree } from 'react-json-tree';
import DashboardLayout from '../common/DashboardLayout';
import { HOST_URI_WES } from '@/config/constants';
import { WorkflowProps } from './types';
import { 
  Play, 
  Pause,
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Download,
  Copy,
  FileText,
  Terminal,
  Activity,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';

interface WorkflowRun {
  run_id: string;
  state: 'QUEUED' | 'INITIALIZING' | 'RUNNING' | 'PAUSED' | 'COMPLETE' | 'EXECUTOR_ERROR' | 'SYSTEM_ERROR' | 'CANCELED';
  request: any;
  outputs: any;
  run_log: {
    name?: string;
    cmd?: string[];
    start_time?: string;
    end_time?: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
  };
  task_logs?: any[];
}

const EnhancedWorkflow: FC<WorkflowProps> = ({ isLoggedIn }) => {
  const navigate = useNavigate();
  const params = useParams();
  const { id } = params;
  const [workflow, setWorkflow] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn, navigate]);

  const fetchWorkflow = React.useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${HOST_URI_WES}/runs/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }
      const data = await response.json();
      setWorkflow(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const getStatusIcon = (state: string) => {
    switch (state?.toUpperCase()) {
      case 'COMPLETE':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'RUNNING':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'PAUSED':
        return <Pause className="w-5 h-5 text-yellow-600" />;
      case 'CANCELED':
      case 'EXECUTOR_ERROR':
      case 'SYSTEM_ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'QUEUED':
        return <Clock className="w-5 h-5 text-gray-600" />;
      case 'INITIALIZING':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state?.toUpperCase()) {
      case 'COMPLETE':
        return 'bg-green-100 text-green-800';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELED':
      case 'EXECUTOR_ERROR':
      case 'SYSTEM_ERROR':
        return 'bg-red-100 text-red-800';
      case 'QUEUED':
        return 'bg-gray-100 text-gray-800';
      case 'INITIALIZING':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const copyToClipboard = (text: string, _label: string) => {
    navigator.clipboard.writeText(text);
    // You could show a toast here if showToast is available
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start) return 'N/A';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 60000); // minutes
    return `${duration}m`;
  };

  const renderWorkflowOverview = () => (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {getStatusIcon(workflow?.state || '')}
          <div className="ml-3">
            <h2 className="text-xl font-semibold text-gray-900">Workflow Run Details</h2>
            <p className="text-sm text-gray-600">Run ID: {id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workflow?.state || '')}`}>
            {workflow?.state || 'UNKNOWN'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <Calendar className="w-5 h-5 text-gray-600 mr-3" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Start Time</p>
            <p className="text-sm font-medium text-gray-900">
              {formatTimestamp(workflow?.run_log?.start_time)}
            </p>
          </div>
        </div>

        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <Activity className="w-5 h-5 text-gray-600 mr-3" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
            <p className="text-sm font-medium text-gray-900">
              {calculateDuration(workflow?.run_log?.start_time, workflow?.run_log?.end_time)}
            </p>
          </div>
        </div>

        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <Terminal className="w-5 h-5 text-gray-600 mr-3" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Exit Code</p>
            <p className="text-sm font-medium text-gray-900">
              {workflow?.run_log?.exit_code ?? 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <User className="w-5 h-5 text-gray-600 mr-3" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Workflow Name</p>
            <p className="text-sm font-medium text-gray-900">
              {workflow?.run_log?.name || 'Unnamed'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center space-x-2">
        <button
          onClick={() => copyToClipboard(id || '', 'Run ID')}
          className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Run ID
        </button>
        <button className="flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </button>
        <button
          onClick={fetchWorkflow}
          className="flex items-center px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>
    </div>
  );

  const renderDataSection = (title: string, data: any, icon: React.ReactNode) => (
    <div className="bg-white rounded-lg shadow-sm border mb-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          {icon}
          <h3 className="ml-2 text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      <div className="p-4">
        {data ? (
          <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
            <JSONTree
              data={data}
              theme={{
                scheme: 'bright',
                base00: '#f8f9fa',
                base01: '#e9ecef',
                base02: '#dee2e6',
                base03: '#ced4da',
                base04: '#adb5bd',
                base05: '#6c757d',
                base06: '#495057',
                base07: '#212529',
                base08: '#dc3545',
                base09: '#fd7e14',
                base0A: '#ffc107',
                base0B: '#28a745',
                base0C: '#20c997',
                base0D: '#007bff',
                base0E: '#6f42c1',
                base0F: '#e83e8c'
              }}
              invertTheme={false}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderLogSection = () => (
    <div className="bg-white rounded-lg shadow-sm border mb-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Terminal className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Execution Logs</h3>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {workflow?.run_log?.stdout && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Standard Output</h4>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-48">
              <pre>{workflow.run_log.stdout}</pre>
            </div>
          </div>
        )}
        
        {workflow?.run_log?.stderr && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Standard Error</h4>
            <div className="bg-gray-900 text-red-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-48">
              <pre>{workflow.run_log.stderr}</pre>
            </div>
          </div>
        )}
        
        {workflow?.run_log?.cmd && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Command</h4>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg font-mono text-sm">
              <pre>{Array.isArray(workflow.run_log.cmd) ? workflow.run_log.cmd.join(' ') : workflow.run_log.cmd}</pre>
            </div>
          </div>
        )}
        
        {!workflow?.run_log?.stdout && !workflow?.run_log?.stderr && !workflow?.run_log?.cmd && (
          <div className="text-center py-8 text-gray-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No logs available</p>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoggedIn === 'false') {
    return null;
  }

  return (
    <DashboardLayout
      title={`Workflow ${id?.slice(-8) || ''}`}
      subtitle="Detailed workflow execution information"
      isLoading={loading}
      error={error}
      onRefresh={fetchWorkflow}
    >
      {workflow && (
        <div className="space-y-6">
          {renderWorkflowOverview()}
          {renderDataSection('Workflow Request', workflow.request, <FileText className="w-5 h-5 text-blue-600" />)}
          {renderDataSection('Workflow Outputs', workflow.outputs, <Download className="w-5 h-5 text-green-600" />)}
          {renderLogSection()}
          {workflow.task_logs && renderDataSection('Task Logs', workflow.task_logs, <Activity className="w-5 h-5 text-purple-600" />)}
        </div>
      )}
    </DashboardLayout>
  );
};

export default EnhancedWorkflow;
