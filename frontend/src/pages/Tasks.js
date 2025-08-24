import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { taskService } from '../services/taskService';
import usePolling from '../hooks/usePolling';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, formatTaskStatus, formatDuration } from '../utils/formatters';
import { TASK_STATE_COLORS, POLLING_INTERVALS } from '../utils/constants';
import { 
  StopCircle, 
  RefreshCw, 
  Plus, 
  Eye, 
  FileText,
  Search
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

const Button = styled.button`
  background: ${props => props.variant === 'primary' ? '#007bff' : props.variant === 'success' ? '#28a745' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ButtonIcon = styled.div`
  margin-right: 8px;
  display: flex;
  align-items: center;
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  flex: 1;
  padding: 8px;
  font-size: 14px;
  outline: none;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #dee2e6;
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
`;

const TableRow = styled.tr`
  &:hover {
    background-color: #f8f9fa;
  }
  
  &:nth-child(even) {
    background-color: #fdfdfd;
  }
`;

const TableCell = styled.td`
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
  font-size: 14px;
  vertical-align: middle;
`;

const TaskStatus = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background-color: ${props => TASK_STATE_COLORS[props.status] || '#6c757d'};
`;

const ActionButton = styled.button`
  background: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;
`;

const Tasks = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTasks, setFilteredTasks] = useState([]);

  // Poll tasks data
  const { 
    data: tasksData, 
    loading, 
    error,
    refetch 
  } = usePolling(taskService.listTasks, POLLING_INTERVALS.NORMAL);

  // Handle task cancellation
  const handleCancelTask = async (tesUrl, taskId) => {
    if (window.confirm('Are you sure you want to cancel this task?')) {
      try {
        await taskService.cancelTask(tesUrl, taskId);
        refetch(); // Refresh the tasks list
      } catch (error) {
        console.error('Error canceling task:', error);
        alert('Failed to cancel task: ' + error.message);
      }
    }
  };

  // Handle viewing task details
  const handleViewDetails = (tesUrl, taskId) => {
    navigate(`/task-details?tes_url=${encodeURIComponent(tesUrl)}&task_id=${encodeURIComponent(taskId)}`);
  };

  // Handle viewing task logs
  const handleViewLogs = (taskId) => {
    navigate(`/task-logs/${taskId}`);
  };

  // Filter tasks based on search term
  useEffect(() => {
    if (!tasksData || !Array.isArray(tasksData)) {
      setFilteredTasks([]);
      return;
    }

    if (!searchTerm) {
      setFilteredTasks(tasksData);
    } else {
      const filtered = tasksData.filter(task => 
        task.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.tes_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.tes_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTasks(filtered);
    }
  }, [tasksData, searchTerm]);

  return (
    <PageContainer>
      <PageHeader>
        <Title>Task Management</Title>
        <ButtonGroup>
          <Button 
            variant="success" 
            onClick={() => navigate('/submit-task')}
          >
            <ButtonIcon><Plus size={16} /></ButtonIcon>
            Submit Task
          </Button>
          
          <Button 
            variant="primary" 
            onClick={refetch}
            disabled={loading}
          >
            <ButtonIcon><RefreshCw size={16} /></ButtonIcon>
            Refresh
          </Button>
        </ButtonGroup>
      </PageHeader>

      <ContentCard>
        {/* Search Bar */}
        <SearchBar>
          <Search size={20} color="#6c757d" />
          <SearchInput
            type="text"
            placeholder="Search tasks by ID, name, status, or TES URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBar>

        {error && <ErrorMessage error={error} />}
        
        {loading && <LoadingSpinner text="Loading tasks..." />}
        
        {!loading && filteredTasks.length === 0 ? (
          <EmptyState>
            {searchTerm ? 'No tasks found matching your search.' : 'No tasks found.'}
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <TableHeader>Task ID</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>TES Instance</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Duration</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, index) => (
                <TableRow key={task.id || index}>
                  <TableCell>
                    <code style={{ fontSize: '12px', background: '#f8f9fa', padding: '2px 4px', borderRadius: '3px' }}>
                      {task.id || `Task ${index + 1}`}
                    </code>
                  </TableCell>
                  <TableCell>{task.name || 'Unnamed Task'}</TableCell>
                  <TableCell>
                    <TaskStatus status={task.state}>
                      {formatTaskStatus(task.state)}
                    </TaskStatus>
                  </TableCell>
                  <TableCell>{task.tes_url || 'Unknown'}</TableCell>
                  <TableCell>{formatDate(task.creation_time)}</TableCell>
                  <TableCell>
                    {task.creation_time && task.end_time 
                      ? formatDuration((new Date(task.end_time) - new Date(task.creation_time)) / 1000)
                      : task.state === 'RUNNING' ? 'Running...' : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <ActionButton 
                      onClick={() => handleViewDetails(task.tes_url, task.id)}
                    >
                      <Eye size={12} style={{ marginRight: '4px' }} />
                      Details
                    </ActionButton>
                    
                    <ActionButton 
                      onClick={() => handleViewLogs(task.id)}
                    >
                      <FileText size={12} style={{ marginRight: '4px' }} />
                      Logs
                    </ActionButton>
                    
                    {(task.state === 'RUNNING' || task.state === 'QUEUED') && (
                      <ActionButton 
                        variant="danger"
                        onClick={() => handleCancelTask(task.tes_url, task.id)}
                      >
                        <StopCircle size={12} style={{ marginRight: '4px' }} />
                        Cancel
                      </ActionButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>
    </PageContainer>
  );
};

export default Tasks;
