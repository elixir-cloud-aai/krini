/**
 * Data Flow Monitoring Service
 * Tracks real file transfers and data movement between storage and compute
 */

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  source: {
    type: 'storage' | 'tes' | 'user';
    id: string;
    url: string;
    location: string;
  };
  destination: {
    type: 'storage' | 'tes' | 'user';
    id: string;
    url: string;
    location: string;
  };
  status: 'pending' | 'initializing' | 'transferring' | 'completed' | 'failed' | 'paused';
  progress: {
    bytesTransferred: number;
    percentage: number;
    startTime: Date;
    estimatedCompletion?: Date;
    completionTime?: Date;
  };
  metrics: {
    transferSpeed: number; // bytes/second
    averageSpeed: number;
    peakSpeed: number;
    networkLatency: number;
    retryCount: number;
  };
  metadata: {
    taskId?: string;
    workflowId?: string;
    transferMethod: 'http' | 'https' | 'ftp' | 'rsync' | 's3' | 'scp';
    checksumType?: 'md5' | 'sha256' | 'sha512';
    checksumValue?: string;
    compression?: boolean;
    encryption?: boolean;
    failureReason?: string;
  };
}

export interface DataFlowMetrics {
  totalTransfers: number;
  activeTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  totalBytesTransferred: number;
  averageTransferSpeed: number;
  networkUtilization: number;
  storageUtilization: Map<string, number>;
  computeUtilization: Map<string, number>;
}

export interface DataFlowPattern {
  id: string;
  name: string;
  sourcePattern: string;
  destinationPattern: string;
  frequency: number;
  averageFileSize: number;
  peakHours: number[];
  commonFileTypes: string[];
}

class DataFlowMonitoringService {
  private static instance: DataFlowMonitoringService;
  private activeTransfers: Map<string, FileTransfer> = new Map();
  private transferHistory: FileTransfer[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  public static getInstance(): DataFlowMonitoringService {
    if (!DataFlowMonitoringService.instance) {
      DataFlowMonitoringService.instance = new DataFlowMonitoringService();
    }
    return DataFlowMonitoringService.instance;
  }

  /**
   * Start monitoring data flows
   */
  startMonitoring(intervalMs: number = 2000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateTransferStates();
    }, intervalMs);

