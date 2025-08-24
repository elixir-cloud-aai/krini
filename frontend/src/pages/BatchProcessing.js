import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Layers, Upload, Play, Clock, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { batchService } from '../services/batchService';
import { formatDateTime, formatDuration } from '../utils/formatters';
import { TES_INSTANCES } from '../utils/constants';

const BatchContainer = styled.div`
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

const BatchSection = styled.div`
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

const BatchRunsTable = styled.table`
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
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
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

const BatchModeRadio = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  input {
    margin: 0;
  }
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

const BatchProcessing = () => {
  const [activeTab, setActiveTab] = useState('snakemake');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [batchRuns, setBatchRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);

  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentLog, setCurrentLog] = useState('');
  const [currentLogRunId, setCurrentLogRunId] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  // Refs for file inputs
  const snakefileRef = useRef(null);
  const smkDirRef = useRef(null);
  const nextflowFileRef = useRef(null);
  const nextflowConfigRef = useRef(null);
  const cwlFileRef = useRef(null);
  const cwlInputsRef = useRef(null);

  // Form states
  const [snakemakeForm, setSnakemakeForm] = useState({
    batchMode: 'all',
    snakefile: null,
    smkDir: null
  });

  const [nextflowForm, setNextflowForm] = useState({
    batchMode: 'all',
    nextflowFile: null,
    nextflowConfig: null,
    nextflowParams: '{}'
  });

  const [cwlForm, setCwlForm] = useState({
    batchMode: 'all',
    cwlFile: null,
    inputsFile: null
  });

  // Load batch runs
  useEffect(() => {
    loadBatchRuns();
  }, []);

  const loadBatchRuns = async () => {
    try {
      setRunsLoading(true);
      const runs = await batchService.getBatchRuns();
      setBatchRuns(runs);
    } catch (err) {
      console.error('Error loading batch runs:', err);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleViewLogs = async (runId) => {
    try {
      setLogLoading(true);
      setCurrentLogRunId(runId);
      setShowLogModal(true);
      
      const logs = await batchService.getBatchLog(runId);
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

  const handleSnakemakeSubmit = async (e) => {
    e.preventDefault();
    if (!snakemakeForm.snakefile) {
      setError('Please select a Snakefile');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await batchService.submitSnakemakeBatch(snakemakeForm);
      setSnakemakeForm({
        batchMode: 'all',
        snakefile: null,
        smkDir: null
      });
      loadBatchRuns();
      alert('Snakemake batch submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit Snakemake batch');
    } finally {
      setLoading(false);
    }
  };

  const handleNextflowSubmit = async (e) => {
    e.preventDefault();
    if (!nextflowForm.nextflowFile) {
      setError('Please select a Nextflow script');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await batchService.submitNextflowBatch(nextflowForm);
      setNextflowForm({
        batchMode: 'all',
        nextflowFile: null,
        nextflowConfig: null,
        nextflowParams: '{}'
      });
      loadBatchRuns();
      alert('Nextflow batch submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit Nextflow batch');
    } finally {
      setLoading(false);
    }
  };

  const handleCwlSubmit = async (e) => {
    e.preventDefault();
    if (!cwlForm.cwlFile) {
      setError('Please select a CWL workflow file');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await batchService.submitCwlBatch(cwlForm);
      setCwlForm({
        batchMode: 'all',
        cwlFile: null,
        inputsFile: null
      });
      loadBatchRuns();
      alert('CWL batch submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit CWL batch');
    } finally {
      setLoading(false);
    }
  };

  const renderSnakemakeForm = () => (
    <form onSubmit={handleSnakemakeSubmit}>
      <FormGroup>
        <Label>Batch Mode</Label>
        <BatchModeRadio>
          <RadioOption>
            <input
              type="radio"
              value="all"
              checked={snakemakeForm.batchMode === 'all'}
              onChange={(e) => setSnakemakeForm({ ...snakemakeForm, batchMode: e.target.value })}
            />
            All TES Instances
          </RadioOption>
          <RadioOption>
            <input
              type="radio"
              value="gateway"
              checked={snakemakeForm.batchMode === 'gateway'}
              onChange={(e) => setSnakemakeForm({ ...snakemakeForm, batchMode: e.target.value })}
            />
            TES Gateway (Federated)
          </RadioOption>
        </BatchModeRadio>
      </FormGroup>

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
        {loading ? <LoadingSpinner size={16} /> : <Layers size={16} />}
        Submit Snakemake Batch
      </SubmitButton>
    </form>
  );

  const renderNextflowForm = () => (
    <form onSubmit={handleNextflowSubmit}>
      <FormGroup>
        <Label>Batch Mode</Label>
        <BatchModeRadio>
          <RadioOption>
            <input
              type="radio"
              value="all"
              checked={nextflowForm.batchMode === 'all'}
              onChange={(e) => setNextflowForm({ ...nextflowForm, batchMode: e.target.value })}
            />
            All TES Instances
          </RadioOption>
          <RadioOption>
            <input
              type="radio"
              value="gateway"
              checked={nextflowForm.batchMode === 'gateway'}
              onChange={(e) => setNextflowForm({ ...nextflowForm, batchMode: e.target.value })}
            />
            TES Gateway (Federated)
          </RadioOption>
        </BatchModeRadio>
      </FormGroup>

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
        {loading ? <LoadingSpinner size={16} /> : <Layers size={16} />}
        Submit Nextflow Batch
      </SubmitButton>
    </form>
  );

  const renderCwlForm = () => (
    <form onSubmit={handleCwlSubmit}>
      <FormGroup>
        <Label>Batch Mode</Label>
        <BatchModeRadio>
          <RadioOption>
            <input
              type="radio"
              value="all"
              checked={cwlForm.batchMode === 'all'}
              onChange={(e) => setCwlForm({ ...cwlForm, batchMode: e.target.value })}
            />
            <span>Submit to All TES Instances</span>
          </RadioOption>
          <RadioOption>
            <input
              type="radio"
              value="gateway"
              checked={cwlForm.batchMode === 'gateway'}
              onChange={(e) => setCwlForm({ ...cwlForm, batchMode: e.target.value })}
            />
            <span>Federated Execution via Gateway</span>
          </RadioOption>
        </BatchModeRadio>
      </FormGroup>

      <FormGroup>
        <Label>CWL Workflow File</Label>
        <FileUpload onClick={() => cwlFileRef.current?.click()}>
          <input
            ref={cwlFileRef}
            type="file"
            accept=".cwl,.yaml,.yml"
            style={{ display: 'none' }}
            onChange={(e) => setCwlForm({ ...cwlForm, cwlFile: e.target.files[0] })}
          />
          <Upload size={20} />
          <p>{cwlForm.cwlFile ? cwlForm.cwlFile.name : 'Click to upload CWL workflow (.cwl, .yaml, .yml)'}</p>
        </FileUpload>
      </FormGroup>

      <FormGroup>
        <Label>Inputs File (Optional)</Label>
        <FileUpload onClick={() => cwlInputsRef.current?.click()}>
          <input
            ref={cwlInputsRef}
            type="file"
            accept=".json,.yaml,.yml"
            style={{ display: 'none' }}
            onChange={(e) => setCwlForm({ ...cwlForm, inputsFile: e.target.files[0] })}
          />
          <Upload size={20} />
          <p>{cwlForm.inputsFile ? cwlForm.inputsFile.name : 'Click to upload inputs file (.json, .yaml, .yml)'}</p>
        </FileUpload>
      </FormGroup>

      <SubmitButton type="submit" disabled={loading}>
        {loading ? <LoadingSpinner size={16} /> : <Layers size={16} />}
        Submit CWL Batch
      </SubmitButton>
    </form>
  );

  return (
    <BatchContainer>
      <Header>
        <Title>Batch Processing</Title>
        <Subtitle>Submit workflows to multiple TES instances or use federated execution</Subtitle>
      </Header>

      {error && <ErrorMessage message={error} />}

      <BatchSection>
        <SectionTitle>
          <Layers size={20} />
          Submit Batch Workflow
        </SectionTitle>

        <TabContainer>
          <Tab $active={activeTab === 'snakemake'} onClick={() => setActiveTab('snakemake')}>
            Snakemake Batch
          </Tab>
          <Tab $active={activeTab === 'nextflow'} onClick={() => setActiveTab('nextflow')}>
            Nextflow Batch
          </Tab>
          <Tab $active={activeTab === 'cwl'} onClick={() => setActiveTab('cwl')}>
            CWL Batch
          </Tab>
        </TabContainer>

        {activeTab === 'snakemake' && renderSnakemakeForm()}
        {activeTab === 'nextflow' && renderNextflowForm()}
        {activeTab === 'cwl' && renderCwlForm()}
      </BatchSection>

      <BatchSection>
        <SectionTitle>
          <Clock size={20} />
          Batch Runs
        </SectionTitle>

        {runsLoading ? (
          <LoadingSpinner />
        ) : batchRuns.length === 0 ? (
          <p>No batch runs found</p>
        ) : (
          <BatchRunsTable>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Workflow Type</th>
                <th>Mode</th>
                <th>TES Instance</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batchRuns.map((run, index) => (
                <tr key={run.run_id || index}>
                  <td>{run.run_id}</td>
                  <td>{run.workflow_type}</td>
                  <td>{run.mode}</td>
                  <td>{run.tes_name}</td>
                  <td>
                    <StatusBadge status={run.status}>
                      {getStatusIcon(run.status)}
                      {run.status}
                    </StatusBadge>
                  </td>
                  <td>{run.submitted_at ? formatDateTime(run.submitted_at) : 'Unknown'}</td>
                  <td>
                    <LogButton onClick={() => handleViewLogs(run.run_id)}>
                      <FileText size={14} />
                      View Logs
                    </LogButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </BatchRunsTable>
        )}
      </BatchSection>

      {/* Log Modal */}
      {showLogModal && (
        <LogModal onClick={closeLogModal}>
          <LogContent onClick={(e) => e.stopPropagation()}>
            <LogHeader>
              <LogTitle>Batch Logs - {currentLogRunId}</LogTitle>
              <CloseButton onClick={closeLogModal}>×</CloseButton>
            </LogHeader>
            <LogTextArea>
              {logLoading ? 'Loading logs...' : currentLog || 'No logs available'}
            </LogTextArea>
          </LogContent>
        </LogModal>
      )}
    </BatchContainer>
  );
};

export default BatchProcessing;
