import api from './api';

// Batch processing API functions
export const batchService = {
  // Submit Snakemake batch
  submitSnakemakeBatch: async (batchData) => {
    try {
      const formData = new FormData();
      
      // Map camelCase to snake_case for backend compatibility
      formData.append('batch_mode', batchData.batchMode);
      if (batchData.snakefile) {
        formData.append('snakefile', batchData.snakefile);
      }
      if (batchData.smkDir) {
        formData.append('smk_dir', batchData.smkDir);
      }
      
      const response = await api.post('/api/batch_snakemake', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting Snakemake batch:', error);
      throw error;
    }
  },

  // Submit Nextflow batch
  submitNextflowBatch: async (batchData) => {
    try {
      const formData = new FormData();
      
      // Map camelCase to snake_case for backend compatibility
      formData.append('batch_mode', batchData.batchMode);
      if (batchData.nextflowFile) {
        formData.append('nextflow_file', batchData.nextflowFile);
      }
      if (batchData.nextflowConfig) {
        formData.append('nextflow_config', batchData.nextflowConfig);
      }
      formData.append('nextflow_params', batchData.nextflowParams || '{}');
      
      const response = await api.post('/api/batch_nextflow', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting Nextflow batch:', error);
      throw error;
    }
  },

  // Submit CWL batch
  submitCwlBatch: async (batchData) => {
    try {
      const formData = new FormData();
      
      // Map camelCase to snake_case for backend compatibility
      formData.append('batch_mode', batchData.batchMode);
      if (batchData.cwlFile) {
        formData.append('cwl_file', batchData.cwlFile);
      }
      if (batchData.inputsFile) {
        formData.append('inputs_file', batchData.inputsFile);
      }
      
      const response = await api.post('/api/batch_cwl', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting CWL batch:', error);
      throw error;
    }
  },

  // Get batch logs
  getBatchLogs: async (runId) => {
    try {
      const response = await api.get(`/api/batch_log/${runId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching batch logs:', error);
      throw error;
    }
  },

  // Get batch log (singular) - alias for compatibility
  getBatchLog: async (runId) => {
    try {
      const response = await api.get(`/api/batch_log/${runId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching batch log:', error);
      throw error;
    }
  },

  // Get all batch runs
  getBatchRuns: async () => {
    try {
      const response = await api.get('/api/batch_runs');
      return response.data;
    } catch (error) {
      console.error('Error fetching batch runs:', error);
      throw error;
    }
  }
};

export default batchService;
