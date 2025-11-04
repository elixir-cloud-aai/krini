/**
 * Workflow Topology Service
 * Provides real-time workflow visualization with compute flow tracking
 */

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'input' | 'process' | 'output' | 'decision' | 'parallel';
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  taskId?: string;
  instanceId?: string;
  dependencies: string[]; // IDs of prerequisite steps
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  inputs: Array<{
    name: string;
    path: string;
    size: number;
    source: string;
  }>;
  outputs: Array<{
    name: string;
    path: string;
    size: number;
    destination: string;
  }>;
  command?: string[];
  location: {
    x: number;
    y: number;
  };
  metadata: {
    image?: string;
    environment?: Record<string, string>;
    retryCount?: number;
    lastError?: string;
  };
}

export interface WorkflowInstance {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  submittedAt: Date;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  submittedBy: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  steps: WorkflowStep[];
  globalInputs: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  globalOutputs: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  metrics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    parallelBranches: number;
    peakCpuUsage: number;
    peakMemoryUsage: number;
    totalDataProcessed: number;
    networkTraffic: number;
  };
  tags: Record<string, string>;
}

export interface ComputeFlow {
  id: string;
  workflowId: string;
  fromStep: string;
  toStep: string;
  dataType: 'file' | 'parameter' | 'signal';
  status: 'pending' | 'active' | 'completed' | 'failed';
  data: {
    name: string;
    size?: number;
    format?: string;
    path?: string;
  };
  transferMetrics: {
    startTime?: Date;
    endTime?: Date;
    bytesTransferred: number;
    transferSpeed: number;
  };
}

class WorkflowTopologyService {
  private static instance: WorkflowTopologyService;
  private workflows: Map<string, WorkflowInstance> = new Map();
  private computeFlows: Map<string, ComputeFlow> = new Map();
  private updateCallbacks: Set<() => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  static getInstance(): WorkflowTopologyService {
    if (!WorkflowTopologyService.instance) {
      WorkflowTopologyService.instance = new WorkflowTopologyService();
    }
    return WorkflowTopologyService.instance;
  }

