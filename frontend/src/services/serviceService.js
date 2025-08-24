import api from './api';

// Service information API functions
export const serviceService = {
  // Get service information
  getServiceInfo: async () => {
    try {
      const response = await api.get('/service_info');
      return response.data;
    } catch (error) {
      console.error('Error fetching service info:', error);
      throw error;
    }
  },

  // Get debug environment info
  getDebugEnv: async () => {
    try {
      const response = await api.get('/debug_env');
      return response.data;
    } catch (error) {
      console.error('Error fetching debug env:', error);
      throw error;
    }
  },

  // Get topology logs
  getTopologyLogs: async () => {
    try {
      const response = await api.get('/api/topology_logs');
      return response.data;
    } catch (error) {
      console.error('Error fetching topology logs:', error);
      throw error;
    }
  }
};

export default serviceService;
