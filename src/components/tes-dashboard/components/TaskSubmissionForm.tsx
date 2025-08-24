import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { X, Send } from 'lucide-react';
import { submitTask, fetchTESInstances } from '../services/api';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Modal = styled.div`
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #666;
  
  &:hover {
    background: #e9ecef;
    color: #333;
  }
`;

const Form = styled.form`
  padding: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
`;

const RequiredMark = styled.span`
  color: #dc3545;
  margin-left: 2px;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const HelpText = styled.small`
  color: #666;
  font-size: 12px;
  margin-top: 4px;
  display: block;
`;

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.2s;
  
  ${props => props.variant === 'primary' ? `
    background: #007bff;
    color: white;
    border: none;
    
    &:hover {
      background: #0056b3;
    }
  ` : `
    background: #6c757d;
    color: white;
    border: none;
    
    &:hover {
      background: #545b62;
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface TaskSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (task: any) => void;
}

const TaskSubmissionForm: React.FC<TaskSubmissionFormProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess
}) => {
  const [tesInstances, setTesInstances] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    tesInstance: '',
    taskName: '',
    dockerImage: 'ubuntu:20.04',
    command: "echo 'Hello World'",
    inputUrl: '',
    outputUrl: '',
    cpuCores: '1',
    ramGb: '2',
    diskGb: '10',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadTESInstances();
    }
  }, [isOpen]);

  const loadTESInstances = async () => {
    try {
      const instances = await fetchTESInstances();
      setTesInstances(instances);
    } catch (error) {
      console.error('Failed to load TES instances:', error);
      setError('Failed to load TES instances');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Create FormData object as backend expects form data
      const submitData = new FormData();
      submitData.append('task_name', formData.taskName || 'Untitled Task');
      submitData.append('tes_url', formData.tesInstance);
      submitData.append('description', formData.description || `Task: ${formData.taskName || 'Untitled Task'}`);
      
      // Optional fields
      if (formData.dockerImage) {
        submitData.append('docker_image', formData.dockerImage);
      }
      if (formData.command) {
        submitData.append('command', formData.command);
      }
      if (formData.inputUrl) {
        submitData.append('input_url', formData.inputUrl);
      }
      if (formData.outputUrl) {
        submitData.append('output_url', formData.outputUrl);
      }
      
      // Resource specifications
      submitData.append('cpu_cores', formData.cpuCores);
      submitData.append('ram_gb', formData.ramGb);
      submitData.append('disk_gb', formData.diskGb);

      const result = await submitTask(submitData);
      console.log('Task submitted successfully:', result);
      
      // Pass the result to the parent component for display
      if (onSubmitSuccess) {
        onSubmitSuccess({
          task_id: result.task_id,
          task_name: result.task_name || formData.taskName,
          tes_url: result.tes_url || formData.tesInstance,
          state: result.state || 'SUBMITTED'
        });
      }
      
      onClose();
      
      // Reset form
      setFormData({
        tesInstance: '',
        taskName: '',
        dockerImage: 'ubuntu:20.04',
        command: "echo 'Hello World'",
        inputUrl: '',
        outputUrl: '',
        cpuCores: '1',
        ramGb: '2',
        diskGb: '10',
        description: ''
      });
      
    } catch (error) {
      console.error('Task submission failed:', error);
      let errorMessage = 'Failed to submit task. Please check your inputs and try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.response?.data?.error) {
          errorMessage = errorObj.response.data.error;
        } else if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Submit New Task</Title>
          <CloseButton onClick={onClose} type="button">
            <X size={20} />
          </CloseButton>
        </Header>

        <Form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              background: '#f8d7da', 
              color: '#721c24', 
              padding: '10px', 
              borderRadius: '4px', 
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          <FormGroup>
            <Label>
              TES Instance <RequiredMark>*</RequiredMark>
            </Label>
            <Select
              name="tesInstance"
              value={formData.tesInstance}
              onChange={handleInputChange}
              required
            >
              <option value="">Select TES Instance</option>
              {tesInstances.map((instance: any) => (
                <option key={instance.url} value={instance.url}>
                  {instance.name} ({instance.url})
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Task Name</Label>
            <Input
              type="text"
              name="taskName"
              value={formData.taskName}
              onChange={handleInputChange}
              placeholder="My awesome task"
            />
          </FormGroup>

          <FormGroup>
            <Label>
              Docker Image
            </Label>
            <Input
              type="text"
              name="dockerImage"
              value={formData.dockerImage}
              onChange={handleInputChange}
            />
            <HelpText>Docker image to run the task (e.g., ubuntu:20.04, python:3.9)</HelpText>
          </FormGroup>

          <FormGroup>
            <Label>Command</Label>
            <TextArea
              name="command"
              value={formData.command}
              onChange={handleInputChange}
              placeholder="echo 'Hello World'"
            />
            <HelpText>Command to execute in the container</HelpText>
          </FormGroup>

          <FormGroup>
            <Label>Input URL</Label>
            <Input
              type="url"
              name="inputUrl"
              value={formData.inputUrl}
              onChange={handleInputChange}
              placeholder="ftp://example.com/input.txt"
            />
            <HelpText>URL to input files (optional)</HelpText>
          </FormGroup>

          <FormGroup>
            <Label>Output URL</Label>
            <Input
              type="url"
              name="outputUrl"
              value={formData.outputUrl}
              onChange={handleInputChange}
              placeholder="ftp://example.com/output/"
            />
            <HelpText>URL where outputs should be stored (optional)</HelpText>
          </FormGroup>

          <ResourceGrid>
            <FormGroup>
              <Label>CPU Cores</Label>
              <Input
                type="number"
                name="cpuCores"
                value={formData.cpuCores}
                onChange={handleInputChange}
                min="1"
                max="32"
              />
            </FormGroup>

            <FormGroup>
              <Label>RAM (GB)</Label>
              <Input
                type="number"
                name="ramGb"
                value={formData.ramGb}
                onChange={handleInputChange}
                min="1"
                max="128"
              />
            </FormGroup>

            <FormGroup>
              <Label>Disk (GB)</Label>
              <Input
                type="number"
                name="diskGb"
                value={formData.diskGb}
                onChange={handleInputChange}
                min="1"
                max="1000"
              />
            </FormGroup>
          </ResourceGrid>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Task description..."
            />
          </FormGroup>

          <ButtonGroup>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              <Send size={16} />
              {isSubmitting ? 'Submitting...' : 'Submit Task'}
            </Button>
          </ButtonGroup>
        </Form>
      </Modal>
    </Overlay>
  );
};

export default TaskSubmissionForm;
