import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  User, 
  Shield, 
  Monitor, 
  Bell, 
  Database, 
  Network, 
  Palette, 
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  color: #7f8c8d;
  margin: 0;
  font-size: 1.1rem;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const Sidebar = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 2rem;
`;

const SidebarTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const NavItem = styled.button<{ active?: boolean }>`
  width: 100%;
  text-align: left;
  padding: 0.75rem;
  border: none;
  background: ${props => props.active ? '#e3f2fd' : 'transparent'};
  color: ${props => props.active ? '#1976d2' : '#666'};
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#e3f2fd' : '#f5f5f5'};
  }
`;

const ContentArea = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 600px;
`;

const SectionHeader = styled.div`
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid #e9ecef;
`;

const SectionTitle = styled.h2`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SectionDescription = styled.p`
  color: #7f8c8d;
  margin: 0;
  font-size: 1rem;
`;

const SectionContent = styled.div`
  padding: 2rem;
`;

const SettingGroup = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingLabel = styled.label`
  display: block;
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
`;

const SettingDescription = styled.p`
  color: #7f8c8d;
  font-size: 0.85rem;
  margin: 0 0 1rem 0;
  line-height: 1.4;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
`;

const ToggleSwitch = styled.div<{ checked: boolean }>`
  position: relative;
  width: 50px;
  height: 26px;
  background: ${props => props.checked ? '#27ae60' : '#bdc3c7'};
  border-radius: 13px;
  cursor: pointer;
  transition: background 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.checked ? '26px' : '2px'};
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 11px;
    transition: left 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e9ecef;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3498db;
          color: white;
          &:hover { background: #2980b9; }
        `;
      case 'danger':
        return `
          background: #e74c3c;
          color: white;
          &:hover { background: #c0392b; }
        `;
      default:
        return `
          background: #95a5a6;
          color: white;
          &:hover { background: #7f8c8d; }
        `;
    }
  }}
`;

const AlertBox = styled.div<{ type: 'success' | 'warning' | 'info' }>`
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;

  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        `;
      case 'warning':
        return `
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        `;
      default:
        return `
          background: #cce7ff;
          color: #004085;
          border: 1px solid #b8daff;
        `;
    }
  }}
`;

const FileUploadArea = styled.div`
  border: 2px dashed #ddd;
  border-radius: 6px;
  padding: 2rem;
  text-align: center;
  color: #7f8c8d;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3498db;
    background: #f8f9fa;
  }
