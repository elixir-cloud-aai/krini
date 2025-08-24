// Service for system status and monitoring
import { apiClient } from './api';

export const statusService = {
  // Get task status
  getTaskStatus: async (tesUrl, taskId) => {
    const response = await apiClient.get('/status', {
      params: { tes_url: tesUrl, task_id: taskId }
    });
    return response.data;
  },

  // List all tasks for a TES instance
  listTasks: async (tesUrl) => {
    const response = await apiClient.get('/list_tasks', {
      params: { tes_url: tesUrl }
    });
    return response.data;
  },

  // Get system topology logs
  getTopologyLogs: async () => {
    const response = await apiClient.get('/api/topology_logs');
    return response.data;
  },

  // Get task logs
  getTaskLogs: async (taskId) => {
    const response = await apiClient.get(`/task_log/${taskId}`);
    return response.data;
  }
};
