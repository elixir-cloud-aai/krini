import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Settings as SettingsIcon, Save, RefreshCw, User, Database, Bell, Shield, Palette } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const SettingsContainer = styled.div`
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #4b5563;
  font-size: 1rem;
`;

const SettingsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  background: white;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 1rem;
  height: 1rem;
`;

const CheckboxLabel = styled.label`
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const SaveButton = styled.button`
  background: #2563eb;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const ResetButton = styled.button`
  background: #f3f4f6;
  color: #374151;
  padding: 0.75rem 2rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
  }
`;

const ColorPicker = styled.input.attrs({ type: 'color' })`
  width: 3rem;
  height: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
`;

const SuccessMessage = styled.div`
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState({
    // User preferences
    username: localStorage.getItem('username') || '',
    email: localStorage.getItem('email') || '',
    
    // TES Configuration
    defaultTesInstance: localStorage.getItem('defaultTesInstance') || '',
    tesToken: localStorage.getItem('tesToken') || '',
    tesUsername: localStorage.getItem('tesUsername') || '',
    tesPassword: localStorage.getItem('tesPassword') || '',
    
    // Dashboard preferences
    refreshInterval: parseInt(localStorage.getItem('refreshInterval')) || 30,
    theme: localStorage.getItem('theme') || 'light',
    primaryColor: localStorage.getItem('primaryColor') || '#2563eb',
    
    // Notifications
    enableNotifications: localStorage.getItem('enableNotifications') === 'true',
    notifyOnTaskComplete: localStorage.getItem('notifyOnTaskComplete') === 'true',
    notifyOnWorkflowComplete: localStorage.getItem('notifyOnWorkflowComplete') === 'true',
    notifyOnErrors: localStorage.getItem('notifyOnErrors') === 'true',
    
    // Advanced settings
    maxLogLines: parseInt(localStorage.getItem('maxLogLines')) || 1000,
    autoRefreshLogs: localStorage.getItem('autoRefreshLogs') === 'true',
    debugMode: localStorage.getItem('debugMode') === 'true',
    retainLogs: localStorage.getItem('retainLogs') === 'true',
    
    // API Configuration
    apiTimeout: parseInt(localStorage.getItem('apiTimeout')) || 30,
    maxRetries: parseInt(localStorage.getItem('maxRetries')) || 3,
    customHeaders: localStorage.getItem('customHeaders') || ''
  });

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      // Save to localStorage
      Object.entries(settings).forEach(([key, value]) => {
        localStorage.setItem(key, value.toString());
      });

      // Apply theme changes
      if (settings.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
      }

      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      // Clear localStorage
      Object.keys(settings).forEach(key => {
        localStorage.removeItem(key);
      });

      // Reset to default values
      setSettings({
        username: '',
        email: '',
        defaultTesInstance: '',
        tesToken: '',
        tesUsername: '',
        tesPassword: '',
        refreshInterval: 30,
        theme: 'light',
        primaryColor: '#2563eb',
        enableNotifications: false,
        notifyOnTaskComplete: false,
        notifyOnWorkflowComplete: false,
        notifyOnErrors: false,
        maxLogLines: 1000,
        autoRefreshLogs: false,
        debugMode: false,
        retainLogs: false,
        apiTimeout: 30,
        maxRetries: 3,
        customHeaders: ''
      });

      setSuccessMessage('Settings reset to default values!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  useEffect(() => {
    // Apply saved theme on component mount
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    }
  }, [settings.primaryColor]);

  return (
    <SettingsContainer>
      <Header>
        <Title>Settings</Title>
        <Subtitle>Configure your TES dashboard preferences and system settings</Subtitle>
      </Header>

      {error && <ErrorMessage message={error} />}
      {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}

      <SettingsSection>
        <SectionTitle>
          <User size={20} />
          User Preferences
        </SectionTitle>
        
        <FormGroup>
          <Label>Username</Label>
          <Input
            type="text"
            value={settings.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="Enter your username"
          />
        </FormGroup>

        <FormGroup>
          <Label>Email</Label>
          <Input
            type="email"
            value={settings.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email"
          />
        </FormGroup>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle>
          <Database size={20} />
          TES Configuration
        </SectionTitle>
        
        <FormGroup>
          <Label>Default TES Instance URL</Label>
          <Input
            type="url"
            value={settings.defaultTesInstance}
            onChange={(e) => handleInputChange('defaultTesInstance', e.target.value)}
            placeholder="https://tes-instance.example.com"
          />
        </FormGroup>

        <FormGroup>
          <Label>TES Username</Label>
          <Input
            type="text"
            value={settings.tesUsername}
            onChange={(e) => handleInputChange('tesUsername', e.target.value)}
            placeholder="TES username"
          />
        </FormGroup>

        <FormGroup>
          <Label>TES Password</Label>
          <Input
            type="password"
            value={settings.tesPassword}
            onChange={(e) => handleInputChange('tesPassword', e.target.value)}
            placeholder="TES password"
          />
        </FormGroup>

        <FormGroup>
          <Label>TES Token</Label>
          <Input
            type="password"
            value={settings.tesToken}
            onChange={(e) => handleInputChange('tesToken', e.target.value)}
            placeholder="Authentication token"
          />
        </FormGroup>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle>
          <Palette size={20} />
          Dashboard Preferences
        </SectionTitle>
        
        <FormGroup>
          <Label>Refresh Interval (seconds)</Label>
          <Select
            value={settings.refreshInterval}
            onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value))}
          >
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={600}>10 minutes</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Theme</Label>
          <Select
            value={settings.theme}
            onChange={(e) => handleInputChange('theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Primary Color</Label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ColorPicker
              value={settings.primaryColor}
              onChange={(e) => handleInputChange('primaryColor', e.target.value)}
            />
            <Input
              type="text"
              value={settings.primaryColor}
              onChange={(e) => handleInputChange('primaryColor', e.target.value)}
              placeholder="#2563eb"
              style={{ flex: 1 }}
            />
          </div>
        </FormGroup>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle>
          <Bell size={20} />
          Notifications
        </SectionTitle>
        
        <CheckboxGroup>
          <Checkbox
            checked={settings.enableNotifications}
            onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
          />
          <CheckboxLabel>Enable browser notifications</CheckboxLabel>
        </CheckboxGroup>

        <CheckboxGroup>
          <Checkbox
            checked={settings.notifyOnTaskComplete}
            onChange={(e) => handleInputChange('notifyOnTaskComplete', e.target.checked)}
          />
          <CheckboxLabel>Notify when tasks complete</CheckboxLabel>
        </CheckboxGroup>

        <CheckboxGroup>
          <Checkbox
            checked={settings.notifyOnWorkflowComplete}
            onChange={(e) => handleInputChange('notifyOnWorkflowComplete', e.target.checked)}
          />
          <CheckboxLabel>Notify when workflows complete</CheckboxLabel>
        </CheckboxGroup>

        <CheckboxGroup>
          <Checkbox
            checked={settings.notifyOnErrors}
            onChange={(e) => handleInputChange('notifyOnErrors', e.target.checked)}
          />
          <CheckboxLabel>Notify on errors</CheckboxLabel>
        </CheckboxGroup>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle>
          <Shield size={20} />
          Advanced Settings
        </SectionTitle>
        
        <FormGroup>
          <Label>Maximum Log Lines to Display</Label>
          <Input
            type="number"
            value={settings.maxLogLines}
            onChange={(e) => handleInputChange('maxLogLines', parseInt(e.target.value))}
            min="100"
            max="10000"
          />
        </FormGroup>

        <FormGroup>
          <Label>API Timeout (seconds)</Label>
          <Input
            type="number"
            value={settings.apiTimeout}
            onChange={(e) => handleInputChange('apiTimeout', parseInt(e.target.value))}
            min="5"
            max="300"
          />
        </FormGroup>

        <FormGroup>
          <Label>Maximum API Retries</Label>
          <Input
            type="number"
            value={settings.maxRetries}
            onChange={(e) => handleInputChange('maxRetries', parseInt(e.target.value))}
            min="0"
            max="10"
          />
        </FormGroup>

        <FormGroup>
          <Label>Custom API Headers (JSON)</Label>
          <TextArea
            value={settings.customHeaders}
            onChange={(e) => handleInputChange('customHeaders', e.target.value)}
            placeholder='{"Authorization": "Bearer token", "Custom-Header": "value"}'
          />
        </FormGroup>

        <CheckboxGroup>
          <Checkbox
            checked={settings.autoRefreshLogs}
            onChange={(e) => handleInputChange('autoRefreshLogs', e.target.checked)}
          />
          <CheckboxLabel>Auto-refresh logs</CheckboxLabel>
        </CheckboxGroup>

        <CheckboxGroup>
          <Checkbox
            checked={settings.debugMode}
            onChange={(e) => handleInputChange('debugMode', e.target.checked)}
          />
          <CheckboxLabel>Enable debug mode</CheckboxLabel>
        </CheckboxGroup>

        <CheckboxGroup>
          <Checkbox
            checked={settings.retainLogs}
            onChange={(e) => handleInputChange('retainLogs', e.target.checked)}
          />
          <CheckboxLabel>Retain logs locally</CheckboxLabel>
        </CheckboxGroup>
      </SettingsSection>

      <ButtonGroup>
        <ResetButton onClick={handleReset}>
          <RefreshCw size={16} />
          Reset to Defaults
        </ResetButton>
        <SaveButton onClick={handleSave} disabled={loading}>
          {loading ? <LoadingSpinner size={16} /> : <Save size={16} />}
          Save Settings
        </SaveButton>
      </ButtonGroup>
    </SettingsContainer>
  );
};

export default Settings;
