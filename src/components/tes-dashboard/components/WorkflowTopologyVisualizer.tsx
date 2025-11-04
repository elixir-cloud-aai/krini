/**
 * Real-Time Workflow Topology Visualizer
 * Shows live workflow execution with compute flow and step-by-step progression
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Play, Pause, Clock, Cpu, HardDrive, Activity, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import WorkflowTopologyService, { WorkflowInstance, WorkflowStep, ComputeFlow } from '../services/workflowTopologyService';

const WorkflowContainer = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const WorkflowHeader = styled.div`
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const WorkflowSelector = styled.select`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #4299e1;
  }
`;

const WorkflowControls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const ControlButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid ${props => props.active ? '#4299e1' : '#e2e8f0'};
  border-radius: 6px;
  background: ${props => props.active ? '#ebf8ff' : 'white'};
  color: ${props => props.active ? '#4299e1' : '#4a5568'};
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  
  &:hover {
    background: #f7fafc;
    border-color: #4299e1;
  }
`;

const WorkflowCanvas = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fafafa;
`;

const WorkflowSvg = styled.svg`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;

const StepNode = styled.div.withConfig({
  shouldForwardProp: (prop) => !['status', 'stepType'].includes(prop),
})<{ status: string; stepType: string }>`
  position: absolute;
  padding: 12px 16px;
  border-radius: 8px;
  background: ${props => {
    switch (props.status) {
      case 'completed': return '#f0fff4';
      case 'running': return '#ebf8ff';
      case 'failed': return '#fed7d7';
      case 'pending': return '#f7fafc';
      default: return '#f7fafc';
    }
  }};
  border: 2px solid ${props => {
    switch (props.status) {
      case 'completed': return '#38a169';
      case 'running': return '#4299e1';
      case 'failed': return '#e53e3e';
      case 'pending': return '#a0aec0';
      default: return '#a0aec0';
    }
  }};
  min-width: 140px;
  max-width: 200px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  transform: ${props => props.status === 'running' ? 'scale(1.05)' : 'scale(1)'};
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
  }
  
  ${props => props.status === 'running' && `
    animation: pulse 2s infinite;
  `}
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const StepTitle = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: #2d3748;
`;

const StepDetails = styled.div`
  font-size: 11px;
  color: #718096;
  line-height: 1.3;
`;

const StepMetrics = styled.div`
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #e2e8f0;
  font-size: 10px;
  color: #4a5568;
`;

const FlowLine = styled.line.withConfig({
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: string }>`
  stroke: ${props => {
    switch (props.status) {
      case 'completed': return '#38a169';
      case 'active': return '#4299e1';
      case 'pending': return '#a0aec0';
      default: return '#a0aec0';
    }
  }};
  stroke-width: 3;
  stroke-dasharray: ${props => props.status === 'active' ? '5,5' : 'none'};
  
  ${props => props.status === 'active' && `
    animation: flowAnimation 1.5s infinite linear;
  `}
  
  @keyframes flowAnimation {
    0% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: 10; }
  }
`;

const FlowArrow = styled.polygon.withConfig({
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: string }>`
  fill: ${props => {
    switch (props.status) {
      case 'completed': return '#38a169';
      case 'active': return '#4299e1';
      case 'pending': return '#a0aec0';
      default: return '#a0aec0';
    }
  }};
`;

const WorkflowStats = styled.div`
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: #718096;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
`;

interface WorkflowTopologyVisualizerProps {
  selectedWorkflowId?: string;
  onWorkflowSelect?: (workflowId: string) => void;
}

const WorkflowTopologyVisualizer: React.FC<WorkflowTopologyVisualizerProps> = ({
  selectedWorkflowId,
  onWorkflowSelect
}) => {
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInstance | null>(null);
  const [computeFlows, setComputeFlows] = useState<ComputeFlow[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [_selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start monitoring
    WorkflowTopologyService.startMonitoring();

    // Subscribe to updates
    const updateData = () => {
      const allWorkflows = WorkflowTopologyService.getAllWorkflows();
      setWorkflows(allWorkflows);

      // Update selected workflow
      if (selectedWorkflowId || (allWorkflows.length > 0 && !selectedWorkflow)) {
        const workflowId = selectedWorkflowId || allWorkflows[0].id;
        const workflow = WorkflowTopologyService.getWorkflow(workflowId);
        if (workflow) {
          setSelectedWorkflow(workflow);
          setComputeFlows(WorkflowTopologyService.getComputeFlows(workflowId));
        }
      }
    };

    WorkflowTopologyService.subscribe(updateData);
    updateData(); // Initial load

    return () => {
      WorkflowTopologyService.unsubscribe(updateData);
      WorkflowTopologyService.stopMonitoring();
    };
  }, [selectedWorkflowId, selectedWorkflow]);

  const handleWorkflowChange = (workflowId: string) => {
    const workflow = WorkflowTopologyService.getWorkflow(workflowId);
    if (workflow) {
      setSelectedWorkflow(workflow);
      setComputeFlows(WorkflowTopologyService.getComputeFlows(workflowId));
      setSelectedStep(null);
      onWorkflowSelect?.(workflowId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={14} />;
      case 'running': return <Loader size={14} className="animate-spin" />;
      case 'failed': return <AlertCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
  };

  const calculateFlowPath = (fromStep: WorkflowStep, toStep: WorkflowStep) => {
    const startX = fromStep.location.x + 70; // Approximate center of step node
    const startY = fromStep.location.y + 25;
    const endX = toStep.location.x;
    const endY = toStep.location.y + 25;
    
    return {
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY
    };
  };

  if (!selectedWorkflow) {
    return (
      <WorkflowContainer>
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
          <Activity size={48} style={{ margin: '0 auto 16px' }} />
          <div>No active workflows found</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Submit a workflow to see real-time topology visualization
          </div>
        </div>
      </WorkflowContainer>
    );
  }

  return (
    <WorkflowContainer>
      <WorkflowHeader>
        <div>
          <WorkflowSelector
            value={selectedWorkflow.id}
            onChange={(e) => handleWorkflowChange(e.target.value)}
          >
            {workflows.map(workflow => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name} ({workflow.status})
              </option>
            ))}
          </WorkflowSelector>
        </div>
        
        <WorkflowControls>
          <ControlButton active={isPlaying} onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? 'Pause' : 'Play'}
          </ControlButton>
          <ControlButton>
            <Clock size={12} />
            {formatDuration(selectedWorkflow.duration)}
          </ControlButton>
        </WorkflowControls>
      </WorkflowHeader>

      <WorkflowCanvas ref={canvasRef}>
        <WorkflowSvg>
          {/* Render compute flows */}
          {computeFlows.map(flow => {
            const fromStep = selectedWorkflow.steps.find(s => s.id === flow.fromStep);
            const toStep = selectedWorkflow.steps.find(s => s.id === flow.toStep);
            
            if (!fromStep || !toStep) return null;
            
            const path = calculateFlowPath(fromStep, toStep);
            const arrowX = path.x2 - 10;
            const arrowY = path.y2;
            
            return (
              <g key={flow.id}>
                <FlowLine
                  x1={path.x1}
                  y1={path.y1}
                  x2={path.x2}
                  y2={path.y2}
                  status={flow.status}
                />
                <FlowArrow
                  points={`${arrowX},${arrowY - 4} ${arrowX + 8},${arrowY} ${arrowX},${arrowY + 4}`}
                  status={flow.status}
                />
              </g>
            );
          })}
        </WorkflowSvg>

        {/* Render workflow steps */}
        {selectedWorkflow.steps.map(step => (
          <StepNode
            key={step.id}
            status={step.status}
            stepType={step.type}
            style={{
              left: step.location.x,
              top: step.location.y
            }}
            onClick={() => setSelectedStep(step)}
          >
            <StepHeader>
              {getStatusIcon(step.status)}
              <StepTitle>{step.name}</StepTitle>
            </StepHeader>
            
            <StepDetails>
              <div>Type: {step.type}</div>
              {step.taskId && <div>Task: {step.taskId}</div>}
              {step.duration && <div>Duration: {formatDuration(step.duration)}</div>}
            </StepDetails>

            <StepMetrics>
              <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                <span><Cpu size={10} /> {step.resources.cpu}c</span>
                <span><HardDrive size={10} /> {step.resources.memory}GB</span>
              </div>
              {step.inputs.length > 0 && (
                <div>Input: {formatBytes(step.inputs[0].size)}</div>
              )}
            </StepMetrics>
          </StepNode>
        ))}
      </WorkflowCanvas>

      <WorkflowStats>
        <StatItem>
          <StatLabel>Progress</StatLabel>
          <StatValue>
            {selectedWorkflow.metrics.completedSteps}/{selectedWorkflow.metrics.totalSteps}
          </StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>CPU Usage</StatLabel>
          <StatValue>{selectedWorkflow.metrics.peakCpuUsage}c</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Memory</StatLabel>
          <StatValue>{selectedWorkflow.metrics.peakMemoryUsage}GB</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Data Processed</StatLabel>
          <StatValue>{formatBytes(selectedWorkflow.metrics.totalDataProcessed)}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Status</StatLabel>
          <StatValue style={{ 
            color: selectedWorkflow.status === 'completed' ? '#38a169' : 
                   selectedWorkflow.status === 'running' ? '#4299e1' : 
                   selectedWorkflow.status === 'failed' ? '#e53e3e' : '#718096'
          }}>
            {selectedWorkflow.status.toUpperCase()}
          </StatValue>
        </StatItem>
      </WorkflowStats>
    </WorkflowContainer>
  );
};

export default WorkflowTopologyVisualizer;
