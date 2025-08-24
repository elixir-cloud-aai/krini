import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { fetchDashboardData, testConnection } from '../services/api';
import { taskService } from '../services/taskService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { ArrowLeft, Play } from 'lucide-react';

const PageContainer = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  min-height: calc(100vh - 80px);
`;

const BackButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 20px;
  
  &:hover {
    background: #5a6268;
  }
`;

const FormCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  max-width: 800px;
`;

const Title = styled.h1`
  margin: 0 0 30px 0;
  font-size: 28px;
  color: #333;
  font-weight: 600;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 30px;
`;

const Button = styled.button`
  background: ${props => props.variant === 'primary' ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HelpText = styled.small`
  color: #6c757d;
  font-size: 12px;
  margin-top: 4px;
  display: block;
`;

const SubmitTask = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tes_instance: '',
    task_name: '',
    docker_image: '',
    command: '',
    input_url: '',
    output_url: '',
    cpu_cores: '1',
    ram_gb: '2',
    disk_gb: '10',
    description: ''
  });
  const [tesInstances, setTesInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadTesInstances();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setError(null);
      
      console.log('Testing connection to backend...');
      
      // Test with fetch first
      const fetchResponse = await fetch('http://localhost:8080/api/test_connection', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Origin': 'http://localhost:3000'
        }
      });
      
      console.log('Fetch response status:', fetchResponse.status);
      const fetchData = await fetchResponse.json();
      console.log('Fetch data:', fetchData);
      
      // Then test with axios (our normal method)
      const result = await testConnection();
      console.log('Axios result:', result);
      
      alert(`Connection Test SUCCESS: ${result.message} (${result.timestamp})`);
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(new Error(`Connection test failed: ${err.message}`));
    } finally {
      setTestingConnection(false);
    }
  };

  const loadTesInstances = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardData();
      setTesInstances(data.tes_instances || []);
      // Don't auto-select the first instance, let user choose
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tes_instance || !formData.docker_image) {
      setError(new Error('TES instance and Docker image are required'));
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const submitData = {
        tes_instance: formData.tes_instance,
        task_type: 'custom', // Set to custom for user-defined tasks
        task_name: formData.task_name,
        docker_image: formData.docker_image,
        command: formData.command,
        input_url: formData.input_url,
        output_url: formData.output_url,
        cpu_cores: formData.cpu_cores,
        ram_gb: formData.ram_gb,
        disk_gb: formData.disk_gb,
        description: formData.description
      };
      
      console.log('Submitting task with data:', submitData);
      
      const result = await taskService.submitTask(submitData);
      
      console.log('Task submission result:', result);
      
      // Success - show success message and redirect to tasks page
      if (result && result.message) {
        alert(`Success: ${result.message}`);
      } else {
        alert('Task submitted successfully!');
      }
      navigate('/tasks');
    } catch (err) {
      console.error('Task submission error:', err);
      
      // Extract error message from response
      let errorMessage = 'Failed to submit task';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(new Error(errorMessage));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner text="Loading TES instances..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton onClick={() => navigate('/tasks')}>
        <ArrowLeft size={16} style={{ marginRight: '8px' }} />
        Back to Tasks
      </BackButton>

      <FormCard>
        <Title>Submit New Task</Title>
        
        {error && <ErrorMessage error={error} />}
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="tes_instance">TES Instance *</Label>
            <Select
              id="tes_instance"
              name="tes_instance"
              value={formData.tes_instance}
              onChange={handleChange}
              required
            >
              <option value="">Select TES Instance</option>
              {tesInstances.map((instance, index) => (
                <option key={index} value={instance.url}>
                  {instance.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="task_name">Task Name</Label>
            <Input
              id="task_name"
              name="task_name"
              type="text"
              value={formData.task_name}
              onChange={handleChange}
              placeholder="My awesome task"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="docker_image">Docker Image *</Label>
            <Input
              id="docker_image"
              name="docker_image"
              type="text"
              value={formData.docker_image}
              onChange={handleChange}
              placeholder="ubuntu:20.04"
              required
            />
            <HelpText>Docker image to run the task (e.g., ubuntu:20.04, python:3.9)</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="command">Command</Label>
            <TextArea
              id="command"
              name="command"
              value={formData.command}
              onChange={handleChange}
              placeholder="echo 'Hello World'"
            />
            <HelpText>Command to execute in the container</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="input_url">Input URL</Label>
            <Input
              id="input_url"
              name="input_url"
              type="url"
              value={formData.input_url}
              onChange={handleChange}
              placeholder="ftp://example.com/input.txt"
            />
            <HelpText>URL to input files (optional)</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="output_url">Output URL</Label>
            <Input
              id="output_url"
              name="output_url"
              type="url"
              value={formData.output_url}
              onChange={handleChange}
              placeholder="ftp://example.com/output/"
            />
            <HelpText>URL where outputs should be stored (optional)</HelpText>
          </FormGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <FormGroup>
              <Label htmlFor="cpu_cores">CPU Cores</Label>
              <Input
                id="cpu_cores"
                name="cpu_cores"
                type="number"
                min="1"
                max="32"
                value={formData.cpu_cores}
                onChange={handleChange}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="ram_gb">RAM (GB)</Label>
              <Input
                id="ram_gb"
                name="ram_gb"
                type="number"
                min="1"
                max="128"
                value={formData.ram_gb}
                onChange={handleChange}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="disk_gb">Disk (GB)</Label>
              <Input
                id="disk_gb"
                name="disk_gb"
                type="number"
                min="1"
                max="1000"
                value={formData.disk_gb}
                onChange={handleChange}
              />
            </FormGroup>
          </div>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <TextArea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Task description..."
            />
          </FormGroup>

          <ButtonGroup>
            <Button type="button" onClick={handleTestConnection} disabled={testingConnection}>
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            
            <Button type="submit" variant="primary" disabled={submitting}>
              <Play size={16} style={{ marginRight: '8px' }} />
              {submitting ? 'Submitting...' : 'Submit Task'}
            </Button>
            
            <Button type="button" onClick={() => navigate('/tasks')}>
              Cancel
            </Button>
          </ButtonGroup>
        </form>
      </FormCard>
    </PageContainer>
  );
};

export default SubmitTask;
