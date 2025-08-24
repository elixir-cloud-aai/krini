import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080'; // Flask backend port

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Test connection to backend
export const testConnection = async () => {
  try {
    const response = await api.get('/api/test_connection');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

// Fetch all dashboard data
export const fetchDashboardData = async () => {
  try {
    const response = await api.get('/api/dashboard_data');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

// Submit a new task
export const submitTask = async (taskData: FormData) => {
  try {
    const response = await api.post('/submit', taskData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting task:', error);
    throw error;
  }
};

// Fetch TES instances
export const fetchTESInstances = async () => {
  try {
    const response = await api.get('/api/tes_locations');
    return response.data;
  } catch (error) {
    console.error('Error fetching TES instances:', error);
    throw error;
  }
};

// Submit workflow by type (CWL, Nextflow, Snakemake)
export const submitWorkflowByType = async (workflowType: 'cwl' | 'nextflow' | 'snakemake', formData: FormData) => {
  try {
    const endpoint = `/api/batch_${workflowType}`;
    const response = await api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error submitting ${workflowType} workflow:`, error);
    throw error;
  }
};

// Submit batch workflow (legacy)
export const submitBatchWorkflow = async (batchData: any) => {
  try {
    const response = await api.post('/api/submit_batch', batchData);
    return response.data;
  } catch (error) {
    console.error('Error submitting batch workflow:', error);
    throw error;
  }
};

// Get workflow logs
export const getWorkflowLogs = async (runId: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/batch_log/${runId}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const logsText = await response.text();
    return logsText;
  } catch (error) {
    console.error(`Error fetching logs for run ${runId}:`, error);
    throw error;
  }
};

export default api;
export const apiClient = api;
