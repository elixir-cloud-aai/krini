import React, { useState } from 'react';
import styled from 'styled-components';
import usePolling from './hooks/usePolling';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import TaskSubmissionForm from './components/TaskSubmissionForm';
import { formatDate, formatTaskStatus } from './utils/formatters';
import { TASK_STATE_COLORS, POLLING_INTERVALS } from './utils/constants';
import { fetchDashboardData } from './services/api';
import { 
  RefreshCw, 
  Plus, 
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

const PageContainer = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  min-height: calc(100vh - 80px);
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  color: #333;
  font-weight: 600;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button<{ variant?: 'primary' | 'success' | 'secondary' }>`
  background: ${props => 
    props.variant === 'primary' ? '#007bff' : 
    props.variant === 'success' ? '#28a745' : '#6c757d'};
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TasksContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const SearchBar = styled.div`
  padding: 20px 20px 0 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3e%3ccircle cx='11' cy='11' r='8'/%3e%3cpath d='m21 21-4.35-4.35'/%3e%3c/svg%3e");
  background-size: 16px;
  background-repeat: no-repeat;
  background-position: 12px center;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
  }
`;

const TasksList = styled.div`
  max-height: 600px;
  overflow-y: auto;
`;

const TaskItem = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TaskDetails = styled.div`
  flex: 1;
`;

const TaskId = styled.div`
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  font-family: monospace;
  font-size: 14px;
`;

const TaskMeta = styled.div`
  font-size: 12px;
  color: #666;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const TaskActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const TaskStatus = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  background-color: ${props => TASK_STATE_COLORS[props.status] || '#6c757d'}20;
  color: ${props => TASK_STATE_COLORS[props.status] || '#6c757d'};
  border: 1px solid ${props => TASK_STATE_COLORS[props.status] || '#6c757d'}40;
  margin-right: 12px;
