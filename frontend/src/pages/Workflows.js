import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Upload, Play, Clock, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { workflowService } from '../services/workflowService';
import { formatDateTime, formatDuration } from '../utils/formatters';
import { TES_INSTANCES } from '../utils/constants';

const WorkflowsContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

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

const WorkflowSection = styled.div`
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

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
`;

const Tab = styled.button`
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: ${props => props.$active ? '#2563eb' : '#6b7280'};
  border-bottom: 2px solid ${props => props.$active ? '#2563eb' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    color: #2563eb;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #374151;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const FileUpload = styled.div`
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #2563eb;
    background: #f8fafc;
  }

  input {
    display: none;
  }
`;

const SubmitButton = styled.button`
  background: #2563eb;
  color: white;
  padding: 0.75rem 2rem;
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

const WorkflowRunsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;

  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  tr:hover {
    background: #f9fafb;
  }
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  ${props => {
    switch (props.status?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return `
          background: #dcfce7;
          color: #166534;
        `;
      case 'running':
        return `
          background: #dbeafe;
          color: #1d4ed8;
        `;
      case 'failed':
      case 'error':
        return `
          background: #fee2e2;
          color: #dc2626;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

const LogButton = styled.button`
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #111827;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LogModal = styled.div`
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

const LogContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  max-height: 600px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
`;

const LogTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #222b45;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  
  &:hover {
    color: #374151;
  }
`;

const LogTextArea = styled.pre`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'complete':
    case 'completed':
      return <CheckCircle size={14} />;
    case 'running':
      return <Clock size={14} />;
    case 'failed':
    case 'error':
      return <XCircle size={14} />;
    default:
      return <AlertCircle size={14} />;
  }
};

const Workflows = () => {
  const [activeTab, setActiveTab] = useState('cwl');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);
  
  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentLog, setCurrentLog] = useState('');
  const [currentLogRunId, setCurrentLogRunId] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  // Refs for file inputs
  const cwlFileRef = useRef(null);
  const cwlInputRef = useRef(null);
  const nextflowFileRef = useRef(null);
  const nextflowConfigRef = useRef(null);
  const snakefileRef = useRef(null);
  const smkDirRef = useRef(null);

  // Form states for different workflow types
  const [cwlForm, setCwlForm] = useState({
    tesInstance: '',
    cwlFile: null,
    cwlInput: null,
    distributionLogic: ''
  });

  const [nextflowForm, setNextflowForm] = useState({
    tesInstance: '',
    nextflowFile: null,
    nextflowConfig: null,
    nextflowParams: '{}',
    distributionLogic: ''
  });

  const [snakemakeForm, setSnakemakeForm] = useState({
    tesInstance: '',
    snakefile: null,
    smkDir: null,
    distributionLogic: ''
  });

  // Load workflow runs
  useEffect(() => {
    loadWorkflowRuns();
  }, []);

  const loadWorkflowRuns = async () => {
    try {
      setRunsLoading(true);
      const runs = await workflowService.getWorkflowRuns();
      setWorkflowRuns(runs);
    } catch (err) {
      console.error('Error loading workflow runs:', err);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleViewLogs = async (runId) => {
    try {
      setLogLoading(true);
      setCurrentLogRunId(runId);
      setShowLogModal(true);
      
      const logs = await workflowService.getWorkflowLogs(runId);
      setCurrentLog(logs);
    } catch (err) {
      console.error('Error loading logs:', err);
      setCurrentLog(`Error loading logs: ${err.message}`);
    } finally {
      setLogLoading(false);
    }
  };

  const closeLogModal = () => {
    setShowLogModal(false);
    setCurrentLog('');
    setCurrentLogRunId('');
  };

  const handleCwlSubmit = async (e) => {
    e.preventDefault();
    if (!cwlForm.tesInstance || !cwlForm.cwlFile || !cwlForm.cwlInput) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Prepare form data for backend
      const workflowData = {
        workflow_type: 'cwl',
        batch_mode: cwlForm.tesInstance === 'TES Gateway' ? 'gateway' : 'all',
        wf_distribution_logic: cwlForm.distributionLogic || '',
        cwl_file: cwlForm.cwlFile,
        cwl_input: cwlForm.cwlInput
      };
      
      await workflowService.submitWorkflow(workflowData);
      setCwlForm({
        tesInstance: '',
        cwlFile: null,
        cwlInput: null,
        distributionLogic: ''
      });
      loadWorkflowRuns();
      alert('CWL workflow submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit CWL workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleNextflowSubmit = async (e) => {
    e.preventDefault();
    if (!nextflowForm.tesInstance || !nextflowForm.nextflowFile) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Prepare form data for backend
      const workflowData = {
        workflow_type: 'nextflow',
        batch_mode: nextflowForm.tesInstance === 'TES Gateway' ? 'gateway' : 'all',
        wf_distribution_logic: nextflowForm.distributionLogic || '',
        nextflow_file: nextflowForm.nextflowFile,
        nextflow_config: nextflowForm.nextflowConfig,
        nextflow_params: nextflowForm.nextflowParams || '{}'
      };
      
      await workflowService.submitWorkflow(workflowData);
      setNextflowForm({
        tesInstance: '',
        nextflowFile: null,
        nextflowConfig: null,
        nextflowParams: '{}',
        distributionLogic: ''
      });
      loadWorkflowRuns();
      alert('Nextflow workflow submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit Nextflow workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleSnakemakeSubmit = async (e) => {
    e.preventDefault();
    if (!snakemakeForm.tesInstance || !snakemakeForm.snakefile) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Prepare form data for backend
      const workflowData = {
        workflow_type: 'snakemake',
        batch_mode: snakemakeForm.tesInstance === 'TES Gateway' ? 'gateway' : 'all',
        wf_distribution_logic: snakemakeForm.distributionLogic || '',
        snakefile: snakemakeForm.snakefile,
        smk_dir: snakemakeForm.smkDir
      };
      
      await workflowService.submitWorkflow(workflowData);
      setSnakemakeForm({
        tesInstance: '',
        snakefile: null,
        smkDir: null,
        distributionLogic: ''
      });
      loadWorkflowRuns();
      alert('Snakemake workflow submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit Snakemake workflow');
    } finally {
      setLoading(false);
    }
  };

  const renderCWLForm = () => (
    <form onSubmit={handleCwlSubmit}>
      <FormRow>
        <FormGroup>
          <Label>TES Instance *</Label>
          <Select
            value={cwlForm.tesInstance}
            onChange={(e) => setCwlForm({ ...cwlForm, tesInstance: e.target.value })}
            required
          >
            <option value="">Select TES Instance</option>
            {TES_INSTANCES.map((instance, idx) => (
              <option key={idx} value={instance.url}>
                {instance.name} ({instance.url})
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <Label>Distribution Logic</Label>
          <Input
            type="text"
            value={cwlForm.distributionLogic}
            onChange={(e) => setCwlForm({ ...cwlForm, distributionLogic: e.target.value })}
            placeholder="e.g., round-robin, random"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>CWL Workflow File *</Label>
          <FileUpload onClick={() => cwlFileRef.current?.click()}>
            <input
              ref={cwlFileRef}
              type="file"
              accept=".cwl,.yml,.yaml"
              onChange={(e) => setCwlForm({ ...cwlForm, cwlFile: e.target.files[0] })}
              required
            />
            <Upload size={24} color="#6b7280" />
            <p>{cwlForm.cwlFile ? cwlForm.cwlFile.name : 'Click to upload CWL file (.cwl, .yml, .yaml)'}</p>
          </FileUpload>
        </FormGroup>
        <FormGroup>
          <Label>CWL Input File *</Label>
          <FileUpload onClick={() => cwlInputRef.current?.click()}>
            <input
              ref={cwlInputRef}
              type="file"
              accept=".yml,.yaml,.json"
              onChange={(e) => setCwlForm({ ...cwlForm, cwlInput: e.target.files[0] })}
              required
            />
            <Upload size={24} color="#6b7280" />
            <p>{cwlForm.cwlInput ? cwlForm.cwlInput.name : 'Click to upload input file (.yml, .yaml, .json)'}</p>
          </FileUpload>
        </FormGroup>
      </FormRow>

      <SubmitButton type="submit" disabled={loading}>
        {loading ? <LoadingSpinner size={16} /> : <Play size={16} />}
        Submit CWL Workflow
      </SubmitButton>
    </form>
  );

  const renderNextflowForm = () => (
    <form onSubmit={handleNextflowSubmit}>
      <FormRow>
        <FormGroup>
          <Label>TES Instance *</Label>
          <Select
            value={nextflowForm.tesInstance}
            onChange={(e) => setNextflowForm({ ...nextflowForm, tesInstance: e.target.value })}
            required
          >
            <option value="">Select TES Instance</option>
            {TES_INSTANCES.map((instance, idx) => (
              <option key={idx} value={instance.url}>
                {instance.name} ({instance.url})
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <Label>Distribution Logic</Label>
          <Input
            type="text"
            value={nextflowForm.distributionLogic}
            onChange={(e) => setNextflowForm({ ...nextflowForm, distributionLogic: e.target.value })}
            placeholder="e.g., round-robin, random"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>Nextflow Script *</Label>
          <FileUpload onClick={() => nextflowFileRef.current?.click()}>
            <input
              ref={nextflowFileRef}
              type="file"
              accept=".nf"
              onChange={(e) => setNextflowForm({ ...nextflowForm, nextflowFile: e.target.files[0] })}
              required
            />
            <Upload size={24} color="#6b7280" />
            <p>{nextflowForm.nextflowFile ? nextflowForm.nextflowFile.name : 'Click to upload Nextflow script (.nf)'}</p>
          </FileUpload>
        </FormGroup>
        <FormGroup>
          <Label>Nextflow Config (optional)</Label>
          <FileUpload onClick={() => nextflowConfigRef.current?.click()}>
            <input
              ref={nextflowConfigRef}
              type="file"
              accept=".config"
              onChange={(e) => setNextflowForm({ ...nextflowForm, nextflowConfig: e.target.files[0] })}
            />
            <Upload size={24} color="#6b7280" />
            <p>{nextflowForm.nextflowConfig ? nextflowForm.nextflowConfig.name : 'Click to upload config file (.config)'}</p>
          </FileUpload>
        </FormGroup>
      </FormRow>

      <FormGroup>
        <Label>Nextflow Parameters (JSON)</Label>
        <TextArea
          value={nextflowForm.nextflowParams}
          onChange={(e) => setNextflowForm({ ...nextflowForm, nextflowParams: e.target.value })}
          placeholder='{"param1": "value1", "param2": "value2"}'
        />
      </FormGroup>

      <SubmitButton type="submit" disabled={loading}>
        {loading ? <LoadingSpinner size={16} /> : <Play size={16} />}
        Submit Nextflow Workflow
      </SubmitButton>
    </form>
  );

  const renderSnakemakeForm = () => (
    <form onSubmit={handleSnakemakeSubmit}>
      <FormRow>
        <FormGroup>
          <Label>TES Instance *</Label>
          <Select
            value={snakemakeForm.tesInstance}
            onChange={(e) => setSnakemakeForm({ ...snakemakeForm, tesInstance: e.target.value })}
            required
          >
            <option value="">Select TES Instance</option>
            {TES_INSTANCES.map((instance, idx) => (
              <option key={idx} value={instance.url}>
                {instance.name} ({instance.url})
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <Label>Distribution Logic</Label>
          <Input
            type="text"
            value={snakemakeForm.distributionLogic}
            onChange={(e) => setSnakemakeForm({ ...snakemakeForm, distributionLogic: e.target.value })}
            placeholder="e.g., round-robin, random"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>Snakefile *</Label>
          <FileUpload onClick={() => snakefileRef.current?.click()}>
            <input
              ref={snakefileRef}
              type="file"
              onChange={(e) => setSnakemakeForm({ ...snakemakeForm, snakefile: e.target.files[0] })}
              required
            />
            <Upload size={24} color="#6b7280" />
            <p>{snakemakeForm.snakefile ? snakemakeForm.snakefile.name : 'Click to upload Snakefile'}</p>
          </FileUpload>
        </FormGroup>
        <FormGroup>
          <Label>Snakemake Directory (optional)</Label>
          <FileUpload onClick={() => smkDirRef.current?.click()}>
            <input
              ref={smkDirRef}
              type="file"
              webkitdirectory=""
              onChange={(e) => setSnakemakeForm({ ...snakemakeForm, smkDir: e.target.files[0] })}
            />
            <Upload size={24} color="#6b7280" />
            <p>{snakemakeForm.smkDir ? snakemakeForm.smkDir.name : 'Click to upload directory'}</p>
          </FileUpload>
        </FormGroup>
      </FormRow>

      <SubmitButton type="submit" disabled={loading}>
        {loading ? <LoadingSpinner size={16} /> : <Play size={16} />}
        Submit Snakemake Workflow
      </SubmitButton>
    </form>
  );

  return (
    <WorkflowsContainer>
      <Header>
        <Title>Workflow Management</Title>
        <Subtitle>Submit and manage CWL, Nextflow, and Snakemake workflows</Subtitle>
      </Header>

      {error && <ErrorMessage message={error} />}

      <WorkflowSection>
        <SectionTitle>
          <Play size={20} />
          Submit Workflow
        </SectionTitle>

        <TabContainer>
          <Tab $active={activeTab === 'cwl'} onClick={() => setActiveTab('cwl')}>
            CWL
          </Tab>
          <Tab $active={activeTab === 'nextflow'} onClick={() => setActiveTab('nextflow')}>
            Nextflow
          </Tab>
          <Tab $active={activeTab === 'snakemake'} onClick={() => setActiveTab('snakemake')}>
            Snakemake
          </Tab>
        </TabContainer>

        {activeTab === 'cwl' && renderCWLForm()}
        {activeTab === 'nextflow' && renderNextflowForm()}
        {activeTab === 'snakemake' && renderSnakemakeForm()}
      </WorkflowSection>

      <WorkflowSection>
        <SectionTitle>
          <Clock size={20} />
          Workflow Runs
        </SectionTitle>

        {runsLoading ? (
          <LoadingSpinner />
        ) : workflowRuns.length === 0 ? (
          <p>No workflow runs found</p>
        ) : (
          <WorkflowRunsTable>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>TES Instance</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Duration</th>
                <th>Logs</th>
              </tr>
            </thead>
            <tbody>
              {workflowRuns.map((run, index) => (
                <tr key={index}>
                  <td>{run.run_id || `run-${index}`}</td>
                  <td>{run.type || 'Unknown'}</td>
                  <td>{run.tes_name || 'Unknown'}</td>
                  <td>
                    <StatusBadge status={run.status}>
                      {getStatusIcon(run.status)}
                      {run.status || 'Unknown'}
                    </StatusBadge>
                  </td>
                  <td>{run.submitted_at ? formatDateTime(run.submitted_at) : 'Unknown'}</td>
                  <td>{run.started_at && run.completed_at ? formatDuration(run.started_at, run.completed_at) : '-'}</td>
                  <td>
                    <LogButton
                      onClick={() => handleViewLogs(run.run_id)}
                      disabled={!run.run_id}
                    >
                      <FileText size={14} />
                      View Logs
                    </LogButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </WorkflowRunsTable>
        )}
      </WorkflowSection>

      {/* Log Modal */}
      {showLogModal && (
        <LogModal onClick={closeLogModal}>
          <LogContent onClick={(e) => e.stopPropagation()}>
            <LogHeader>
              <LogTitle>Workflow Logs - {currentLogRunId}</LogTitle>
              <CloseButton onClick={closeLogModal}>×</CloseButton>
            </LogHeader>
            <LogTextArea>
              {logLoading ? 'Loading logs...' : currentLog || 'No logs available'}
            </LogTextArea>
          </LogContent>
        </LogModal>
      )}
    </WorkflowsContainer>
  );
};

export default Workflows;
