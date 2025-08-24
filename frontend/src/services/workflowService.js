import api from './api';

// Workflow-related API functions
export const workflowService = {
  // Submit a workflow
  submitWorkflow: async (workflowData) => {
    try {
      const formData = new FormData();
      Object.keys(workflowData).forEach(key => {
        if (workflowData[key] instanceof File) {
          formData.append(key, workflowData[key]);
        } else {
          formData.append(key, workflowData[key]);
        }
      });
      
      const response = await api.post('/api/submit_workflow', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting workflow:', error);
      throw error;
    }
  },

  // Get workflow logs
  getWorkflowLogs: async (runId) => {
    try {
      const response = await api.get(`/api/batch_log/${runId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      throw error;
    }
  },

  // Get latest workflow status
  getLatestWorkflowStatus: async () => {
    try {
      const response = await api.get('/api/latest_workflow_status');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest workflow status:', error);
      throw error;
    }
  },

  // Get workflow runs
  getWorkflowRuns: async () => {
    try {
      const response = await api.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      // Return workflow runs from dashboard data
      return dashboardData.workflow_runs || [];
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      throw error;
    }
  }
};

export default workflowService;
