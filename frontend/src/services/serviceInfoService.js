// Service for TES service information
import { apiClient } from './api';

export const serviceInfoService = {
  // Get service info for a TES instance
  getServiceInfo: async (tesUrl) => {
    const response = await apiClient.get('/service_info', {
      params: { tes_url: tesUrl }
    });
    return response.data;
  },

  // Get debug environment info
  getDebugInfo: async () => {
    const response = await apiClient.get('/debug_env');
    return response.data;
  }
};
