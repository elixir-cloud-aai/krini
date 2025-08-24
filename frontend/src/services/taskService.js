import api from './api';

// Task-related API functions
export const taskService = {
  // Get task details
  getTaskDetails: async (tesUrl, taskId) => {
    try {
      const response = await api.get('/task_details', {
        params: { tes_url: tesUrl, task_id: taskId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching task details:', error);
      throw error;
    }
  },

  // Submit a new task
  submitTask: async (taskData) => {
    try {
      console.log('TaskService: Submitting task with data:', taskData);
      
      const formData = new FormData();
      Object.keys(taskData).forEach(key => {
        formData.append(key, taskData[key]);
        console.log(`TaskService: Added ${key} = ${taskData[key]}`);
      });
      
      console.log('TaskService: Making POST request to /submit');
      
      const response = await api.post('/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
      });
      
      console.log('TaskService: Success response:', response.data);
      return response.data;
    } catch (error) {
      console.error('TaskService: Error submitting task:', error);
      console.error('TaskService: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      throw error;
    }
  },

  // Cancel a task
  cancelTask: async (tesUrl, taskId) => {
    try {
      const formData = new FormData();
      formData.append('tes_url', tesUrl);
      formData.append('task_id', taskId);
      
      const response = await api.post('/cancel_task', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error canceling task:', error);
      throw error;
    }
  },

  // List all tasks
  listTasks: async () => {
    try {
      // Get tasks from dashboard data which includes submitted_tasks
      const response = await api.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      console.log('TaskService: Dashboard data received:', dashboardData);
      
      // Get tasks and transform them to match frontend expectations
      const backendTasks = dashboardData.tasks || [];
      console.log('TaskService: Raw backend tasks:', backendTasks);
      
      // Transform backend task format to frontend format
      const tasks = backendTasks.map(task => ({
        id: task.task_id,
        name: task.task_name || task.tes_name || 'Custom Task',
        state: task.status || 'UNKNOWN',
        tes_url: task.tes_url,
        type: task.type,
        creation_time: task.creation_time || new Date().toISOString(),
        end_time: task.end_time,
        // Add any additional fields that might be useful
        tes_name: task.tes_name,
        task_name: task.task_name
      }));
      
      console.log('TaskService: Transformed tasks:', tasks);
      
      return tasks;
    } catch (error) {
      console.error('Error listing tasks:', error);
      throw error;
    }
  },

  // Get task logs
  getTaskLogs: async (taskId) => {
    try {
      const response = await api.get(`/task_log/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task logs:', error);
      throw error;
    }
  },

  // Get service status
  getServiceStatus: async () => {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching service status:', error);
      throw error;
    }
  },

  // Get dashboard data
  getDashboardData: async () => {
    try {
      const response = await api.get('/api/dashboard_data');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
};

export default taskService;
