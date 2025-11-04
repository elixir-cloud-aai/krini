import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import usePolling from './hooks/usePolling';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { formatDate } from './utils/formatters';
import { POLLING_INTERVALS } from './utils/constants';
import { fetchDashboardData, submitWorkflowByType, fetchTESInstances, getWorkflowLogs } from './services/api';
import { 
  RefreshCw, 
  Upload, 
  Eye,
  FileText,
  AlertCircle,
  Clock,
  X
} from 'lucide-react';

const PageContainer = styled.div`
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
`;

const HeaderSection = styled.div`
  margin-bottom: 32px;
  
  h1 {
    color: #2d3748;
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #718096;
    margin: 0;
    font-size: 16px;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 24px 24px 0 24px;
  
  h2 {
    color: #2d3748;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #718096;
    margin: 0 0 20px 0;
    font-size: 14px;
  }
`;

const CardContent = styled.div`
  padding: 0 24px 24px 24px;
`;

const _PageHeader = styled.div`
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const _Title = styled.h1`
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #333;
  font-weight: 600;
`;

const _Subtitle = styled.p`
  margin: 0;
  color: #666;
  font-size: 16px;
`;

const _WorkflowSection = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 30px;
`;

const _SectionHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const _SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
  flex: 1;
`;

const TabContainer = styled.div`
  display: flex;
  background: #f7fafc;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 24px;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  background: ${props => props.active ? 'white' : 'transparent'};
  border: none;
  border-radius: 6px;
  color: ${props => props.active ? '#2d3748' : '#718096'};
  font-weight: ${props => props.active ? '600' : '500'};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => props.active ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'};

  &:hover {
    color: #2d3748;
    background: ${props => props.active ? 'white' : '#edf2f7'};
  }
`;

const FormContainer = styled.div`
  padding: 30px;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  color: #4a5568;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
`;

const RequiredMark = styled.span`
  color: #e53e3e;
  margin-left: 4px;
`;

const Select = styled.select`
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #2d3748;
  font-size: 14px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  }
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #2d3748;
  font-size: 14px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  }

  &::placeholder {
    color: #a0aec0;
  }
`;const FileUploadArea = styled.div`
  border: 2px dashed #cbd5e0;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f7fafc;

  &:hover, &.dragover {
    border-color: #4299e1;
    background: #ebf8ff;
  }

  &:hover .upload-icon {
    transform: translateY(-2px);
  }
`;

const FileUploadIcon = styled.div`
  color: #718096;
  margin-bottom: 12px;
  transition: all 0.2s ease;
`;

const FileUploadText = styled.div`
  color: #4a5568;
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 4px;
`;

const FileUploadSubtext = styled.div`
  color: #718096;
  font-size: 14px;
`;

const FileInput = styled.input`
  display: none;
`;

const SelectedFile = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #edf2f7;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-top: 8px;
`;

const FileName = styled.span`
  flex: 1;
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
`;

