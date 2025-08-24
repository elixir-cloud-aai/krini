// App-wide constants

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

// Task state colors
export const TASK_STATE_COLORS = {
  [TASK_STATES.UNKNOWN]: '#6c757d',
  [TASK_STATES.QUEUED]: '#ffc107',
  [TASK_STATES.INITIALIZING]: '#17a2b8',
  [TASK_STATES.RUNNING]: '#007bff',
  [TASK_STATES.PAUSED]: '#fd7e14',
  [TASK_STATES.COMPLETE]: '#28a745',
  [TASK_STATES.EXECUTOR_ERROR]: '#dc3545',
  [TASK_STATES.SYSTEM_ERROR]: '#dc3545',
  [TASK_STATES.CANCELED]: '#6c757d',
  [TASK_STATES.PREEMPTED]: '#e83e8c'
};

// Workflow types
export const WORKFLOW_TYPES = {
  SNAKEMAKE: 'snakemake',
  NEXTFLOW: 'nextflow',
  CWL: 'cwl'
};

// API endpoints
export const API_ENDPOINTS = {
  TEST_CONNECTION: '/api/test_connection',
  DASHBOARD_DATA: '/api/dashboard_data',
  TASK_DETAILS: '/task_details',
  SUBMIT_TASK: '/submit',
  CANCEL_TASK: '/cancel_task',
  LIST_TASKS: '/list_tasks',
  TASK_LOG: '/task_log',
  SUBMIT_WORKFLOW: '/submit_workflow',
  WORKFLOW_LOG: '/workflow_log',
  BATCH_SNAKEMAKE: '/batch_snakemake',
  BATCH_NEXTFLOW: '/batch_nextflow',
  BATCH_LOG: '/batch_log',
  SERVICE_INFO: '/service_info',
  STATUS: '/status',
  DEBUG_ENV: '/debug_env',
  TOPOLOGY_LOGS: '/api/topology_logs'
};

// Polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  FAST: 2000,      // 2 seconds - for active tasks
  NORMAL: 5000,    // 5 seconds - for dashboard
  SLOW: 10000,     // 10 seconds - for logs
  VERY_SLOW: 30000 // 30 seconds - for service info
};

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'text/plain',
    'application/yaml',
    'application/x-yaml',
    'text/yaml',
    'text/x-yaml',
    '.nf',
    '.smk',
    '.cwl',
    '.py'
  ]
};

// Table pagination
export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100]
};

// Theme colors
export const THEME = {
  PRIMARY: '#007bff',
  SECONDARY: '#6c757d',
  SUCCESS: '#28a745',
  DANGER: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#17a2b8',
  LIGHT: '#f8f9fa',
  DARK: '#343a40'
};

// TES Instances - These should match the backend configuration
export const TES_INSTANCES = [
  { name: 'Local TES', url: 'http://127.0.0.1:8000' },
  { name: 'TESK Prod EU', url: 'https://tesk-prod.cloud.e-infra.cz' },
  { name: 'TESK NA', url: 'https://tesk-na.cloud.e-infra.cz' },
  { name: 'Funnel Local', url: 'http://localhost:8000' }
];