    // Initialize with some simulated transfers
    this.initializeSimulatedTransfers();
  }

  /**
   * Stop monitoring data flows
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Get all active transfers
   */
  getActiveTransfers(): FileTransfer[] {
    return Array.from(this.activeTransfers.values());
  }

  /**
   * Get transfer by ID
   */
  getTransfer(transferId: string): FileTransfer | null {
    return this.activeTransfers.get(transferId) || null;
  }

  /**
   * Get transfers for a specific task
   */
  getTransfersForTask(taskId: string): FileTransfer[] {
    return Array.from(this.activeTransfers.values())
      .filter(transfer => transfer.metadata.taskId === taskId);
  }

  /**
   * Get transfers for a specific workflow
   */
  getTransfersForWorkflow(workflowId: string): FileTransfer[] {
    return Array.from(this.activeTransfers.values())
      .filter(transfer => transfer.metadata.workflowId === workflowId);
  }

  /**
   * Get data flow metrics
   */
  getDataFlowMetrics(): DataFlowMetrics {
    const allTransfers = Array.from(this.activeTransfers.values());
    const activeTransfers = allTransfers.filter(t => t.status === 'transferring');
    const completedTransfers = allTransfers.filter(t => t.status === 'completed');
    const failedTransfers = allTransfers.filter(t => t.status === 'failed');

    const totalBytesTransferred = completedTransfers.reduce(
      (sum, transfer) => sum + transfer.fileSize, 0
    );

    const averageTransferSpeed = activeTransfers.length > 0 
      ? activeTransfers.reduce((sum, transfer) => sum + transfer.metrics.transferSpeed, 0) / activeTransfers.length
      : 0;

    // Calculate storage utilization
    const storageUtilization = new Map<string, number>();
    const storageActivity = new Map<string, number>();

    allTransfers.forEach(transfer => {
      if (transfer.source.type === 'storage') {
        const current = storageActivity.get(transfer.source.id) || 0;
        storageActivity.set(transfer.source.id, current + 1);
      }
      if (transfer.destination.type === 'storage') {
        const current = storageActivity.get(transfer.destination.id) || 0;
        storageActivity.set(transfer.destination.id, current + 1);
      }
    });

    storageActivity.forEach((activity, storageId) => {
      // Simulate utilization percentage based on activity
      const utilization = Math.min(activity * 10, 100);
      storageUtilization.set(storageId, utilization);
    });

    // Calculate compute utilization
    const computeUtilization = new Map<string, number>();
    const computeActivity = new Map<string, number>();

    allTransfers.forEach(transfer => {
      if (transfer.source.type === 'tes') {
        const current = computeActivity.get(transfer.source.id) || 0;
        computeActivity.set(transfer.source.id, current + 1);
      }
      if (transfer.destination.type === 'tes') {
        const current = computeActivity.get(transfer.destination.id) || 0;
        computeActivity.set(transfer.destination.id, current + 1);
      }
    });

    computeActivity.forEach((activity, computeId) => {
      const utilization = Math.min(activity * 15, 100);
      computeUtilization.set(computeId, utilization);
    });

    return {
      totalTransfers: allTransfers.length,
      activeTransfers: activeTransfers.length,
      completedTransfers: completedTransfers.length,
      failedTransfers: failedTransfers.length,
      totalBytesTransferred,
      averageTransferSpeed,
      networkUtilization: Math.min(activeTransfers.length * 5, 100),
      storageUtilization,
      computeUtilization
    };
  }

  /**
   * Track a new file transfer
   */
  trackTransfer(transfer: Omit<FileTransfer, 'id' | 'progress' | 'metrics'>): string {
    const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullTransfer: FileTransfer = {
      ...transfer,
      id: transferId,
      progress: {
        bytesTransferred: 0,
        percentage: 0,
        startTime: new Date()
      },
      metrics: {
        transferSpeed: 0,
        averageSpeed: 0,
        peakSpeed: 0,
        networkLatency: Math.floor(Math.random() * 100) + 10,
        retryCount: 0
      }
    };

    this.activeTransfers.set(transferId, fullTransfer);
    return transferId;
  }

  /**
   * Update transfer progress
   */
  updateTransferProgress(transferId: string, bytesTransferred: number): void {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer) return;

    const percentage = (bytesTransferred / transfer.fileSize) * 100;
    const elapsed = Date.now() - transfer.progress.startTime.getTime();
    const transferSpeed = bytesTransferred / (elapsed / 1000);

    transfer.progress.bytesTransferred = bytesTransferred;
    transfer.progress.percentage = Math.min(percentage, 100);
    transfer.metrics.transferSpeed = transferSpeed;
    transfer.metrics.averageSpeed = (transfer.metrics.averageSpeed + transferSpeed) / 2;
    transfer.metrics.peakSpeed = Math.max(transfer.metrics.peakSpeed, transferSpeed);

    if (percentage >= 100) {
      transfer.status = 'completed';
      transfer.progress.completionTime = new Date();
    } else {
      const remainingBytes = transfer.fileSize - bytesTransferred;
      const remainingTime = remainingBytes / transferSpeed;
      transfer.progress.estimatedCompletion = new Date(Date.now() + remainingTime * 1000);
    }
  }

  /**
   * Mark transfer as failed
   */
  markTransferFailed(transferId: string, reason: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer) return;

    transfer.status = 'failed';
    transfer.metadata = { ...transfer.metadata, failureReason: reason };
  }

  /**
   * Pause a transfer
   */
  pauseTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer) return;

    if (transfer.status === 'transferring') {
      transfer.status = 'paused';
    }
  }

  /**
   * Resume a paused transfer
   */
  resumeTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer) return;

    if (transfer.status === 'paused') {
      transfer.status = 'transferring';
    }
  }

  /**
   * Get data flow patterns
   */
  getDataFlowPatterns(): DataFlowPattern[] {
    // Analyze historical transfers to identify patterns
    const patterns: DataFlowPattern[] = [];

    // Common genomics data patterns
    patterns.push({
      id: 'genomics-input',
      name: 'Genomics Input Data Flow',
      sourcePattern: 'storage-*',
      destinationPattern: 'tes-*',
      frequency: 150, // transfers per day
      averageFileSize: 2.5 * 1024 * 1024 * 1024, // 2.5GB
      peakHours: [9, 10, 14, 15], // 9-10 AM, 2-3 PM
      commonFileTypes: ['.fastq.gz', '.bam', '.vcf', '.fa']
    });

    patterns.push({
      id: 'results-output',
      name: 'Results Output Flow',
      sourcePattern: 'tes-*',
      destinationPattern: 'storage-*',
      frequency: 120,
      averageFileSize: 500 * 1024 * 1024, // 500MB
      peakHours: [16, 17, 18],
      commonFileTypes: ['.bam', '.vcf', '.txt', '.html']
    });

    patterns.push({
      id: 'reference-data',
      name: 'Reference Data Distribution',
      sourcePattern: 'storage-global',
      destinationPattern: 'tes-*',
      frequency: 50,
      averageFileSize: 3.2 * 1024 * 1024 * 1024, // 3.2GB
      peakHours: [8, 9, 13],
      commonFileTypes: ['.fa', '.gtf', '.bed']
    });

    return patterns;
  }

  /**
   * Initialize simulated transfers for demonstration
   */
  private initializeSimulatedTransfers(): void {
    const sampleTransfers = [
      {
        fileName: 'genome_sample_1.fastq.gz',
        fileSize: 2.5 * 1024 * 1024 * 1024, // 2.5GB
        source: {
          type: 'storage' as const,
          id: 'storage-eu-central',
          url: 'https://storage.eu-central.example.com/genome_sample_1.fastq.gz',
          location: 'Frankfurt, Germany'
        },
        destination: {
          type: 'tes' as const,
          id: 'tes-netherlands-1',
          url: 'https://tes.surf.nl/workspace/input/',
          location: 'Amsterdam, Netherlands'
        },
        status: 'transferring' as const,
        metadata: {
          taskId: 'task-genome-analysis-001',
          workflowId: 'workflow-wgs-pipeline',
          transferMethod: 'https' as const,
          checksumType: 'sha256' as const,
          compression: true,
          encryption: true
        }
      },
      {
        fileName: 'reference_genome_hg38.fa',
        fileSize: 3.2 * 1024 * 1024 * 1024, // 3.2GB
        source: {
          type: 'storage' as const,
          id: 'storage-global',
          url: 'https://global-cache.example.com/reference/hg38.fa',
          location: 'London, UK'
        },
        destination: {
          type: 'tes' as const,
          id: 'tes-finland-1',
          url: 'https://tes.csc.fi/cache/reference/',
          location: 'Helsinki, Finland'
        },
        status: 'transferring' as const,
        metadata: {
          taskId: 'task-variant-calling-002',
          transferMethod: 'https' as const,
          checksumType: 'md5' as const,
          compression: false,
          encryption: true
        }
      },
      {
        fileName: 'analysis_results.vcf',
        fileSize: 150 * 1024 * 1024, // 150MB
        source: {
          type: 'tes' as const,
          id: 'tes-uk-1',
          url: 'https://tes.ebi.ac.uk/workspace/output/',
          location: 'Cambridge, UK'
        },
        destination: {
          type: 'storage' as const,
          id: 'storage-eu-north',
          url: 'https://storage.eu-north.example.com/results/',
          location: 'Stockholm, Sweden'
        },
        status: 'completed' as const,
        metadata: {
          taskId: 'task-annotation-003',
          workflowId: 'workflow-variant-annotation',
          transferMethod: 'https' as const,
          checksumType: 'sha256' as const
        }
      }
    ];

    sampleTransfers.forEach(transfer => {
      const transferId = this.trackTransfer(transfer);
      
      // Set realistic progress for ongoing transfers
      if (transfer.status === 'transferring') {
        const randomProgress = Math.floor(Math.random() * 80) + 10; // 10-90%
        const bytesTransferred = (transfer.fileSize * randomProgress) / 100;
        this.updateTransferProgress(transferId, bytesTransferred);
      } else if (transfer.status === 'completed') {
        this.updateTransferProgress(transferId, transfer.fileSize);
      }
    });
  }

  /**
   * Update transfer states in monitoring loop
   */
  private updateTransferStates(): void {
    this.activeTransfers.forEach((transfer, transferId) => {
      if (transfer.status === 'transferring') {
        // Simulate transfer progress
        const increment = Math.floor(Math.random() * 50 * 1024 * 1024); // Up to 50MB per update
        const newBytesTransferred = Math.min(
          transfer.progress.bytesTransferred + increment,
          transfer.fileSize
        );
        
        this.updateTransferProgress(transferId, newBytesTransferred);

        // Occasionally simulate failures (1% chance)
        if (Math.random() < 0.01) {
          this.markTransferFailed(transferId, 'Network timeout');
        }
      }
    });

    // Clean up completed transfers older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.activeTransfers.forEach((transfer, transferId) => {
      if (
        (transfer.status === 'completed' || transfer.status === 'failed') &&
        transfer.progress.completionTime &&
        transfer.progress.completionTime.getTime() < oneHourAgo
      ) {
        this.transferHistory.push(transfer);
        this.activeTransfers.delete(transferId);
      }
    });

    // Occasionally add new transfers to simulate ongoing activity
    if (Math.random() < 0.1) { // 10% chance per update cycle
      this.addRandomTransfer();
    }
  }

  /**
   * Add a random transfer for simulation
   */
  private addRandomTransfer(): void {
    const fileNames = [
      'sample_reads.fastq.gz',
      'aligned_reads.bam',
      'variants.vcf',
      'annotation_results.txt',
      'quality_report.html',
      'reference_data.fa'
    ];

    const storageIds = ['storage-eu-central', 'storage-eu-north', 'storage-na-east', 'storage-global'];
    const tesIds = ['tes-netherlands-1', 'tes-finland-1', 'tes-uk-1', 'tes-germany-1'];

    const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
    const fileSize = Math.floor(Math.random() * 5 * 1024 * 1024 * 1024) + 100 * 1024 * 1024; // 100MB to 5GB

    const isInputTransfer = Math.random() > 0.5;
    const sourceId = isInputTransfer 
      ? storageIds[Math.floor(Math.random() * storageIds.length)]
      : tesIds[Math.floor(Math.random() * tesIds.length)];
    const destinationId = isInputTransfer
      ? tesIds[Math.floor(Math.random() * tesIds.length)]
      : storageIds[Math.floor(Math.random() * storageIds.length)];

    this.trackTransfer({
      fileName,
      fileSize,
      source: {
        type: isInputTransfer ? 'storage' : 'tes',
        id: sourceId,
        url: `https://${sourceId}.example.com/data/${fileName}`,
        location: 'Various'
      },
      destination: {
        type: isInputTransfer ? 'tes' : 'storage',
        id: destinationId,
        url: `https://${destinationId}.example.com/workspace/`,
        location: 'Various'
      },
      status: 'transferring',
      metadata: {
        taskId: `task-${Math.random().toString(36).substr(2, 9)}`,
        transferMethod: 'https' as const,
        checksumType: 'sha256' as const
      }
    });
  }

  /**
   * Get transfer history
   */
  getTransferHistory(limit: number = 100): FileTransfer[] {
    return this.transferHistory.slice(-limit);
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.activeTransfers.clear();
    this.transferHistory = [];
  }
}

export default DataFlowMonitoringService.getInstance();
