import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Upload, 
  FileText, 
  X, 
  RefreshCw, 
  Eye, 
  Clock, 
  AlertCircle,
  ChevronDown,
  Play
} from 'lucide-react';
import { usePolling } from './hooks/usePolling';
import { fetchDashboardData } from './services/api';
import { POLLING_INTERVALS } from './utils/constants';
import { formatDate } from './utils/formatters';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

// Styled Components
const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
`;

const HeaderSection = styled.div`
  margin-bottom: 32px;
  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #2d3748;
    margin: 0 0 8px 0;
  }
  p {
    color: #718096;
    font-size: 16px;
    margin: 0;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 24px;
`;

const CardHeader = styled.div`
  padding: 24px 24px 0 24px;
  border-bottom: none;
  
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #2d3748;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  p {
    color: #718096;
    font-size: 14px;
    margin: 0;
  }
`;

const CardContent = styled.div`
  padding: 24px;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  color: ${props => props.active ? '#4299e1' : '#718096'};
  
  &:hover {
    color: #4299e1;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: ${props => props.active ? '#4299e1' : 'transparent'};
  }
`;

const FormContainer = styled.div`
  width: 100%;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
`;

const RequiredMark = styled.span`
  color: #ef4444;
  margin-left: 4px;
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  
  input[type="radio"] {
    margin: 0;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #4299e1;
  }
`;

const FileUploadGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FileUploadArea = styled.div`
  border: 2px dashed #cbd5e0;
  border-radius: 8px;
  padding: 32px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f7fafc;
  
  &:hover {
    border-color: #4299e1;
    background: #ebf8ff;
  }
  
  &.dragover {
    border-color: #4299e1;
    background: #ebf8ff;
  }
`;

const FileUploadIcon = styled.div`
  color: #a0aec0;
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
`;

const FileUploadText = styled.div`
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
  margin-bottom: 4px;
`;

const FileUploadSubtext = styled.div`
  font-size: 12px;
  color: #a0aec0;
`;

const FileInput = styled.input`
  display: none;
`;

const SelectedFile = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 14px;
`;

const FileName = styled.span`
  flex: 1;
  color: #0369a1;
`;

const RemoveFileButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: 'Monaco', 'Menlo', monospace;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #4299e1;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary'; disabled?: boolean }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  
  ${props => props.variant === 'primary' ? `
    background: #4299e1;
    color: white;
    
    &:hover:not(:disabled) {
      background: #3182ce;
    }
  ` : `
    background: white;
    color: #4299e1;
    border: 2px solid #4299e1;
    
    &:hover:not(:disabled) {
      background: #ebf8ff;
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RunsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
  
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #2d3748;
    margin: 0;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  color: #4a5568;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    border-color: #4299e1;
    color: #4299e1;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RunsTable = styled.div`
  overflow-x: auto;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 13px;
  color: #4a5568;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.1s;
  
  &:hover {
    background: #f8fafc;
  }
`;

const TableCell = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #374151;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status.toUpperCase()) {
      case 'SUBMITTED':
        return 'background: #dbeafe; color: #1e40af;';
      case 'RUNNING':
        return 'background: #fef3c7; color: #92400e;';
      case 'COMPLETED':
        return 'background: #dcfce7; color: #166534;';
      case 'FAILED':
        return 'background: #fee2e2; color: #dc2626;';
      case 'CANCELLED':
        return 'background: #f3f4f6; color: #374151;';
      default:
        return 'background: #f3f4f6; color: #6b7280;';
    }
  }}
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #4a5568;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: #4299e1;
    color: #4299e1;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
`;

const LoadMoreContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 20px;
`;

const LoadMoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: white;
  border: 2px solid #4299e1;
  border-radius: 8px;
  color: #4299e1;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    background: #ebf8ff;
  }
`;

// Modal styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #2d3748;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  
  &:hover {
    color: #374151;
  }
`;

const LogsContainer = styled.pre`
  background: #1a202c;
  color: #e2e8f0;
  padding: 20px;
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  overflow: auto;
  flex: 1;
  white-space: pre-wrap;
`;

// Types
interface BatchFormData {
  batchMode: 'all' | 'gateway';
  workflowFile: File | null;
  inputFile: File | null;
  configFile: File | null;
  parametersJson: string;
  snakemakeDirectory: File | null;
}

interface BatchRun {
  id: string;
  workflowType: string;
  mode: string;
  tesInstance: string;
  status: string;
  submitted: string;
  duration?: string;
}

const BatchProcessingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Snakemake' | 'Nextflow' | 'CWL'>('Snakemake');
  const [formData, setFormData] = useState<BatchFormData>({
    batchMode: 'all',
    workflowFile: null,
    inputFile: null,
    configFile: null,
    parametersJson: '{}',
    snakemakeDirectory: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [currentLogs, setCurrentLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [displayCount, setDisplayCount] = useState(5);

  // File refs
  const workflowFileRef = useRef<HTMLInputElement>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const configFileRef = useRef<HTMLInputElement>(null);
  const snakemakeDirectoryRef = useRef<HTMLInputElement>(null);

  const { data: dashboardData, loading, error: fetchError, refetch } = usePolling(
    fetchDashboardData,
    POLLING_INTERVALS.DASHBOARD
  );

  // Get batch runs from dashboard data
  const batchRuns: BatchRun[] = dashboardData?.batch_runs?.map((run: any) => ({
    id: run.run_id || run.id || 'unknown',
    workflowType: run.workflow_type || 'unknown',
    mode: run.mode || run.batch_mode || 'all',
    tesInstance: run.tes_instance_name || run.tes_instance || '-',
    status: run.status || run.state || 'SUBMITTED',
    submitted: formatDate(run.submitted_at || run.creation_time || run.submitted),
    duration: run.duration || '-'
  })) || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'batchMode') {
      setFormData(prev => ({ ...prev, batchMode: value as 'all' | 'gateway' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileSelect = (type: 'workflowFile' | 'inputFile' | 'configFile' | 'snakemakeDirectory', file: File | null) => {
    setFormData(prev => ({ ...prev, [type]: file }));
  };

  const handleFileDrop = (e: React.DragEvent, type: 'workflowFile' | 'inputFile' | 'configFile' | 'snakemakeDirectory') => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(type, files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'workflowFile' | 'inputFile' | 'configFile' | 'snakemakeDirectory') => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(type, file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formDataToSubmit = new FormData();
      
      // Map fields based on workflow type
      if (activeTab === 'CWL') {
        formDataToSubmit.append('batch_mode', formData.batchMode);
        if (formData.workflowFile) {
          formDataToSubmit.append('cwl_file', formData.workflowFile);
        }
        if (formData.inputFile) {
          formDataToSubmit.append('inputs_file', formData.inputFile);
        }
      } else if (activeTab === 'Nextflow') {
        formDataToSubmit.append('batch_mode', formData.batchMode);
        if (formData.workflowFile) {
          formDataToSubmit.append('nextflow_file', formData.workflowFile);
        }
        if (formData.configFile) {
          formDataToSubmit.append('nextflow_config', formData.configFile);
        }
        formDataToSubmit.append('nextflow_params', formData.parametersJson);
      } else if (activeTab === 'Snakemake') {
        formDataToSubmit.append('batch_mode', formData.batchMode);
        if (formData.workflowFile) {
          formDataToSubmit.append('snakefile', formData.workflowFile);
        }
        if (formData.snakemakeDirectory) {
          formDataToSubmit.append('smk_dir', formData.snakemakeDirectory);
        }
      }

      const endpoint = activeTab === 'CWL' ? 'http://localhost:8080/api/batch_cwl' :
                     activeTab === 'Nextflow' ? 'http://localhost:8080/api/batch_nextflow' :
                     'http://localhost:8080/api/batch_snakemake';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formDataToSubmit
      });

      if (!response.ok) {
        let errorMessage = `Failed to submit ${activeTab} batch`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use default message
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch {
        // Handle non-JSON responses
        result = { message: 'Batch submitted successfully' };
      }
      
      console.log('Batch submitted successfully:', result);
      
      // Reset form
      setFormData({
        batchMode: 'all',
        workflowFile: null,
        inputFile: null,
        configFile: null,
        parametersJson: '{}',
        snakemakeDirectory: null
      });
      
      // Clear file inputs
      if (workflowFileRef.current) workflowFileRef.current.value = '';
      if (inputFileRef.current) inputFileRef.current.value = '';
      if (configFileRef.current) configFileRef.current.value = '';
      if (snakemakeDirectoryRef.current) snakemakeDirectoryRef.current.value = '';
      
      // Refresh data
      refetch();
      
    } catch (error: any) {
      console.error('Submission error:', error);
      setError(error.message || `Failed to submit ${activeTab} batch`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewLogs = async (runId: string) => {
    setShowLogsModal(true);
    setLoadingLogs(true);
    setLogsError('');
    setCurrentLogs('');

    try {
      const response = await fetch(`http://localhost:8080/api/batch_log/${runId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const logsText = await response.text(); // Use .text() instead of .json()
      setCurrentLogs(logsText || 'No logs available');
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      setLogsError(error.message || 'Failed to fetch logs');
      setCurrentLogs('');
    } finally {
      setLoadingLogs(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <PageContainer>
        <LoadingSpinner message="Loading batch processing..." />
      </PageContainer>
    );
  }

  if (fetchError && !dashboardData) {
    return (
      <PageContainer>
        <ErrorMessage 
          title="Failed to Load Batch Processing"
          message="Unable to fetch batch processing data. Please check your connection and try again."
          onRetry={refetch}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HeaderSection>
        <h1>Batch Processing</h1>
        <p>Submit workflows to multiple TES instances or use federated execution</p>
      </HeaderSection>

      <Card>
        <CardHeader>
          <h2>
            Submit Batch Workflow
          </h2>
        </CardHeader>
        <CardContent>
          <TabContainer>
            <Tab 
              active={activeTab === 'Snakemake'} 
              onClick={() => setActiveTab('Snakemake')}
            >
              Snakemake Batch
            </Tab>
            <Tab 
              active={activeTab === 'Nextflow'} 
              onClick={() => setActiveTab('Nextflow')}
            >
              Nextflow Batch
            </Tab>
            <Tab 
              active={activeTab === 'CWL'} 
              onClick={() => setActiveTab('CWL')}
            >
              CWL Batch
            </Tab>
          </TabContainer>

          <FormContainer>
            {error && (
              <div style={{ 
                background: '#f8d7da', 
                color: '#721c24', 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '20px',
                border: '1px solid #f5c6cb',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Batch Mode</Label>
                <RadioGroup>
                  <RadioOption>
                    <input
                      type="radio"
                      name="batchMode"
                      value="all"
                      checked={formData.batchMode === 'all'}
                      onChange={handleInputChange}
                    />
                    Submit to All TES Instances
                  </RadioOption>
                  <RadioOption>
                    <input
                      type="radio"
                      name="batchMode"
                      value="gateway"
                      checked={formData.batchMode === 'gateway'}
                      onChange={handleInputChange}
                    />
                    Federated Execution via Gateway
                  </RadioOption>
                </RadioGroup>
              </FormGroup>

              <FileUploadGrid>
                <FormGroup>
                  <Label>
                    {activeTab === 'CWL' ? 'CWL Workflow File' :
                     activeTab === 'Nextflow' ? 'Nextflow Script' :
                     'Snakefile'} <RequiredMark>*</RequiredMark>
                  </Label>
                  <FileUploadArea
                    onClick={() => workflowFileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('dragover');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('dragover');
                    }}
                    onDrop={(e) => handleFileDrop(e, 'workflowFile')}
                  >
                    <FileUploadIcon>
                      <Upload size={24} />
                    </FileUploadIcon>
                    <FileUploadText>
                      {activeTab === 'CWL' ? 'Click to upload CWL workflow (.cwl, .yaml, .yml)' :
                       activeTab === 'Nextflow' ? 'Click to upload Nextflow script (.nf)' :
                       'Click to upload Snakefile'}
                    </FileUploadText>
                    <FileUploadSubtext>
                      or drag and drop your file here
                    </FileUploadSubtext>
                  </FileUploadArea>
                  <FileInput
                    ref={workflowFileRef}
                    type="file"
                    accept={activeTab === 'CWL' ? '.cwl,.yml,.yaml' : activeTab === 'Nextflow' ? '.nf' : '*'}
                    onChange={(e) => handleFileInputChange(e, 'workflowFile')}
                  />
                  {formData.workflowFile && (
                    <SelectedFile>
                      <FileText size={16} />
                      <FileName>{formData.workflowFile.name}</FileName>
                      <RemoveFileButton onClick={() => handleFileSelect('workflowFile', null)}>
                        <X size={16} />
                      </RemoveFileButton>
                    </SelectedFile>
                  )}
                </FormGroup>

                <FormGroup>
                  <Label>
                    {activeTab === 'CWL' ? 'Inputs File (Optional)' :
                     activeTab === 'Nextflow' ? 'Nextflow Config (optional)' :
                     'Snakemake Directory (optional)'}
                  </Label>
                  <FileUploadArea
                    onClick={() => {
                      if (activeTab === 'Nextflow') {
                        configFileRef.current?.click();
                      } else if (activeTab === 'Snakemake') {
                        snakemakeDirectoryRef.current?.click();
                      } else {
                        inputFileRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('dragover');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('dragover');
                    }}
                    onDrop={(e) => {
                      if (activeTab === 'Nextflow') {
                        handleFileDrop(e, 'configFile');
                      } else if (activeTab === 'Snakemake') {
                        handleFileDrop(e, 'snakemakeDirectory');
                      } else {
                        handleFileDrop(e, 'inputFile');
                      }
                    }}
                  >
                    <FileUploadIcon>
                      <Upload size={24} />
                    </FileUploadIcon>
                    <FileUploadText>
                      {activeTab === 'CWL' ? 'Click to upload inputs file (.json, .yaml, .yml)' :
                       activeTab === 'Nextflow' ? 'Click to upload config file (.config)' :
                       'Click to upload directory'}
                    </FileUploadText>
                    <FileUploadSubtext>
                      or drag and drop your file here
                    </FileUploadSubtext>
                  </FileUploadArea>
                  
                  {activeTab === 'CWL' && (
                    <>
                      <FileInput
                        ref={inputFileRef}
                        type="file"
                        accept=".json,.yml,.yaml"
                        onChange={(e) => handleFileInputChange(e, 'inputFile')}
                      />
                      {formData.inputFile && (
                        <SelectedFile>
                          <FileText size={16} />
                          <FileName>{formData.inputFile.name}</FileName>
                          <RemoveFileButton onClick={() => handleFileSelect('inputFile', null)}>
                            <X size={16} />
                          </RemoveFileButton>
                        </SelectedFile>
                      )}
                    </>
                  )}
                  
                  {activeTab === 'Nextflow' && (
                    <>
                      <FileInput
                        ref={configFileRef}
                        type="file"
                        accept=".config,.yml,.yaml"
                        onChange={(e) => handleFileInputChange(e, 'configFile')}
                      />
                      {formData.configFile && (
                        <SelectedFile>
                          <FileText size={16} />
                          <FileName>{formData.configFile.name}</FileName>
                          <RemoveFileButton onClick={() => handleFileSelect('configFile', null)}>
                            <X size={16} />
                          </RemoveFileButton>
                        </SelectedFile>
                      )}
                    </>
                  )}
                  
                  {activeTab === 'Snakemake' && (
                    <>
                      <input
                        ref={snakemakeDirectoryRef}
                        type="file"
                        accept=".zip,.tar,.tar.gz"
                        onChange={(e) => handleFileInputChange(e, 'snakemakeDirectory')}
                        style={{ display: 'none' }}
                      />
                      {formData.snakemakeDirectory && (
                        <SelectedFile>
                          <FileText size={16} />
                          <FileName>{formData.snakemakeDirectory.name}</FileName>
                          <RemoveFileButton onClick={() => handleFileSelect('snakemakeDirectory', null)}>
                            <X size={16} />
                          </RemoveFileButton>
                        </SelectedFile>
                      )}
                    </>
                  )}
                </FormGroup>
              </FileUploadGrid>

              {activeTab === 'Nextflow' && (
                <FormGroup>
                  <Label>Nextflow Parameters (JSON)</Label>
                  <TextArea
                    name="parametersJson"
                    value={formData.parametersJson}
                    onChange={handleInputChange}
                    placeholder="{}"
                  />
                </FormGroup>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                disabled={isSubmitting || !formData.workflowFile}
              >
                {isSubmitting ? `Submitting ${activeTab} Batch...` : `Submit ${activeTab} Batch`}
              </Button>
            </form>
          </FormContainer>
        </CardContent>
      </Card>

      <Card>
        <RunsHeader>
          <h2>
            <Clock size={20} />
            Batch Runs
          </h2>
          <RefreshButton onClick={refetch} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </RunsHeader>

        <RunsTable>
          <TableHeader>
            <div>Run ID</div>
            <div>Workflow Type</div>
            <div>Mode</div>
            <div>TES Instance</div>
            <div>Status</div>
            <div>Submitted</div>
            <div>Actions</div>
          </TableHeader>

          {batchRuns.length === 0 ? (
            <EmptyState>
              <Clock size={48} style={{ color: '#cbd5e0', marginBottom: '16px' }} />
              <div>No batch runs found</div>
              <div style={{ fontSize: '14px', color: '#a0aec0', marginTop: '8px' }}>
                Submit a batch workflow to see it here
              </div>
            </EmptyState>
          ) : (
            batchRuns.slice(0, displayCount).map((run) => (
              <TableRow key={run.id}>
                <TableCell style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {run.id}
                </TableCell>
                <TableCell>{run.workflowType}</TableCell>
                <TableCell>{run.mode}</TableCell>
                <TableCell>{run.tesInstance}</TableCell>
                <TableCell>
                  <StatusBadge status={run.status}>
                    {run.status}
                  </StatusBadge>
                </TableCell>
                <TableCell>{run.submitted}</TableCell>
                <TableCell>
                  <ActionButton 
                    onClick={() => handleViewLogs(run.id)}
                    title="View Logs"
                  >
                    <Eye size={14} />
                    View Logs
                  </ActionButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </RunsTable>
        
        {batchRuns.length > displayCount && (
          <LoadMoreContainer>
            <LoadMoreButton onClick={() => setDisplayCount(prev => prev + 5)}>
             
              Load More ({batchRuns.length - displayCount} remaining)
            </LoadMoreButton>
          </LoadMoreContainer>
        )}
      </Card>

      {/* Logs Modal */}
      {showLogsModal && (
        <ModalOverlay onClick={() => setShowLogsModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Batch Run Logs</h3>
              <CloseButton onClick={() => setShowLogsModal(false)}>×</CloseButton>
            </ModalHeader>
            <LogsContainer>
              {loadingLogs ? (
                'Loading logs...'
              ) : logsError ? (
                <div style={{ color: '#ff6b6b' }}>Error: {logsError}</div>
              ) : (
                currentLogs
              )}
            </LogsContainer>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default BatchProcessingPage;
