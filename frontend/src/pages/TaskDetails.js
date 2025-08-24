import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { taskService } from '../services/taskService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, formatTaskStatus } from '../utils/formatters';
import { TASK_STATE_COLORS } from '../utils/constants';
import { ArrowLeft, RefreshCw, StopCircle, FileText } from 'lucide-react';

const PageContainer = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  min-height: calc(100vh - 80px);
`;

const BackButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 20px;
  
  &:hover {
    background: #5a6268;
  }
`;

const PageHeader = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

const Title = styled.h1`
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #333;
  font-weight: 600;
`;

const TaskId = styled.code`
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: #495057;
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

const CardTitle = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f8f9fa;
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #495057;
  font-size: 14px;
`;

const InfoValue = styled.span`
  color: #333;
  font-size: 14px;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
`;

const TaskStatus = styled.span`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background-color: ${props => TASK_STATE_COLORS[props.status] || '#6c757d'};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const ActionButton = styled.button`
  background: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LogsSection = styled.div`
  grid-column: 1 / -1;
`;

const LogsContainer = styled.pre`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 15px;
  font-size: 12px;
  line-height: 1.4;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const TaskDetails = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const tesUrl = searchParams.get('tes_url');
  const taskId = searchParams.get('task_id');

  useEffect(() => {
    if (tesUrl && taskId) {
      fetchTaskDetails();
    }
  }, [tesUrl, taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getTaskDetails(tesUrl, taskId);
      setTaskDetails(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this task?')) return;
    
    try {
      setActionLoading(true);
      await taskService.cancelTask(tesUrl, taskId);
      await fetchTaskDetails(); // Refresh data
    } catch (err) {
      setError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLogs = () => {
    navigate(`/task-logs/${taskId}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner text="Loading task details..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <BackButton onClick={() => navigate('/tasks')}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Tasks
        </BackButton>
        <ErrorMessage error={error} title="Failed to load task details" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton onClick={() => navigate('/tasks')}>
        <ArrowLeft size={16} style={{ marginRight: '8px' }} />
        Back to Tasks
      </BackButton>

      <PageHeader>
        <Title>Task Details</Title>
        <TaskId>{taskId}</TaskId>
        
        <ActionButtons>
          <ActionButton onClick={fetchTaskDetails}>
            <RefreshCw size={16} style={{ marginRight: '8px' }} />
            Refresh
          </ActionButton>
          
          <ActionButton onClick={handleViewLogs}>
            <FileText size={16} style={{ marginRight: '8px' }} />
            View Logs
          </ActionButton>
          
          {taskDetails?.task_json?.state === 'RUNNING' && (
            <ActionButton 
              variant="danger" 
              onClick={handleCancel}
              disabled={actionLoading}
            >
              <StopCircle size={16} style={{ marginRight: '8px' }} />
              Cancel Task
            </ActionButton>
          )}
        </ActionButtons>
      </PageHeader>

      {taskDetails && (
        <ContentGrid>
          {/* Basic Information */}
          <ContentCard>
            <CardTitle>Basic Information</CardTitle>
            <InfoRow>
              <InfoLabel>Task ID:</InfoLabel>
              <InfoValue>{taskDetails.task_json?.id || 'N/A'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Name:</InfoLabel>
              <InfoValue>{taskDetails.task_json?.name || 'Unnamed Task'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Status:</InfoLabel>
              <InfoValue>
                <TaskStatus status={taskDetails.task_json?.state}>
                  {formatTaskStatus(taskDetails.task_json?.state)}
                </TaskStatus>
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>TES URL:</InfoLabel>
              <InfoValue>{tesUrl}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Description:</InfoLabel>
              <InfoValue>{taskDetails.task_json?.description || 'No description'}</InfoValue>
            </InfoRow>
          </ContentCard>

          {/* Timing Information */}
          <ContentCard>
            <CardTitle>Timing</CardTitle>
            <InfoRow>
              <InfoLabel>Created:</InfoLabel>
              <InfoValue>{formatDate(taskDetails.task_json?.creation_time)}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Started:</InfoLabel>
              <InfoValue>{formatDate(taskDetails.task_json?.start_time)}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Ended:</InfoLabel>
              <InfoValue>{formatDate(taskDetails.task_json?.end_time)}</InfoValue>
            </InfoRow>
          </ContentCard>

          {/* Resources */}
          {taskDetails.task_json?.resources && (
            <ContentCard>
              <CardTitle>Resources</CardTitle>
              <InfoRow>
                <InfoLabel>CPU Cores:</InfoLabel>
                <InfoValue>{taskDetails.task_json.resources.cpu_cores || 'N/A'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>RAM (GB):</InfoLabel>
                <InfoValue>{taskDetails.task_json.resources.ram_gb || 'N/A'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Disk (GB):</InfoLabel>
                <InfoValue>{taskDetails.task_json.resources.disk_gb || 'N/A'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Preemptible:</InfoLabel>
                <InfoValue>{taskDetails.task_json.resources.preemptible ? 'Yes' : 'No'}</InfoValue>
              </InfoRow>
            </ContentCard>
          )}

          {/* Executors */}
          {taskDetails.task_json?.executors && taskDetails.task_json.executors.length > 0 && (
            <ContentCard>
              <CardTitle>Executors</CardTitle>
              {taskDetails.task_json.executors.map((executor, index) => (
                <div key={index}>
                  <InfoRow>
                    <InfoLabel>Image:</InfoLabel>
                    <InfoValue>{executor.image}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Command:</InfoLabel>
                    <InfoValue>{executor.command?.join(' ') || 'N/A'}</InfoValue>
                  </InfoRow>
                  {index < taskDetails.task_json.executors.length - 1 && <hr />}
                </div>
              ))}
            </ContentCard>
          )}

          {/* Logs Preview */}
          <LogsSection>
            <ContentCard>
              <CardTitle>Logs Preview</CardTitle>
              {taskDetails.task_json?.logs && taskDetails.task_json.logs.length > 0 ? (
                <LogsContainer>
                  {taskDetails.task_json.logs.map((log, index) => (
                    <div key={index}>
                      {log.stdout && `STDOUT:\n${log.stdout}\n\n`}
                      {log.stderr && `STDERR:\n${log.stderr}\n\n`}
                    </div>
                  ))}
                </LogsContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No logs available
                </div>
              )}
            </ContentCard>
          </LogsSection>
        </ContentGrid>
      )}
    </PageContainer>
  );
};

export default TaskDetails;
