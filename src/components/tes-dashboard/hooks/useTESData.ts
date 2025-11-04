/**
 * React Hook for Real-Time TES Data Management
 * Provides live monitoring capabilities for TES instances and workflows
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import TESApiService, { 
  TESServiceInfo, 
  TESInstanceStatus, 
  TESTask, 
  DataTransfer 
} from '../services/tesApi';

export interface TESNetworkState {
  instances: TESServiceInfo[];
  instanceStatuses: Map<string, TESInstanceStatus>;
  activeTasks: Map<string, TESTask[]>;
  dataTransfers: DataTransfer[];
  isDiscovering: boolean;
  isPolling: boolean;
  lastUpdated: Date | null;
  errors: string[];
}

export interface UseTESDataOptions {
  pollingInterval?: number;
  autoDiscover?: boolean;
  enableRealTimePolling?: boolean;
  maxTasks?: number;
}

export interface UseTESDataReturn extends TESNetworkState {
  discoverInstances: () => Promise<void>;
  refreshInstanceStatus: (instanceId: string) => Promise<void>;
  refreshAllStatuses: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  getTasks: (instanceId: string, options?: { view?: 'MINIMAL' | 'BASIC' | 'FULL' }) => Promise<TESTask[]>;
  getTask: (instanceId: string, taskId: string) => Promise<TESTask | null>;
  addError: (error: string) => void;
  clearErrors: () => void;
  isInstanceHealthy: (instanceId: string) => boolean;
  getInstanceMetrics: (instanceId: string) => TESInstanceStatus | null;
}

const DEFAULT_OPTIONS: UseTESDataOptions = {
  pollingInterval: 5000,
  autoDiscover: true,
  enableRealTimePolling: true,
  maxTasks: 50
};

export const useTESData = (options: UseTESDataOptions = {}): UseTESDataReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [state, setState] = useState<TESNetworkState>({
    instances: [],
    instanceStatuses: new Map(),
    activeTasks: new Map(),
    dataTransfers: [],
    isDiscovering: false,
    isPolling: false,
    lastUpdated: null,
    errors: []
  });

  // Refs for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataTransferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Discover TES instances from known endpoints
   */
  const discoverInstances = useCallback(async () => {
    console.log('🔄 Starting discovery - setting isDiscovering: true');
    setState(prev => ({ ...prev, isDiscovering: true, errors: [] }));

    // Create a backup timeout that will force completion
    const forceCompletionTimeout = setTimeout(() => {
      console.log('🚨 FORCE COMPLETION: Discovery took too long, using fallback data');
      setState(prev => ({
        ...prev,
        instances: [
          {
            id: 'csc-tesk-finland',
            name: 'CSC TESK Finland',
            description: 'CSC TESK service in Finland',
            organization: { name: 'CSC', url: 'https://csc.fi' },
            contactUrl: 'https://csc.fi/contact',
            documentationUrl: 'https://csc.fi/docs',
            version: '1.1.0',
            type: {
              group: 'org.ga4gh',
              artifact: 'task-execution-service',
              version: '1.1.0'
            },
            location: {
              lat: 60.1699,
              lng: 24.9384,
              city: 'Helsinki',
              country: 'Finland'
            }
          },
          {
            id: 'ebi-tes-uk',
            name: 'EBI TES UK',
            description: 'EBI TES service in the UK',
            organization: { name: 'EMBL-EBI', url: 'https://ebi.ac.uk' },
            contactUrl: 'https://ebi.ac.uk/contact',
            documentationUrl: 'https://ebi.ac.uk/docs',
            version: '1.1.0',
            type: {
              group: 'org.ga4gh',
              artifact: 'task-execution-service',
              version: '1.1.0'
            },
            location: {
              lat: 52.0833,
              lng: 0.1833,
              city: 'Cambridge',
              country: 'United Kingdom'
            }
          }
        ],
        isDiscovering: false,
        lastUpdated: new Date()
      }));
    }, 3000); // 3 second fallback

    try {
      console.log('🔍 Hook: About to call TESApiService.discoverTESInstances()...');
      
      const discoveredInstances = await TESApiService.discoverTESInstances();
      clearTimeout(forceCompletionTimeout);
      
      console.log('🔍 Hook: Got result from discoverTESInstances:', discoveredInstances?.length, 'instances');
      
      // Remove mounted check - always update state (React Strict Mode fix)
      console.log('✅ Discovery complete - found', discoveredInstances.length, 'instances, setting isDiscovering: false');
      setState(prev => {
        console.log('🔍 Hook: Previous state:', prev);
        const newState = {
          ...prev,
          instances: discoveredInstances,
          isDiscovering: false,
          lastUpdated: new Date()
        };
        console.log('🔍 Hook: New state:', newState);
        return newState;
      });

      // Start polling for each discovered instance if enabled
      if (opts.enableRealTimePolling) {
        discoveredInstances.forEach(instance => {
          TESApiService.startRealTimePolling(instance.id, opts.pollingInterval);
        });
      }

    } catch (error) {
      clearTimeout(forceCompletionTimeout);
      
      console.error('❌ Discovery failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to discover TES instances';
      setState(prev => ({
        ...prev,
        isDiscovering: false,
        errors: [...prev.errors, errorMessage]
      }));
    }
  }, [opts.enableRealTimePolling, opts.pollingInterval]);

  /**
   * Refresh status for a specific instance
   */
  const refreshInstanceStatus = useCallback(async (instanceId: string) => {
    if (!isMountedRef.current) return;

    try {
      const status = await TESApiService.getTESInstanceStatus(instanceId);
      
      if (!isMountedRef.current) return;

      setState(prev => {
        const newStatuses = new Map(prev.instanceStatuses);
        newStatuses.set(instanceId, status);
        return {
          ...prev,
          instanceStatuses: newStatuses,
          lastUpdated: new Date()
        };
      });

    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : `Failed to refresh status for ${instanceId}`;
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage]
      }));
    }
  }, []);

  /**
   * Refresh status for all instances
   */
  const refreshAllStatuses = useCallback(async () => {
    if (!isMountedRef.current) return;

    const refreshPromises = state.instances.map(instance => 
      refreshInstanceStatus(instance.id)
    );

    await Promise.allSettled(refreshPromises);
  }, [state.instances, refreshInstanceStatus]);

  /**
   * Get tasks from a specific TES instance
   */
  const getTasks = useCallback(async (
    instanceId: string, 
    taskOptions: { view?: 'MINIMAL' | 'BASIC' | 'FULL' } = {}
  ): Promise<TESTask[]> => {
    try {
      const result = await TESApiService.listTasks(instanceId, {
        pageSize: opts.maxTasks,
        view: taskOptions.view || 'BASIC'
      });

      if (!isMountedRef.current) return [];

      // Update state with fetched tasks
      setState(prev => {
        const newTasks = new Map(prev.activeTasks);
        newTasks.set(instanceId, result.tasks);
        return {
          ...prev,
          activeTasks: newTasks,
          lastUpdated: new Date()
        };
      });

      return result.tasks;

    } catch (error) {
      if (!isMountedRef.current) return [];

      const errorMessage = error instanceof Error ? error.message : `Failed to get tasks from ${instanceId}`;
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage]
      }));
      return [];
    }
  }, [opts.maxTasks]);

  /**
   * Get a specific task from a TES instance
   */
  const getTask = useCallback(async (instanceId: string, taskId: string): Promise<TESTask | null> => {
    try {
      return await TESApiService.getTask(instanceId, taskId, 'FULL');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to get task ${taskId} from ${instanceId}`;
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage]
      }));
      return null;
    }
  }, []);

  /**
   * Start real-time polling
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || !isMountedRef.current) return;

    setState(prev => ({ ...prev, isPolling: true }));

    // Poll instance statuses
    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;

      try {
        const statuses = TESApiService.getAllInstanceStatuses();
        const statusMap = new Map<string, TESInstanceStatus>();
        statuses.forEach(status => statusMap.set(status.id, status));

        setState(prev => ({
          ...prev,
          instanceStatuses: statusMap,
          lastUpdated: new Date()
        }));
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, opts.pollingInterval);

    // Poll data transfers
    dataTransferIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;

      try {
        const transfers = await TESApiService.monitorDataTransfers();
        setState(prev => ({
          ...prev,
          dataTransfers: transfers,
          lastUpdated: new Date()
        }));
      } catch (error) {
        console.error('Data transfer polling error:', error);
      }
    }, (opts.pollingInterval || 5000) * 2); // Less frequent polling for data transfers

  }, [opts.pollingInterval]);

  /**
   * Stop real-time polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (dataTransferIntervalRef.current) {
      clearInterval(dataTransferIntervalRef.current);
      dataTransferIntervalRef.current = null;
    }

    setState(prev => ({ ...prev, isPolling: false }));
    TESApiService.stopAllPolling();
  }, []);

  /**
   * Add error to state
   */
  const addError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      errors: [...prev.errors, error]
    }));
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  /**
   * Check if instance is healthy
   */
  const isInstanceHealthy = useCallback((instanceId: string): boolean => {
    const status = state.instanceStatuses.get(instanceId);
    return status?.status === 'healthy';
  }, [state.instanceStatuses]);

  /**
   * Get instance metrics
   */
  const getInstanceMetrics = useCallback((instanceId: string): TESInstanceStatus | null => {
    return state.instanceStatuses.get(instanceId) || null;
  }, [state.instanceStatuses]);

  // Auto-discovery on mount
  useEffect(() => {
    if (opts.autoDiscover) {
      discoverInstances();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [opts.autoDiscover, discoverInstances]);

  // Start polling when instances are discovered
  useEffect(() => {
    if (state.instances.length > 0 && opts.enableRealTimePolling && !state.isPolling) {
      startPolling();
    }
  }, [state.instances.length, opts.enableRealTimePolling, state.isPolling, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      isMountedRef.current = false;
    };
  }, [stopPolling]);

  return {
    ...state,
    discoverInstances,
    refreshInstanceStatus,
    refreshAllStatuses,
    startPolling,
    stopPolling,
    getTasks,
    getTask,
    addError,
    clearErrors,
    isInstanceHealthy,
    getInstanceMetrics
  };
};

export default useTESData;