`;

interface SettingsData {
  // User Preferences
  username: string;
  email: string;
  timezone: string;
  language: string;
  
  // Dashboard Settings
  autoRefresh: boolean;
  refreshInterval: number;
  defaultView: string;
  itemsPerPage: number;
  
  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  systemAlerts: boolean;
  maintenanceAlerts: boolean;
  
  // Security
  sessionTimeout: number;
  twoFactorAuth: boolean;
  apiKeyExpiry: number;
  
  // System
  debugMode: boolean;
  logLevel: string;
  maxLogSize: number;
  backupFrequency: string;
  
  // Network
  connectionTimeout: number;
  retryAttempts: number;
  apiEndpoint: string;
}

const defaultSettings: SettingsData = {
  username: 'admin',
  email: 'admin@example.com',
  timezone: 'UTC',
  language: 'en',
  autoRefresh: true,
  refreshInterval: 30,
  defaultView: 'dashboard',
  itemsPerPage: 50,
  emailNotifications: true,
  pushNotifications: false,
  systemAlerts: true,
  maintenanceAlerts: true,
  sessionTimeout: 120,
  twoFactorAuth: false,
  apiKeyExpiry: 365,
  debugMode: false,
  logLevel: 'info',
  maxLogSize: 100,
  backupFrequency: 'weekly',
  connectionTimeout: 30,
  retryAttempts: 3,
  apiEndpoint: 'http://localhost:8080'
};

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('user');
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('tesSettings');
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  const updateSetting = (key: keyof SettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      localStorage.setItem('tesSettings', JSON.stringify(settings));
      setHasChanges(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 1000);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const sections = [
    { id: 'user', label: 'User Profile', icon: User },
    { id: 'dashboard', label: 'Dashboard', icon: Monitor },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: Database },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data', label: 'Data Management', icon: Download }
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'user':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <User size={24} />
                User Profile
              </SectionTitle>
              <SectionDescription>
                Manage your personal information and account preferences.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <SettingGroup>
                <SettingLabel>Username</SettingLabel>
                <SettingDescription>Your unique identifier in the system</SettingDescription>
                <Input
                  type="text"
                  value={settings.username}
                  onChange={e => updateSetting('username', e.target.value)}
                />
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Email Address</SettingLabel>
                <SettingDescription>Used for notifications and account recovery</SettingDescription>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={e => updateSetting('email', e.target.value)}
                />
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Timezone</SettingLabel>
                <SettingDescription>Select your local timezone for accurate timestamps</SettingDescription>
                <Select
                  value={settings.timezone}
                  onChange={e => updateSetting('timezone', e.target.value)}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </Select>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Language</SettingLabel>
                <SettingDescription>Choose your preferred interface language</SettingDescription>
                <Select
                  value={settings.language}
                  onChange={e => updateSetting('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                </Select>
              </SettingGroup>
            </SectionContent>
          </>
        );

      case 'dashboard':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <Monitor size={24} />
                Dashboard Settings
              </SectionTitle>
              <SectionDescription>
                Customize your dashboard appearance and behavior.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <SettingGroup>
                <SettingLabel>Auto Refresh</SettingLabel>
                <SettingDescription>Automatically refresh dashboard data</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch
                    checked={settings.autoRefresh}
                    onClick={() => updateSetting('autoRefresh', !settings.autoRefresh)}
                  />
                  <span>{settings.autoRefresh ? 'Enabled' : 'Disabled'}</span>
                </ToggleContainer>
              </SettingGroup>
              {settings.autoRefresh && (
                <SettingGroup>
                  <SettingLabel>Refresh Interval (seconds)</SettingLabel>
                  <SettingDescription>How often to refresh data automatically</SettingDescription>
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.refreshInterval}
                    onChange={e => updateSetting('refreshInterval', parseInt(e.target.value))}
                  />
                </SettingGroup>
              )}
              <SettingGroup>
                <SettingLabel>Default View</SettingLabel>
                <SettingDescription>Page to show when opening the dashboard</SettingDescription>
                <Select
                  value={settings.defaultView}
                  onChange={e => updateSetting('defaultView', e.target.value)}
                >
                  <option value="dashboard">Main Dashboard</option>
                  <option value="tasks">Tasks</option>
                  <option value="workflows">Workflows</option>
                  <option value="status">System Status</option>
                  <option value="topology">Network Topology</option>
                </Select>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Items Per Page</SettingLabel>
                <SettingDescription>Number of items to display in lists and tables</SettingDescription>
                <Select
                  value={settings.itemsPerPage}
                  onChange={e => updateSetting('itemsPerPage', parseInt(e.target.value))}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </Select>
              </SettingGroup>
            </SectionContent>
          </>
        );

      case 'notifications':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <Bell size={24} />
                Notification Settings
              </SectionTitle>
              <SectionDescription>
                Configure how and when you receive notifications.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <SettingGroup>
                <SettingLabel>Email Notifications</SettingLabel>
                <SettingDescription>Receive notifications via email</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch
                    checked={settings.emailNotifications}
                    onClick={() => updateSetting('emailNotifications', !settings.emailNotifications)}
                  />
                  <span>{settings.emailNotifications ? 'Enabled' : 'Disabled'}</span>
                </ToggleContainer>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Push Notifications</SettingLabel>
                <SettingDescription>Receive browser push notifications</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch
                    checked={settings.pushNotifications}
                    onClick={() => updateSetting('pushNotifications', !settings.pushNotifications)}
                  />
                  <span>{settings.pushNotifications ? 'Enabled' : 'Disabled'}</span>
                </ToggleContainer>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>System Alerts</SettingLabel>
                <SettingDescription>Get notified about system status changes</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch
                    checked={settings.systemAlerts}
                    onClick={() => updateSetting('systemAlerts', !settings.systemAlerts)}
                  />
                  <span>{settings.systemAlerts ? 'Enabled' : 'Disabled'}</span>
                </ToggleContainer>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Maintenance Alerts</SettingLabel>
                <SettingDescription>Receive alerts about scheduled maintenance</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch
                    checked={settings.maintenanceAlerts}
                    onClick={() => updateSetting('maintenanceAlerts', !settings.maintenanceAlerts)}
                  />
                  <span>{settings.maintenanceAlerts ? 'Enabled' : 'Disabled'}</span>
                </ToggleContainer>
              </SettingGroup>
            </SectionContent>
          </>
        );

      case 'security':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <Shield size={24} />
                Security Settings
              </SectionTitle>
              <SectionDescription>
                Manage your account security and access controls.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <AlertBox type="info">
                <Info size={20} />
                Security settings help protect your account and data.
              </AlertBox>
              <SettingGroup>
                <SettingLabel>Session Timeout (minutes)</SettingLabel>
                <SettingDescription>Automatically log out after inactivity</SettingDescription>
                <Input
                  type="number"
                  min="15"
                  max="480"
                  value={settings.sessionTimeout}
                  onChange={e => updateSetting('sessionTimeout', parseInt(e.target.value))}
                />
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Two-Factor Authentication</SettingLabel>
                <SettingDescription>Add an extra layer of security to your account</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch
                    checked={settings.twoFactorAuth}
                    onClick={() => updateSetting('twoFactorAuth', !settings.twoFactorAuth)}
                  />
                  <span>{settings.twoFactorAuth ? 'Enabled' : 'Disabled'}</span>
                </ToggleContainer>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>API Key Expiry (days)</SettingLabel>
                <SettingDescription>How long API keys remain valid</SettingDescription>
                <Select
                  value={settings.apiKeyExpiry}
                  onChange={e => updateSetting('apiKeyExpiry', parseInt(e.target.value))}
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                  <option value={0}>Never expire</option>
                </Select>
              </SettingGroup>
            </SectionContent>
          </>
        );

      case 'system':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <Database size={24} />
                System Settings
              </SectionTitle>
              <SectionDescription>
                Configure system behavior and logging preferences.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <AlertBox type="warning">
                <AlertTriangle size={20} />
                System settings affect performance and storage. Change with caution.
              </AlertBox>
              <SettingGroup>
                <SettingLabel>Debug Mode</SettingLabel>
                <SettingDescription>Enable detailed logging for troubleshooting</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch
                    checked={settings.debugMode}
                    onClick={() => updateSetting('debugMode', !settings.debugMode)}
                  />
                  <span>{settings.debugMode ? 'Enabled' : 'Disabled'}</span>
                </ToggleContainer>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Log Level</SettingLabel>
                <SettingDescription>Minimum severity level for logged messages</SettingDescription>
                <Select
                  value={settings.logLevel}
                  onChange={e => updateSetting('logLevel', e.target.value)}
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="fatal">Fatal</option>
                </Select>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Maximum Log Size (MB)</SettingLabel>
                <SettingDescription>Maximum size for log files before rotation</SettingDescription>
                <Input
                  type="number"
                  min="10"
                  max="1000"
                  value={settings.maxLogSize}
                  onChange={e => updateSetting('maxLogSize', parseInt(e.target.value))}
                />
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Backup Frequency</SettingLabel>
                <SettingDescription>How often to create system backups</SettingDescription>
                <Select
                  value={settings.backupFrequency}
                  onChange={e => updateSetting('backupFrequency', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="manual">Manual only</option>
                </Select>
              </SettingGroup>
            </SectionContent>
          </>
        );

      case 'network':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <Network size={24} />
                Network Settings
              </SectionTitle>
              <SectionDescription>
                Configure network connections and API endpoints.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <SettingGroup>
                <SettingLabel>API Endpoint</SettingLabel>
                <SettingDescription>Base URL for TES API communications</SettingDescription>
                <Input
                  type="url"
                  value={settings.apiEndpoint}
                  onChange={e => updateSetting('apiEndpoint', e.target.value)}
                />
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Connection Timeout (seconds)</SettingLabel>
                <SettingDescription>Maximum time to wait for API responses</SettingDescription>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.connectionTimeout}
                  onChange={e => updateSetting('connectionTimeout', parseInt(e.target.value))}
                />
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Retry Attempts</SettingLabel>
                <SettingDescription>Number of times to retry failed requests</SettingDescription>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.retryAttempts}
                  onChange={e => updateSetting('retryAttempts', parseInt(e.target.value))}
                />
              </SettingGroup>
            </SectionContent>
          </>
        );

      case 'appearance':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <Palette size={24} />
                Appearance Settings
              </SectionTitle>
              <SectionDescription>
                Customize the look and feel of your dashboard.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <AlertBox type="info">
                <Info size={20} />
                Appearance changes will take effect immediately.
              </AlertBox>
              <SettingGroup>
                <SettingLabel>Theme</SettingLabel>
                <SettingDescription>Choose your preferred color theme</SettingDescription>
                <Select defaultValue="light">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </Select>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Sidebar</SettingLabel>
                <SettingDescription>Sidebar display preferences</SettingDescription>
                <Select defaultValue="expanded">
                  <option value="expanded">Always Expanded</option>
                  <option value="collapsed">Always Collapsed</option>
                  <option value="auto">Auto Hide</option>
                </Select>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Animation</SettingLabel>
                <SettingDescription>Enable smooth transitions and animations</SettingDescription>
                <ToggleContainer>
                  <ToggleSwitch checked={true} onClick={() => {}} />
                  <span>Enabled</span>
                </ToggleContainer>
              </SettingGroup>
            </SectionContent>
          </>
        );

      case 'data':
        return (
          <>
            <SectionHeader>
              <SectionTitle>
                <Download size={24} />
                Data Management
              </SectionTitle>
              <SectionDescription>
                Import, export, and manage your dashboard data.
              </SectionDescription>
            </SectionHeader>
            <SectionContent>
              <SettingGroup>
                <SettingLabel>Export Settings</SettingLabel>
                <SettingDescription>Download your current settings as a backup</SettingDescription>
                <Button variant="secondary">
                  <Download size={16} />
                  Export Configuration
                </Button>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Import Settings</SettingLabel>
                <SettingDescription>Upload a configuration file to restore settings</SettingDescription>
                <FileUploadArea>
                  <Upload size={24} />
                  <p>Drop configuration file here or click to browse</p>
                  <small>Supported formats: JSON</small>
                </FileUploadArea>
              </SettingGroup>
              <SettingGroup>
                <SettingLabel>Reset to Defaults</SettingLabel>
                <SettingDescription>Restore all settings to their default values</SettingDescription>
                <Button variant="danger" onClick={handleReset}>
                  <Trash2 size={16} />
                  Reset All Settings
                </Button>
              </SettingGroup>
            </SectionContent>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <Settings size={28} />
          Settings
        </Title>
        <Subtitle>
          Configure your TES dashboard preferences and system settings
        </Subtitle>
      </Header>

      {saveStatus === 'success' && (
        <AlertBox type="success">
          <CheckCircle size={20} />
          Settings saved successfully!
        </AlertBox>
      )}

      <SettingsGrid>
        <Sidebar>
          <SidebarTitle>Categories</SidebarTitle>
          {sections.map(section => {
            const IconComponent = section.icon;
            return (
              <NavItem
                key={section.id}
                active={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                <IconComponent size={16} />
                {section.label}
              </NavItem>
            );
          })}
        </Sidebar>

        <ContentArea>
          {renderSectionContent()}
          
          <div style={{ padding: '0 2rem 2rem 2rem' }}>
            <ButtonGroup>
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={!hasChanges || saveStatus === 'saving'}
              >
                <Save size={16} />
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button onClick={handleReset}>
                <RotateCcw size={16} />
                Reset to Defaults
              </Button>
            </ButtonGroup>
          </div>
        </ContentArea>
      </SettingsGrid>
    </Container>
  );
};

export default SettingsPage;
