// Task state colors mapping
export const TASK_STATE_COLORS: Record<string, string> = {
  QUEUED: '#ffc107',
  INITIALIZING: '#17a2b8',
  RUNNING: '#007bff',
  PAUSED: '#fd7e14',
  COMPLETE: '#28a745',
  EXECUTOR_ERROR: '#dc3545',
  SYSTEM_ERROR: '#dc3545',
  CANCELED: '#6c757d',
  PREEMPTED: '#6c757d',
  UNKNOWN: '#6c757d'
};

// Polling intervals in milliseconds
export const POLLING_INTERVALS = {
  DASHBOARD: 5000,
  TASKS: 3000,
  LOGS: 2000
};

// API endpoints
export const API_ENDPOINTS = {
  TEST_CONNECTION: '/api/test_connection',
  DASHBOARD_DATA: '/api/dashboard_data',
  SUBMIT_TASK: '/api/submit_task',
  TES_INSTANCES: '/api/tes_instances',
  SUBMIT_WORKFLOW: '/api/submit_workflow',
  SUBMIT_BATCH: '/api/submit_batch'
};

// Task states
export const TASK_STATES = {
  UNKNOWN: 'UNKNOWN',
  QUEUED: 'QUEUED',
  INITIALIZING: 'INITIALIZING',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETE: 'COMPLETE',
  EXECUTOR_ERROR: 'EXECUTOR_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CANCELED: 'CANCELED',
  PREEMPTED: 'PREEMPTED'
};