  /**
   * Start monitoring workflow topology
   */
  startMonitoring(): void {
    if (this.monitoringInterval) return;

    // Initialize with mock workflows for development
    this.initializeMockWorkflows();

    this.monitoringInterval = setInterval(() => {
      this.updateWorkflowStates();
      this.notifySubscribers();
    }, 2000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Subscribe to workflow updates
   */
  subscribe(callback: () => void): void {
    this.updateCallbacks.add(callback);
  }

  /**
   * Unsubscribe from workflow updates
   */
  unsubscribe(callback: () => void): void {
    this.updateCallbacks.delete(callback);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowInstance[] {
    return Array.from(this.workflows.values())
      .filter(w => w.status === 'running' || w.status === 'pending');
  }

  /**
   * Get all workflows (including completed/failed)
   */
  getAllWorkflows(): WorkflowInstance[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): WorkflowInstance | undefined {
    return this.workflows.get(id);
  }

  /**
   * Get compute flows for a workflow
   */
  getComputeFlows(workflowId: string): ComputeFlow[] {
    return Array.from(this.computeFlows.values())
      .filter(flow => flow.workflowId === workflowId);
  }

  /**
   * Get real-time workflow metrics
   */
  getWorkflowMetrics() {
    const workflows = Array.from(this.workflows.values());
    return {
      totalWorkflows: workflows.length,
      runningWorkflows: workflows.filter(w => w.status === 'running').length,
      completedWorkflows: workflows.filter(w => w.status === 'completed').length,
      failedWorkflows: workflows.filter(w => w.status === 'failed').length,
      totalSteps: workflows.reduce((sum, w) => sum + w.metrics.totalSteps, 0),
      completedSteps: workflows.reduce((sum, w) => sum + w.metrics.completedSteps, 0),
      averageExecutionTime: this.calculateAverageExecutionTime(workflows),
      resourceUtilization: {
        cpu: this.calculateResourceUtilization(workflows, 'cpu'),
        memory: this.calculateResourceUtilization(workflows, 'memory'),
        disk: this.calculateResourceUtilization(workflows, 'disk')
      }
    };
  }

  /**
   * Initialize mock workflows for development/demo
   */
  private initializeMockWorkflows(): void {
    const isDevelopment = typeof window !== 'undefined' && 
                         (window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1');
    
    if (!isDevelopment) return;

    // Mock Genomics Pipeline Workflow
    const genomicsWorkflow: WorkflowInstance = {
      id: 'workflow-genomics-001',
      name: 'Genomics Analysis Pipeline',
      description: 'End-to-end genomics data processing workflow',
      status: 'running',
      submittedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      startTime: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
      submittedBy: 'researcher@university.edu',
      priority: 'high',
      steps: [
        {
          id: 'step-input',
          name: 'Data Input',
          type: 'input',
          status: 'completed',
          dependencies: [],
          startTime: new Date(Date.now() - 12 * 60 * 1000),
          endTime: new Date(Date.now() - 11 * 60 * 1000),
          duration: 60000,
          resources: { cpu: 1, memory: 2, disk: 50 },
          inputs: [],
          outputs: [{ name: 'raw-data.fastq', path: '/data/raw-data.fastq', size: 2147483648, destination: 'storage://bucket/raw/' }],
          location: { x: 50, y: 200 },
          metadata: { image: 'biocontainers/fastqc:latest' }
        },
        {
          id: 'step-qc',
          name: 'Quality Control',
          type: 'process',
          status: 'completed',
          dependencies: ['step-input'],
          startTime: new Date(Date.now() - 11 * 60 * 1000),
          endTime: new Date(Date.now() - 9 * 60 * 1000),
          duration: 120000,
          resources: { cpu: 4, memory: 8, disk: 20 },
          inputs: [{ name: 'raw-data.fastq', path: '/data/raw-data.fastq', size: 2147483648, source: 'storage://bucket/raw/' }],
          outputs: [{ name: 'qc-report.html', path: '/results/qc-report.html', size: 1048576, destination: 'storage://bucket/qc/' }],
          location: { x: 200, y: 200 },
          metadata: { image: 'biocontainers/fastqc:latest' }
        },
        {
          id: 'step-align',
          name: 'Sequence Alignment',
          type: 'process',
          status: 'running',
          dependencies: ['step-qc'],
          startTime: new Date(Date.now() - 8 * 60 * 1000),
          resources: { cpu: 16, memory: 32, disk: 100 },
          inputs: [{ name: 'raw-data.fastq', path: '/data/raw-data.fastq', size: 2147483648, source: 'storage://bucket/raw/' }],
          outputs: [{ name: 'aligned.bam', path: '/results/aligned.bam', size: 1073741824, destination: 'storage://bucket/aligned/' }],
          location: { x: 350, y: 200 },
          metadata: { image: 'biocontainers/bwa:latest' }
        },
        {
          id: 'step-variant',
          name: 'Variant Calling',
          type: 'process',
          status: 'pending',
          dependencies: ['step-align'],
          resources: { cpu: 8, memory: 16, disk: 50 },
          inputs: [{ name: 'aligned.bam', path: '/results/aligned.bam', size: 1073741824, source: 'storage://bucket/aligned/' }],
          outputs: [{ name: 'variants.vcf', path: '/results/variants.vcf', size: 104857600, destination: 'storage://bucket/variants/' }],
          location: { x: 500, y: 200 },
          metadata: { image: 'biocontainers/gatk:latest' }
        },
        {
          id: 'step-report',
          name: 'Generate Report',
          type: 'output',
          status: 'pending',
          dependencies: ['step-variant'],
          resources: { cpu: 2, memory: 4, disk: 10 },
          inputs: [{ name: 'variants.vcf', path: '/results/variants.vcf', size: 104857600, source: 'storage://bucket/variants/' }],
          outputs: [{ name: 'final-report.pdf', path: '/reports/final-report.pdf', size: 52428800, destination: 'storage://bucket/reports/' }],
          location: { x: 650, y: 200 },
          metadata: { image: 'biocontainers/r-base:latest' }
        }
      ],
      globalInputs: [{ name: 'sample.fastq', path: '/input/sample.fastq', size: 2147483648 }],
      globalOutputs: [{ name: 'analysis-report.pdf', path: '/output/analysis-report.pdf', size: 52428800 }],
      metrics: {
        totalSteps: 5,
        completedSteps: 2,
        failedSteps: 0,
        parallelBranches: 1,
        peakCpuUsage: 16,
        peakMemoryUsage: 32,
        totalDataProcessed: 3221225472,
        networkTraffic: 2147483648
      },
      tags: { 'domain': 'genomics', 'priority': 'high', 'project': 'covid-research' }
    };

    // Mock Machine Learning Workflow
    const mlWorkflow: WorkflowInstance = {
      id: 'workflow-ml-002',
      name: 'ML Model Training Pipeline',
      description: 'Distributed machine learning model training workflow',
      status: 'running',
      submittedAt: new Date(Date.now() - 8 * 60 * 1000),
      startTime: new Date(Date.now() - 6 * 60 * 1000),
      submittedBy: 'datascientist@company.com',
      priority: 'normal',
      steps: [
        {
          id: 'step-data-prep',
          name: 'Data Preprocessing',
          type: 'process',
          status: 'completed',
          dependencies: [],
          startTime: new Date(Date.now() - 6 * 60 * 1000),
          endTime: new Date(Date.now() - 4 * 60 * 1000),
          duration: 120000,
          resources: { cpu: 8, memory: 16, disk: 200 },
          inputs: [{ name: 'raw-dataset.csv', path: '/data/raw-dataset.csv', size: 1073741824, source: 'storage://ml-bucket/raw/' }],
          outputs: [{ name: 'processed-data.parquet', path: '/data/processed-data.parquet', size: 536870912, destination: 'storage://ml-bucket/processed/' }],
          location: { x: 100, y: 150 },
          metadata: { image: 'tensorflow/tensorflow:latest' }
        },
        {
          id: 'step-feature-eng',
          name: 'Feature Engineering',
          type: 'process',
          status: 'completed',
          dependencies: ['step-data-prep'],
          startTime: new Date(Date.now() - 4 * 60 * 1000),
          endTime: new Date(Date.now() - 2 * 60 * 1000),
          duration: 120000,
          resources: { cpu: 4, memory: 8, disk: 100 },
          inputs: [{ name: 'processed-data.parquet', path: '/data/processed-data.parquet', size: 536870912, source: 'storage://ml-bucket/processed/' }],
          outputs: [{ name: 'features.npz', path: '/features/features.npz', size: 268435456, destination: 'storage://ml-bucket/features/' }],
          location: { x: 300, y: 150 },
          metadata: { image: 'scikit-learn/scikit-learn:latest' }
        },
        {
          id: 'step-train',
          name: 'Model Training',
          type: 'process',
          status: 'running',
          dependencies: ['step-feature-eng'],
          startTime: new Date(Date.now() - 2 * 60 * 1000),
          resources: { cpu: 32, memory: 64, disk: 500 },
          inputs: [{ name: 'features.npz', path: '/features/features.npz', size: 268435456, source: 'storage://ml-bucket/features/' }],
          outputs: [{ name: 'model.pkl', path: '/models/model.pkl', size: 134217728, destination: 'storage://ml-bucket/models/' }],
          location: { x: 500, y: 150 },
          metadata: { image: 'tensorflow/tensorflow:latest-gpu' }
        }
      ],
      globalInputs: [{ name: 'training-dataset.csv', path: '/input/training-dataset.csv', size: 1073741824 }],
      globalOutputs: [{ name: 'trained-model.pkl', path: '/output/trained-model.pkl', size: 134217728 }],
      metrics: {
        totalSteps: 3,
        completedSteps: 2,
        failedSteps: 0,
        parallelBranches: 1,
        peakCpuUsage: 32,
        peakMemoryUsage: 64,
        totalDataProcessed: 1879048192,
        networkTraffic: 1073741824
      },
      tags: { 'domain': 'ml', 'priority': 'normal', 'framework': 'tensorflow' }
    };

    this.workflows.set(genomicsWorkflow.id, genomicsWorkflow);
    this.workflows.set(mlWorkflow.id, mlWorkflow);

    // Create compute flows
    this.createComputeFlows(genomicsWorkflow);
    this.createComputeFlows(mlWorkflow);
  }

  /**
   * Create compute flows between workflow steps
   */
  private createComputeFlows(workflow: WorkflowInstance): void {
    workflow.steps.forEach(step => {
      step.dependencies.forEach(depId => {
        const flowId = `flow-${depId}-${step.id}`;
        const flow: ComputeFlow = {
          id: flowId,
          workflowId: workflow.id,
          fromStep: depId,
          toStep: step.id,
          dataType: 'file',
          status: step.status === 'completed' ? 'completed' : 
                  step.status === 'running' ? 'active' : 'pending',
          data: {
            name: step.inputs[0]?.name || 'data',
            size: step.inputs[0]?.size || 0,
            format: 'file'
          },
          transferMetrics: {
            bytesTransferred: step.status === 'completed' ? (step.inputs[0]?.size || 0) : 0,
            transferSpeed: 104857600 // 100 MB/s
          }
        };
        this.computeFlows.set(flowId, flow);
      });
    });
  }

  /**
   * Update workflow states (simulate real-time progression)
   */
  private updateWorkflowStates(): void {
    this.workflows.forEach(workflow => {
      if (workflow.status === 'running') {
        // Simulate step progression
        const runningSteps = workflow.steps.filter(s => s.status === 'running');
        const pendingSteps = workflow.steps.filter(s => s.status === 'pending');

        // Randomly complete running steps
        runningSteps.forEach(step => {
          if (Math.random() > 0.95) { // 5% chance per update
            step.status = 'completed';
            step.endTime = new Date();
            step.duration = step.endTime.getTime() - (step.startTime?.getTime() || 0);
            workflow.metrics.completedSteps++;

            // Start dependent steps
            pendingSteps.forEach(pendingStep => {
              const allDepsCompleted = pendingStep.dependencies.every(depId =>
                workflow.steps.find(s => s.id === depId)?.status === 'completed'
              );
              if (allDepsCompleted && pendingStep.status === 'pending') {
                pendingStep.status = 'running';
                pendingStep.startTime = new Date();
              }
            });

            // Update compute flows
            this.updateComputeFlowStatus(workflow.id, step.id);
          }
        });

        // Check if workflow is complete
        const allStepsCompleted = workflow.steps.every(s => s.status === 'completed');
        if (allStepsCompleted) {
          workflow.status = 'completed';
          workflow.endTime = new Date();
          workflow.duration = workflow.endTime.getTime() - (workflow.startTime?.getTime() || 0);
        }
      }
    });
  }

  /**
   * Update compute flow status
   */
  private updateComputeFlowStatus(workflowId: string, stepId: string): void {
    this.computeFlows.forEach(flow => {
      if (flow.workflowId === workflowId && flow.toStep === stepId) {
        flow.status = 'completed';
        flow.transferMetrics.endTime = new Date();
        flow.transferMetrics.bytesTransferred = flow.data.size || 0;
      }
    });
  }

  /**
   * Calculate average execution time for completed workflows
   */
  private calculateAverageExecutionTime(workflows: WorkflowInstance[]): number {
    const completedWorkflows = workflows.filter(w => w.status === 'completed' && w.duration);
    if (completedWorkflows.length === 0) return 0;
    
    const totalTime = completedWorkflows.reduce((sum, w) => sum + (w.duration || 0), 0);
    return totalTime / completedWorkflows.length;
  }

  /**
   * Calculate resource utilization
   */
  private calculateResourceUtilization(workflows: WorkflowInstance[], resource: 'cpu' | 'memory' | 'disk'): number {
    const runningWorkflows = workflows.filter(w => w.status === 'running');
    const totalUsage = runningWorkflows.reduce((sum, w) => {
      const runningSteps = w.steps.filter(s => s.status === 'running');
      return sum + runningSteps.reduce((stepSum, s) => stepSum + s.resources[resource], 0);
    }, 0);

    // Assume total capacity (this would come from TES instances in real implementation)
    const totalCapacity = {
      cpu: 1000,
      memory: 2000,
      disk: 10000
    };

    return (totalUsage / totalCapacity[resource]) * 100;
  }

  /**
   * Notify all subscribers of updates
   */
  private notifySubscribers(): void {
    this.updateCallbacks.forEach(callback => callback());
  }
}

export default WorkflowTopologyService.getInstance();