`;

const ActionButton = styled.button`
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 12px;

  &:hover {
    background: #e9ecef;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;
`;

const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1001;
  max-width: 400px;
`;

const Notification = styled.div<{ type: 'success' | 'error' | 'info' }>`
  background: ${props => 
    props.type === 'success' ? '#d4edda' :
    props.type === 'error' ? '#f8d7da' : '#d1ecf1'
  };
  color: ${props => 
    props.type === 'success' ? '#155724' :
    props.type === 'error' ? '#721c24' : '#0c5460'
  };
  border: 1px solid ${props => 
    props.type === 'success' ? '#c3e6cb' :
    props.type === 'error' ? '#f5c6cb' : '#bee5eb'
  };
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const NotificationMessage = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
`;

const NotificationClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: currentColor;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
`;

const LogViewerModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1002;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogViewerContent = styled.div`
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const LogViewerHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LogViewerBody = styled.div`
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f8f9fa;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  max-height: 500px;
`;

interface Task {
  id: string;
  state: string;
  creation_time: string;
  name?: string;
  description?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const TasksPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logViewerTask, setLogViewerTask] = useState<Task | null>(null);
  const [taskLogs, setTaskLogs] = useState<string>('');

  const { data: dashboardData, loading, error, refetch } = usePolling(
    fetchDashboardData,
    POLLING_INTERVALS.TASKS
  );

  const tasks = dashboardData?.recent_tasks || [];
  
  // Debug logging to see what data we're getting
  console.log('Dashboard data:', dashboardData);
  console.log('Recent tasks:', tasks);
  console.log('Tasks length:', tasks.length);
  
  const filteredTasks = tasks.filter((task: Task) =>
    task.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    const newNotification: Notification = { id, type, message };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleTaskSubmissionSuccess = (task: any) => {
    console.log('Task submitted successfully:', task);
    addNotification('success', `Task "${task.task_name || 'Untitled Task'}" submitted successfully! Task ID: ${task.task_id}`);
    
    // Refresh the tasks list after successful submission
    setTimeout(() => {
      refetch();
    }, 1000); // Small delay to allow backend to process
  };

  const handleViewLogs = async (task: Task) => {
    setLogViewerTask(task);
    setTaskLogs('Loading logs...');
    
    try {
      // Mock log data - replace with actual API call
      const mockLogs = `[${new Date().toISOString()}] Task ${task.id} started
[${new Date().toISOString()}] Pulling Docker image...
[${new Date().toISOString()}] Container started
[${new Date().toISOString()}] Executing command...
[${new Date().toISOString()}] Task state: ${task.state}
[${new Date().toISOString()}] Task completed with status: ${task.state}`;
      
      setTimeout(() => {
        setTaskLogs(mockLogs);
      }, 500);
    } catch (error) {
      setTaskLogs('Error loading logs: ' + error);
    }
  };

  if (loading && !dashboardData) {
    return (
      <PageContainer>
        <LoadingSpinner message="Loading tasks..." />
      </PageContainer>
    );
  }

  if (error && !dashboardData) {
    return (
      <PageContainer>
        <ErrorMessage 
          title="Failed to Load Tasks"
          message="Unable to fetch task data. Please check your connection and try again."
          onRetry={refetch}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <Title>Tasks</Title>
        <ButtonGroup>
          <Button variant="primary" onClick={refetch} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button variant="success" onClick={() => setIsSubmissionModalOpen(true)}>
        
            Submit New Task
          </Button>
        </ButtonGroup>
      </PageHeader>

      <TasksContainer>
        <SearchBar>
          <SearchInput
            type="text"
            placeholder="Search tasks by ID, name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBar>

        <TasksList>
          {filteredTasks.length === 0 ? (
            <EmptyState>
              {searchTerm ? 'No tasks match your search criteria' : 'No tasks found'}
            </EmptyState>
          ) : (
            filteredTasks.map((task: Task, index: number) => (
              <TaskItem key={task.id || index}>
                <TaskDetails>
                  <TaskId>{task.id || 'Unknown ID'}</TaskId>
                  <TaskMeta>
                    <span>Created: {formatDate(task.creation_time)}</span>
                    {task.name && <span>Name: {task.name}</span>}
                  </TaskMeta>
                </TaskDetails>
                <TaskActions>
                  <TaskStatus status={task.state || 'UNKNOWN'}>
                    {formatTaskStatus(task.state || 'unknown')}
                  </TaskStatus>
                  <ActionButton 
                    title="View Details"
                    onClick={() => console.log('View details for task:', task.id)}
                  >
                    <Eye size={14} />
                  </ActionButton>
                  <ActionButton 
                    title="View Logs"
                    onClick={() => handleViewLogs(task)}
                  >
                    <FileText size={14} />
                  </ActionButton>
                </TaskActions>
              </TaskItem>
            ))
          )}
        </TasksList>
      </TasksContainer>

      <TaskSubmissionForm
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        onSubmitSuccess={handleTaskSubmissionSuccess}
      />

      {/* Notifications */}
      <NotificationContainer>
        {notifications.map((notification) => (
          <Notification key={notification.id} type={notification.type}>
            {notification.type === 'success' && <CheckCircle size={16} />}
            {notification.type === 'error' && <AlertCircle size={16} />}
            {notification.type === 'info' && <AlertCircle size={16} />}
            <NotificationMessage>{notification.message}</NotificationMessage>
            <NotificationClose onClick={() => removeNotification(notification.id)}>
              <X size={16} />
            </NotificationClose>
          </Notification>
        ))}
      </NotificationContainer>

      {/* Log Viewer Modal */}
      {logViewerTask && (
        <LogViewerModal onClick={() => setLogViewerTask(null)}>
          <LogViewerContent onClick={(e) => e.stopPropagation()}>
            <LogViewerHeader>
              <h3>Task Logs - {logViewerTask.id}</h3>
              <ActionButton onClick={() => setLogViewerTask(null)}>
                <X size={16} />
              </ActionButton>
            </LogViewerHeader>
            <LogViewerBody>
              {taskLogs}
            </LogViewerBody>
          </LogViewerContent>
        </LogViewerModal>
      )}
    </PageContainer>
  );
};

export default TasksPage;