const RemoveFileButton = styled.button`
  background: none;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: #e53e3e;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'success' | 'secondary' }>`
  background: ${props => 
    props.variant === 'primary' ? '#4299e1' : 
    props.variant === 'success' ? '#48bb78' : '#718096'};
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;

  &:hover:not(:disabled) {
    background: ${props => 
      props.variant === 'primary' ? '#3182ce' : 
      props.variant === 'success' ? '#38a169' : '#4a5568'};
    transform: translateY(-1px);
    box-shadow: ${props => 
      props.variant === 'primary' ? '0 4px 12px rgba(66, 153, 225, 0.3)' : 
      props.variant === 'success' ? '0 4px 12px rgba(72, 187, 120, 0.3)' : '0 4px 12px rgba(113, 128, 150, 0.3)'};
  }

  &:disabled {
    background: #cbd5e0;
    color: #a0aec0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  margin-top: 24px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #eee;
`;

const _WorkflowRunsContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const RunsHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f7fafc;
  
  h2 {
    color: #2d3748;
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }
`;

const RefreshButton = styled.button`
  background: #4299e1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #3182ce;
  }
`;

const RunsTable = styled.div`
  overflow-x: auto;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 200px 100px 160px 120px 150px 100px 140px;
  gap: 20px;
  padding: 16px 24px;
  background: #f7fafc;
  font-weight: 600;
  color: #4a5568;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 200px 100px 160px 120px 150px 100px 140px;
  gap: 20px;
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div`
  font-size: 14px;
  color: #4a5568;
  display: flex;
  align-items: center;
  font-weight: 500;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  background-color: ${props => {
    switch (props.status.toUpperCase()) {
      case 'COMPLETE': return '#d4edda';
      case 'RUNNING': return '#cce5ff';
      case 'SUBMITTED': return '#e2e3e5';
      case 'FAILED': return '#f8d7da';
      default: return '#e2e3e5';
    }
  }};
  color: ${props => {
    switch (props.status.toUpperCase()) {
      case 'COMPLETE': return '#155724';
      case 'RUNNING': return '#004085';
      case 'SUBMITTED': return '#383d41';
      case 'FAILED': return '#721c24';
      default: return '#383d41';
    }
  }};
`;

const ActionButton = styled.button`
  background: #edf2f7;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  margin-right: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #e2e8f0;
    color: #2d3748;
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #718096;
`;

const LoadMoreContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #f7fafc;
  border-top: 1px solid #e2e8f0;
`;

const LoadMoreButton = styled.button`
  background: #4299e1;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #3182ce;
    transform: translateY(-1px);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 80vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  h3 {
    margin: 0;
    color: #333;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const LogsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  background: #1e1e1e;
  color: #f0f0f0;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 60vh;
`;

interface WorkflowRun {
  id: string;
  type: string;
  tesInstance: string;
  status: string;
  submitted: string;
  duration: string;
}

interface WorkflowFormData {
  tesInstance: string;
  distributionLogic: string;
  workflowFile: File | null;
  inputFile: File | null;
  configFile: File | null; // For Nextflow config
  parametersJson: string; // For Nextflow parameters
  snakemakeDirectory: File | null; // For Snakemake directory
}

const WorkflowsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CWL' | 'Nextflow' | 'Snakemake'>('CWL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tesInstances, setTesInstances] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [currentLogs, setCurrentLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [displayCount, setDisplayCount] = useState(5);
  const workflowFileRef = useRef<HTMLInputElement>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const _configFileRef = useRef<HTMLInputElement>(null);
  const _snakemakeDirectoryRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<WorkflowFormData>({
    tesInstance: '',
    distributionLogic: 'round-robin',
    workflowFile: null,
    inputFile: null,
    configFile: null,
    parametersJson: '{}',
    snakemakeDirectory: null
  });

  const { data: dashboardData, loading, error: fetchError, refetch } = usePolling(
    fetchDashboardData,
    POLLING_INTERVALS.DASHBOARD
  );

  // Load TES instances on component mount
  useEffect(() => {
    const loadTESInstances = async () => {
      try {
        const instances = await fetchTESInstances();
        setTesInstances(instances);
      } catch (error) {
        console.error('Failed to load TES instances:', error);
      }
    };
    loadTESInstances();
  }, []);

  // Mock workflow runs data - replace with actual data from dashboard
  const workflowRuns: WorkflowRun[] = dashboardData?.workflow_runs?.map((run: any) => ({
    id: run.run_id || run.id || 'unknown',
    type: run.workflow_type?.toUpperCase() || run.type || 'Unknown',
    tesInstance: run.tes_instance_name || run.tes_name || run.tes_instance || 'Unknown',
    status: run.status || run.state || 'SUBMITTED',
    submitted: formatDate(run.submitted_at || run.creation_time || run.submitted),
    duration: run.duration || '-'
  })) || [
    {
      id: '96b6917a-5e21-43bf-a820-c2c4b50cbc5d',
      type: 'Unknown',
      tesInstance: 'Unknown',
      status: 'SUBMITTED',
      submitted: '2025-08-03 17:22:39',
      duration: '-'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (type: 'workflow' | 'input' | 'config' | 'snakemakeDirectory', file: File | null) => {
    if (type === 'workflow') {
      setFormData(prev => ({ ...prev, workflowFile: file }));
    } else if (type === 'input') {
      setFormData(prev => ({ ...prev, inputFile: file }));
    } else if (type === 'config') {
      setFormData(prev => ({ ...prev, configFile: file }));
    } else if (type === 'snakemakeDirectory') {
      setFormData(prev => ({ ...prev, snakemakeDirectory: file }));
    }
  };

  const handleFileDrop = (e: React.DragEvent, type: 'workflow' | 'input' | 'config' | 'snakemakeDirectory') => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(type, files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'workflow' | 'input' | 'config' | 'snakemakeDirectory') => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(type, file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('tes_instances', JSON.stringify([formData.tesInstance]));
      submitData.append('distribution_logic', formData.distributionLogic);
      submitData.append('batch_mode', 'all'); // Valid batch mode: 'all' or 'gateway'
      
      if (formData.workflowFile) {
        // Use backend-expected field names
        const fileFieldName = activeTab === 'CWL' ? 'cwl_file' : 
                             activeTab === 'Nextflow' ? 'nextflow_file' : 'snakefile';
        submitData.append(fileFieldName, formData.workflowFile);
      }
      
      if (formData.inputFile) {
        // Use backend-expected field names for input files
        const inputFieldName = activeTab === 'CWL' ? 'inputs_file' : 
                              activeTab === 'Nextflow' ? 'nextflow_config' : 'smk_dir';
        submitData.append(inputFieldName, formData.inputFile);
      }

      // Submit workflow using the correct API function
      const result = await submitWorkflowByType(activeTab.toLowerCase() as 'cwl' | 'nextflow' | 'snakemake', submitData);
      
      console.log('Workflow submitted successfully:', result);

      // Reset form
      setFormData({
        tesInstance: '',
        distributionLogic: 'round-robin',
        workflowFile: null,
        inputFile: null,
        configFile: null,
        parametersJson: '{}',
        snakemakeDirectory: null
      });

      // Refresh workflow runs
      refetch();

    } catch (error) {
      console.error('Workflow submission failed:', error);
      let errorMessage = 'Failed to submit workflow. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.response?.data?.error) {
          errorMessage = errorObj.response.data.error;
        } else if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewLogs = async (workflowId: string) => {
    setShowLogsModal(true);
    setLoadingLogs(true);
    setLogsError('');
    setCurrentLogs('');

    try {
      const logs = await getWorkflowLogs(workflowId);
      setCurrentLogs(logs || 'No logs available');
    } catch (error: any) {
      setLogsError(error?.response?.data?.error || error.message || 'Failed to fetch logs');
      setCurrentLogs('');
    } finally {
      setLoadingLogs(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <PageContainer>
        <LoadingSpinner message="Loading workflows..." />
      </PageContainer>
    );
  }

  if (fetchError && !dashboardData) {
    return (
      <PageContainer>
        <ErrorMessage 
          title="Failed to Load Workflows"
          message="Unable to fetch workflow data. Please check your connection and try again."
          onRetry={refetch}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HeaderSection>
        <h1>Workflow Management</h1>
        <p>Submit and manage CWL, Nextflow, and Snakemake workflows</p>
      </HeaderSection>

      <ContentGrid>
        <Card>
          <CardHeader>
            <h2>Submit Workflow</h2>
            <p>Choose a workflow type and upload your files</p>
          </CardHeader>
          <CardContent>

        <TabContainer>
          <Tab 
            active={activeTab === 'CWL'} 
            onClick={() => setActiveTab('CWL')}
          >
            CWL
          </Tab>
          <Tab 
            active={activeTab === 'Nextflow'} 
            onClick={() => setActiveTab('Nextflow')}
          >
            Nextflow
          </Tab>
          <Tab 
            active={activeTab === 'Snakemake'} 
            onClick={() => setActiveTab('Snakemake')}
          >
            Snakemake
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
            <FormGrid>
              <FormGroup>
                <Label>
                  TES Instance <RequiredMark>*</RequiredMark>
                </Label>
                <Select
                  name="tesInstance"
                  value={formData.tesInstance}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select TES Instance</option>
                  {tesInstances.map((instance: any) => (
                    <option key={instance.url} value={instance.url}>
                      {instance.name} ({instance.url})
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Distribution Logic</Label>
                <Input
                  name="distributionLogic"
                  value={formData.distributionLogic}
                  onChange={handleInputChange}
                  placeholder="e.g. round-robin"
                />
              </FormGroup>
            </FormGrid>

            <FormGrid>
              <FormGroup>
                <Label>
                  {activeTab} Workflow File <RequiredMark>*</RequiredMark>
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
                  onDrop={(e) => handleFileDrop(e, 'workflow')}
                >
                  <FileUploadIcon>
                    <Upload size={24} />
                  </FileUploadIcon>
                  <FileUploadText>
                    {activeTab === 'CWL' ? 'Click to upload CWL file (.cwl, .yml, .yaml)' :
                     activeTab === 'Nextflow' ? 'Click to upload Nextflow script (.nf)' :
                     'Click to upload Snakefile (any file type)'}
                  </FileUploadText>
                  <FileUploadSubtext>
                    or drag and drop your workflow file here
                  </FileUploadSubtext>
                </FileUploadArea>
                <FileInput
                  ref={workflowFileRef}
                  type="file"
                  accept={activeTab === 'CWL' ? '.cwl,.yml,.yaml' : activeTab === 'Nextflow' ? '.nf,.yml,.yaml' : '*'}
                  onChange={(e) => handleFileInputChange(e, 'workflow')}
                />
                {formData.workflowFile && (
                  <SelectedFile>
                    <FileText size={16} />
                    <FileName>{formData.workflowFile.name}</FileName>
                    <RemoveFileButton onClick={() => handleFileSelect('workflow', null)}>
                      <X size={16} />
                    </RemoveFileButton>
                  </SelectedFile>
                )}
              </FormGroup>

              <FormGroup>
                <Label>
                  {activeTab === 'CWL' ? 'CWL Inputs File' :
                   activeTab === 'Nextflow' ? 'Nextflow Inputs File' :
                   'Snakemake Directory (optional)'} {activeTab !== 'Snakemake' && <RequiredMark>*</RequiredMark>}
                </Label>
                <FileUploadArea
                  onClick={() => inputFileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('dragover');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                  }}
                  onDrop={(e) => handleFileDrop(e, 'input')}
                >
                  <FileUploadIcon>
                    <Upload size={24} />
                  </FileUploadIcon>
                  <FileUploadText>
                    {activeTab === 'CWL' ? 'Click to upload CWL inputs file (.yml, .yaml, .json)' :
                     activeTab === 'Nextflow' ? 'Click to upload Nextflow params file (.yml, .yaml, .json)' :
                     'Click to upload Snakemake directory (optional)'}
                  </FileUploadText>
                  <FileUploadSubtext>
                    or drag and drop your input file here
                  </FileUploadSubtext>
                </FileUploadArea>
                <FileInput
                  ref={inputFileRef}
                  type="file"
                  accept={activeTab === 'Snakemake' ? '.zip,.tar,.tar.gz,.yml,.yaml,.json' : '.yml,.yaml,.json'}
                  onChange={(e) => handleFileInputChange(e, 'input')}
                />
                {formData.inputFile && (
                  <SelectedFile>
                    <FileText size={16} />
                    <FileName>{formData.inputFile.name}</FileName>
                    <RemoveFileButton onClick={() => handleFileSelect('input', null)}>
                      <X size={16} />
                    </RemoveFileButton>
                  </SelectedFile>
                )}
              </FormGroup>
            </FormGrid>

            <ButtonGroup>
              <Button type="submit" variant="primary" disabled={isSubmitting || !formData.tesInstance || !formData.workflowFile || !formData.inputFile}>
                
                {isSubmitting ? `Submitting ${activeTab} Workflow...` : `Submit ${activeTab} Workflow`}
              </Button>
            </ButtonGroup>
          </form>
        </FormContainer>
        </CardContent>
        </Card>

        <Card>
          <RunsHeader>
            <h2>Workflow Runs</h2>
            <RefreshButton onClick={refetch} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </RefreshButton>
          </RunsHeader>

          <RunsTable>
          <TableHeader>
            <div>ID</div>
            <div>Type</div>
            <div>TES Instance</div>
            <div>Status</div>
            <div>Submitted</div>
            <div>Duration</div>
            <div>Logs</div>
          </TableHeader>

          {workflowRuns.length === 0 ? (
            <EmptyState>
              <Clock size={48} style={{ color: '#cbd5e0', marginBottom: '16px' }} />
              <div>No workflow runs found</div>
              <div style={{ fontSize: '14px', color: '#a0aec0', marginTop: '8px' }}>
                Submit a workflow to see it here
              </div>
            </EmptyState>
          ) : (
            workflowRuns.slice(0, displayCount).map((run) => (
              <TableRow key={run.id}>
                <TableCell style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {run.id}
                </TableCell>
                <TableCell>{run.type}</TableCell>
                <TableCell>{run.tesInstance}</TableCell>
                <TableCell>
                  <StatusBadge status={run.status}>
                    {run.status}
                  </StatusBadge>
                </TableCell>
                <TableCell>{run.submitted}</TableCell>
                <TableCell>{run.duration}</TableCell>
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
        
        {workflowRuns.length > displayCount && (
          <LoadMoreContainer>
            <LoadMoreButton onClick={() => setDisplayCount(prev => prev + 5)}>
              
              Load More ({workflowRuns.length - displayCount} remaining)
            </LoadMoreButton>
          </LoadMoreContainer>
        )}
      </Card>
      
      </ContentGrid>

      {/* Logs Modal */}
      {showLogsModal && (
        <ModalOverlay onClick={() => setShowLogsModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Workflow Logs</h3>
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

export default WorkflowsPage;
