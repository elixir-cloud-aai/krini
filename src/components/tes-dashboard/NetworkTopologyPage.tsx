import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/leaflet-custom.css';
import { 
  Server, 
  Activity, 
  RefreshCw, 
  Play, 
  Database, 
  Clock
} from 'lucide-react';
import { usePolling } from './hooks/usePolling';
import { fetchDashboardData } from './services/api';
import { POLLING_INTERVALS } from './utils/constants';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

// Types and Interfaces
interface TooltipData {
  show: boolean;
  x: number;
  y: number;
  type: 'tes' | 'storage' | null;
  data: any;
}

// Styled Components
const PageContainer = styled.div`
  padding: 24px;
  max-width: 100%;
  margin: 0;
  background: #f8f9fa;
  min-height: 100vh;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #2d3748;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  p {
    color: #718096;
    font-size: 16px;
    margin: 8px 0 0 0;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ControlButton = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 2px solid ${props => props.active ? '#4299e1' : '#e2e8f0'};
  border-radius: 8px;
  background: ${props => props.active ? '#ebf8ff' : 'white'};
  color: ${props => props.active ? '#4299e1' : '#4a5568'};
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    border-color: #4299e1;
    color: #4299e1;
    background: #ebf8ff;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 24px;
  height: calc(100vh - 200px);
`;

const MapWrapper = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
`;

const MapView = styled.div`
  width: 100%;
  height: 100%;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
  
  .leaflet-container {
    width: 100%;
    height: 100%;
    z-index: 1;
  }
  
  .leaflet-popup-content-wrapper {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .leaflet-popup-content {
    margin: 12px 16px;
    line-height: 1.4;
  }
`;

const Sidebar = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #2d3748;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #718096;
  }
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e2e8f0;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: ${props => props.active ? '#f7fafc' : 'transparent'};
  color: ${props => props.active ? '#4299e1' : '#718096'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid ${props => props.active ? '#4299e1' : 'transparent'};
  
  &:hover {
    background: #f7fafc;
    color: #4299e1;
  }
`;

const TabContent = styled.div`
  padding: 20px;
`;

const InstanceCard = styled.div<{ selected?: boolean }>`
  background: ${props => props.selected ? '#ebf8ff' : '#f7fafc'};
  border: 2px solid ${props => props.selected ? '#4299e1' : '#e2e8f0'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #4299e1;
    background: #ebf8ff;
  }
`;

const InstanceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const InstanceName = styled.h4`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusBadge = styled.span<{ status: 'healthy' | 'unhealthy' | 'processing' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status) {
      case 'healthy':
        return 'background: #c6f6d5; color: #22543d;';
      case 'processing':
        return 'background: #fed7aa; color: #9c4221;';
      case 'unhealthy':
        return 'background: #fed7d7; color: #742a2a;';
      default:
        return 'background: #e2e8f0; color: #4a5568;';
    }
  }}
`;

const InstanceDetails = styled.div`
  font-size: 14px;
  color: #718096;
  line-height: 1.5;
  
  div {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }
`;

const WorkflowList = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const WorkflowItem = styled.div<{ active?: boolean }>`
  background: ${props => props.active ? '#ebf8ff' : '#f7fafc'};
  border: 1px solid ${props => props.active ? '#4299e1' : '#e2e8f0'};
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #4299e1;
    background: #ebf8ff;
  }
`;

const WorkflowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const WorkflowType = styled.span`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #4299e1;
  background: #ebf8ff;
  padding: 2px 6px;
  border-radius: 4px;
`;

const WorkflowDetails = styled.div`
  font-size: 13px;
  color: #718096;
  
  div {
    margin-bottom: 2px;
  }
`;

const WorkflowStepsSection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
  }
`;

const WorkflowStep = styled.div<{ status: 'pending' | 'running' | 'completed' | 'failed' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding: 4px;
  border-radius: 4px;
  background: ${props => 
    props.status === 'completed' ? '#f0fff4' :
    props.status === 'running' ? '#fef5e7' :
    props.status === 'failed' ? '#fed7d7' : '#f7fafc'
  };
  
  div {
    margin-bottom: 0;
  }
  
  small {
    color: #a0aec0;
    font-size: 11px;
  }
`;

const StepIndicator = styled.div<{ status: 'pending' | 'running' | 'completed' | 'failed' }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  background: ${props => 
    props.status === 'completed' ? '#48bb78' :
    props.status === 'running' ? '#ed8936' :
    props.status === 'failed' ? '#f56565' : '#cbd5e0'
  };
  color: white;
`;

const StorageSection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
  }
`;

const StorageConnection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding: 4px;
  border-radius: 4px;
  background: #f0f4f8;
  
  div {
    margin-bottom: 0;
  }
  
  small {
    color: #a0aec0;
    font-size: 11px;
  }
`;

const Tooltip = styled.div<{ show: boolean; x: number; y: number }>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  max-width: 300px;
  opacity: ${props => props.show ? 1 : 0};
  transform: ${props => props.show ? 'translateY(-10px)' : 'translateY(0px)'};
  transition: all 0.2s ease;
  pointer-events: none;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 20px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid rgba(0, 0, 0, 0.9);
  }
`;

const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  
  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
`;

const TooltipContent = styled.div`
  display: grid;
  gap: 4px;
  
  .metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    
    .label {
      color: #cbd5e0;
    }
    
    .value {
      color: white;
      font-weight: 500;
    }
  }
  
  .status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    
    &.healthy {
      background: rgba(72, 187, 120, 0.2);
      color: #68d391;
    }
    
    &.processing {
      background: rgba(237, 137, 54, 0.2);
      color: #f6ad55;
    }
    
    &.unhealthy {
      background: rgba(245, 101, 101, 0.2);
      color: #fc8181;
    }
  }
  
  .coordinates {
    font-size: 11px;
    color: #a0aec0;
    font-family: monospace;
    margin-top: 4px;
  }
`;

const FilterSection = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
`;

const FilterInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #4299e1;
  }
`;

const Legend = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 200;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #4a5568;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LegendDot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
  border: 2px solid white;
  box-shadow: 0 0 0 2px ${props => props.color};
`;

// Enhanced TES instances with more geographic locations and details
const TES_LOCATIONS = [
  {
    id: 'elixir-cz',
    name: 'TESK Production',
    country: 'Czech Republic',
    status: 'healthy' as const,
    x: 65, // Europe
    y: 35,
    tasks: 15,
    workflows: 8,
    url: 'https://tesk-prod.cloud.e-infra.cz',
    description: 'Primary TESK production instance',
    coordinates: { lat: 49.75, lng: 15.5 },
    capacity: { cpu: 1000, memory: '2TB', storage: '10TB' },
    version: 'v1.1.0'
  },
  {
    id: 'elixir-fi',
    name: 'TESK/OpenShift @ ELIXIR-FI',
    country: 'Finland',
    status: 'processing' as const,
    x: 68,
    y: 25,
    tasks: 12,
    workflows: 5,
    url: 'https://csc-tesk-noauth.rahtiapp.fi/ga4gh/tes',
    description: 'OpenShift-based TESK instance',
    coordinates: { lat: 60.1699, lng: 24.9384 },
    capacity: { cpu: 800, memory: '1.5TB', storage: '8TB' },
    version: 'v1.0.8'
  },
  {
    id: 'elixir-gr',
    name: 'TESK/Kubernetes @ ELIXIR-GR',
    country: 'Greece',
    status: 'healthy' as const,
    x: 70,
    y: 45,
    tasks: 8,
    workflows: 3,
    url: 'https://tesk.c3g.calculquebec.ca',
    description: 'Kubernetes-based TESK instance',
    coordinates: { lat: 37.9838, lng: 23.7275 },
    capacity: { cpu: 600, memory: '1TB', storage: '5TB' },
    version: 'v1.1.2'
  },
  {
    id: 'elixir-ca',
    name: 'TESK North America',
    country: 'Canada',
    status: 'healthy' as const,
    x: 25, // North America
    y: 30,
    tasks: 8,
    workflows: 4,
    url: 'https://tesk-na.cloud.e-infra.cz',
    description: 'North American TESK instance',
    coordinates: { lat: 45.4215, lng: -75.6972 },
    capacity: { cpu: 1200, memory: '2.5TB', storage: '12TB' },
    version: 'v1.1.1'
  },
  {
    id: 'funnel-cz',
    name: 'Funnel/OpenPBS @ ELIXIR-CZ',
    country: 'Czech Republic',
    status: 'healthy' as const,
    x: 64,
    y: 38,
    tasks: 20,
    workflows: 12,
    url: 'https://funnel.cloud.e-infra.cz',
    description: 'Funnel with OpenPBS backend',
    coordinates: { lat: 50.0755, lng: 14.4378 },
    capacity: { cpu: 1500, memory: '3TB', storage: '15TB' },
    version: 'v0.10.1'
  },
  {
    id: 'funnel-fi',
    name: 'Funnel/Slurm @ ELIXIR-FI',
    country: 'Finland',
    status: 'processing' as const,
    x: 67,
    y: 28,
    tasks: 16,
    workflows: 9,
    url: 'https://vm4816.kaj.pouta.csc.fi',
    description: 'Funnel with Slurm backend',
    coordinates: { lat: 61.4978, lng: 23.7610 },
    capacity: { cpu: 900, memory: '1.8TB', storage: '9TB' },
    version: 'v0.10.0'
  },
  {
    id: 'tes-gateway',
    name: 'TES Gateway',
    country: 'Global',
    status: 'healthy' as const,
    x: 50, // Center
    y: 50,
    tasks: 45,
    workflows: 25,
    url: 'https://tes.prodrun.cloud',
    description: 'Central TES Gateway for federated execution',
    coordinates: { lat: 0, lng: 0 },
    capacity: { cpu: 2000, memory: '4TB', storage: '20TB' },
    version: 'v2.0.0'
  },
  {
    id: 'elixir-nl',
    name: 'TESK @ SURF',
    country: 'Netherlands',
    status: 'healthy' as const,
    x: 63,
    y: 33,
    tasks: 10,
    workflows: 6,
    url: 'https://tesk.surf.nl/ga4gh/tes',
    description: 'SURF-hosted TESK instance',
    coordinates: { lat: 52.3667, lng: 4.8945 },
    capacity: { cpu: 700, memory: '1.2TB', storage: '6TB' },
    version: 'v1.0.9'
  },
  {
    id: 'elixir-uk',
    name: 'TESK @ EBI',
    country: 'United Kingdom',
    status: 'processing' as const,
    x: 58,
    y: 32,
    tasks: 14,
    workflows: 7,
    url: 'https://tes.ebi.ac.uk/ga4gh/tes',
    description: 'EBI-hosted TESK instance',
    coordinates: { lat: 52.0799, lng: 0.1827 },
    capacity: { cpu: 1100, memory: '2.2TB', storage: '11TB' },
    version: 'v1.1.0'
  }
];

interface WorkflowExecution {
  id: string;
  type: 'CWL' | 'Nextflow' | 'Snakemake';
  status: 'SUBMITTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  tesInstance: string;
  startTime: Date;
  path: string[];
  currentStep: number;
  totalSteps: number;
  dataSize: string;
  storageLocations: string[];
  executionTime: number;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    duration: number;
    instanceId: string;
  }>;
}

interface StorageLocation {
  id: string;
  name: string;
  type: 'S3' | 'MinIO' | 'HDFS' | 'NFS';
  location: string;
  x: number; // Keep for backward compatibility
  y: number;
  coordinates: { lat: number; lng: number };
  capacity: string;
  usage: number;
}

// Storage locations with accurate geographic coordinates
const STORAGE_LOCATIONS: StorageLocation[] = [
  {
    id: 'storage-eu-central',
    name: 'EU Central Storage',
    type: 'S3',
    location: 'Frankfurt, Germany',
    x: 54.1, // Keep for backward compatibility
    y: 32.5,
    coordinates: { lat: 50.1109, lng: 8.6821 }, // Frankfurt coordinates
    capacity: '500TB',
    usage: 65
  },
  {
    id: 'storage-eu-north',
    name: 'EU North Storage', 
    type: 'MinIO',
    location: 'Stockholm, Sweden',
    x: 58.5,
    y: 24.8,
    coordinates: { lat: 59.3293, lng: 18.0686 }, // Stockholm coordinates
    capacity: '300TB',
    usage: 45
  },
  {
    id: 'storage-na-east',
    name: 'NA East Storage',
    type: 'S3',
    location: 'Virginia, USA',
    x: 28.2,
    y: 45.5,
    coordinates: { lat: 39.0458, lng: -76.6413 }, // Virginia coordinates
    capacity: '800TB',
    usage: 78
  },
  {
    id: 'storage-na-west',
    name: 'NA West Storage',
    type: 'HDFS',
    location: 'California, USA', 
    x: 18.8,
    y: 46.2,
    coordinates: { lat: 37.7749, lng: -122.4194 }, // California coordinates
    capacity: '1.2PB',
    usage: 52
  },
  {
    id: 'storage-global',
    name: 'Global Cache Hub',
    type: 'MinIO',
    location: 'London, UK',
    x: 49.8,
    y: 31.8,
    coordinates: { lat: 51.5074, lng: -0.1278 }, // London coordinates
    capacity: '2PB',
    usage: 34
  }
];

const NetworkTopologyPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'instances' | 'workflows' | 'analytics'>('instances');
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [showWorkflowPaths, setShowWorkflowPaths] = useState(true);
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [tooltip, _setTooltip] = useState<TooltipData>({
    show: false,
    x: 0,
    y: 0,
    type: null,
    data: null
  });

  const { data: dashboardData, loading, error: fetchError, refetch } = usePolling(
    fetchDashboardData,
    isRealTimeMode ? 2000 : POLLING_INTERVALS.DASHBOARD
  );

  // Simulate real-time workflow executions
  useEffect(() => {
    if (!dashboardData?.batch_runs) return;

    const executions: WorkflowExecution[] = dashboardData.batch_runs.slice(0, 10).map((run: any, index: number) => ({
      id: run.run_id || `workflow-${index}`,
      type: (run.workflow_type || 'Nextflow').toUpperCase() as 'CWL' | 'Nextflow' | 'Snakemake',
      status: index < 3 ? 'RUNNING' : run.status || 'SUBMITTED', // Force first 3 to be RUNNING
      tesInstance: run.tes_instance_name || 'TES Gateway',
      startTime: new Date(run.submitted_at || Date.now()),
      path: generateWorkflowPath(run.mode || run.batch_mode || 'gateway'),
      currentStep: Math.floor(Math.random() * 5) + 1,
      totalSteps: Math.floor(Math.random() * 8) + 5,
      dataSize: ['1.2GB', '850MB', '2.8GB', '450MB', '3.4GB'][index % 5],
      storageLocations: generateStorageLocations(index),
      executionTime: Math.floor(Math.random() * 120),
      steps: generateWorkflowSteps(run.workflow_type || 'Nextflow', index < 3 ? 'RUNNING' : run.status || 'SUBMITTED')
    }));

    setWorkflowExecutions(executions);
  }, [dashboardData]);

  // Helper function to generate storage locations for workflow
  const generateStorageLocations = (index: number): string[] => {
    const storageOptions = ['storage-eu-central', 'storage-eu-north', 'storage-na-east', 'storage-global'];
    return storageOptions.slice(0, (index % 3) + 1);
  };

  // Helper function to generate workflow steps
  const generateWorkflowSteps = (type: string, status: string): Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    duration: number;
    instanceId: string;
  }> => {
    const stepTemplates: Record<string, string[]> = {
      'Nextflow': [
        'Data Ingestion', 'Quality Control', 'Alignment', 'Variant Calling', 'Annotation'
      ],
      'CWL': [
        'Preprocessing', 'Analysis', 'Validation', 'Report Generation'
      ],
      'Snakemake': [
        'Data Import', 'Processing', 'Validation', 'Export'
      ]
    };

    const steps = (stepTemplates as any)[type] || stepTemplates['Nextflow'];
    const instances = TES_LOCATIONS.map(loc => loc.id);
    
    return (steps as string[]).map((step: string, index: number) => ({
      name: step,
      status: status === 'COMPLETED' ? 'completed' :
              status === 'RUNNING' && index <= 2 ? (index < 2 ? 'completed' : 'running') :
              status === 'FAILED' && index === 1 ? 'failed' : 'pending',
      duration: status === 'COMPLETED' || (status === 'RUNNING' && index < 2) ? 
                Math.floor(Math.random() * 600) + 60 : 0,
      instanceId: instances[index % instances.length]
    }));
  };

  // Generate workflow execution path based on mode
  const generateWorkflowPath = (_mode: string): string[] => {
    const allPaths = [
      ['tes-gateway', 'tes-uk-node'],
      ['tes-gateway', 'tes-us-east', 'tes-us-west'],
      ['tes-uk-node', 'tes-eu-west', 'tes-asia-pacific'],
      ['tes-gateway', 'tes-nordic', 'tes-asia-pacific'],
      ['tes-us-east', 'tes-us-west'],
    ];
    return allPaths[Math.floor(Math.random() * allPaths.length)];
  };

  const filteredInstances = TES_LOCATIONS.filter(instance =>
    instance.name.toLowerCase().includes(filterText.toLowerCase()) ||
    instance.country.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredWorkflows = workflowExecutions.filter(workflow =>
    workflow.id.toLowerCase().includes(filterText.toLowerCase()) ||
    workflow.type.toLowerCase().includes(filterText.toLowerCase()) ||
    workflow.tesInstance.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleInstanceClick = (instanceId: string) => {
    setSelectedInstance(instanceId === selectedInstance ? null : instanceId);
  };

  const handleWorkflowClick = (workflowId: string) => {
    setSelectedWorkflow(workflowId === selectedWorkflow ? null : workflowId);
  };

  const getInstanceStatus = (instanceId: string): 'healthy' | 'unhealthy' | 'processing' => {
    const runningWorkflows = workflowExecutions.filter(
      w => w.path.includes(instanceId) && (w.status === 'RUNNING' || w.status === 'SUBMITTED')
    );
    
    if (runningWorkflows.length > 0) return 'processing';
    
    const instance = TES_LOCATIONS.find(loc => loc.id === instanceId);
    return instance?.status || 'healthy';
  };

  // Custom Leaflet icons
const createCustomIcon = (color: string, type: 'server' | 'database') => {
  const iconHtml = type === 'server' 
    ? `<div style="background: ${color}; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><rect x="2" y="3" width="20" height="3" rx="1" ry="1"/><rect x="2" y="9" width="20" height="3" rx="1" ry="1"/><rect x="2" y="15" width="20" height="3" rx="1" ry="1"/><line x1="8" y1="5" x2="8" y2="5"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="8" y1="17" x2="8" y2="17"/></svg></div>`
    : `<div style="background: ${color}; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div>`;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

  if (loading && !dashboardData) {
    return (
      <PageContainer>
        <LoadingSpinner message="Loading network topology..." />
      </PageContainer>
    );
  }

  if (fetchError && !dashboardData) {
    return (
      <PageContainer>
        <ErrorMessage 
          title="Failed to Load Network Topology"
          message="Unable to fetch topology data. Please check your connection and try again."
          onRetry={refetch}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HeaderSection>
        <div>
          <h1>
            Network Topology
          </h1>
          <p>Real-time visualization of TES instances and workflow execution paths</p>
        </div>
        <Controls>
          <ControlButton
            active={showDataFlow}
            onClick={() => setShowDataFlow(!showDataFlow)}
          >
            Data Flow
          </ControlButton>
          <ControlButton
            active={showWorkflowPaths}
            onClick={() => setShowWorkflowPaths(!showWorkflowPaths)}
          >
            Workflow Paths
          </ControlButton>
          <ControlButton
            active={isRealTimeMode}
            onClick={() => setIsRealTimeMode(!isRealTimeMode)}
          >
            Real-time
          </ControlButton>
          <ControlButton onClick={refetch} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </ControlButton>
        </Controls>
      </HeaderSection>

      <MainContent>
        <MapWrapper>
          <MapView>
            <MapContainer
              center={[50.0, 10.0]}
              zoom={4}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={true}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {TES_LOCATIONS.map(instance => {
                const status = getInstanceStatus(instance.id);
                const iconColor = 
                  status === 'healthy' ? '#48bb78' :
                  status === 'processing' ? '#ed8936' : '#f56565';
                
                return (
                  <Marker
                    key={instance.id}
                    position={[instance.coordinates.lat, instance.coordinates.lng]}
                    icon={createCustomIcon(iconColor, 'server')}
                    eventHandlers={{
                      click: () => handleInstanceClick(instance.id)
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '8px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #e2e8f0'
                        }}>
                          <Server size={16} color={iconColor} />
                          <strong>{instance.name}</strong>
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                          <div><strong>Location:</strong> {instance.country}</div>
                          <div><strong>Status:</strong> <span style={{
                            color: iconColor,
                            textTransform: 'capitalize',
                            fontWeight: '600'
                          }}>{status}</span></div>
                          <div><strong>Active Tasks:</strong> {instance.tasks}</div>
                          <div><strong>Workflows:</strong> {instance.workflows}</div>
                          <div><strong>Capacity:</strong> {instance.capacity?.cpu} CPU, {instance.capacity?.memory}</div>
                          <div><strong>Version:</strong> {instance.version}</div>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                            {instance.description}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Storage Location Markers */}
              {showDataFlow && STORAGE_LOCATIONS.map(storage => (
                <Marker
                  key={storage.id}
                  position={[storage.coordinates.lat, storage.coordinates.lng]}
                  icon={createCustomIcon('#4c51bf', 'database')}
                >
                  <Popup>
                    <div style={{ minWidth: '180px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '8px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        <Database size={16} color="#4c51bf" />
                        <strong>{storage.name}</strong>
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                        <div><strong>Type:</strong> {storage.type}</div>
                        <div><strong>Location:</strong> {storage.location}</div>
                        <div><strong>Capacity:</strong> {storage.capacity}</div>
                        <div><strong>Usage:</strong> {storage.usage}%</div>
                        <div style={{ 
                          background: '#f7fafc', 
                          height: '6px', 
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginTop: '8px'
                        }}>
                          <div 
                            style={{ 
                              background: storage.usage > 80 ? '#f56565' : 
                                        storage.usage > 60 ? '#ed8936' : '#48bb78',
                              height: '100%',
                              width: `${storage.usage}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Test Connections - Direct lines between TES instances */}
              <Polyline
                positions={[
                  [52.5200, 13.4050], // Berlin (TES Gateway)
                  [51.5074, -0.1278]  // London (UK TES Node)
                ]}
                pathOptions={{
                  color: '#4299e1',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '12,8'
                }}
              />
              <Polyline
                positions={[
                  [51.5074, -0.1278], // London
                  [40.7128, -74.0060] // New York
                ]}
                pathOptions={{
                  color: '#48bb78',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '12,8'
                }}
              />
              <Polyline
                positions={[
                  [40.7128, -74.0060], // New York
                  [37.7749, -122.4194] // San Francisco
                ]}
                pathOptions={{
                  color: '#ed8936',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '12,8'
                }}
              />
              
              {/* Animated Workflow Connections */}
              {showWorkflowPaths && workflowExecutions
                .filter(workflow => workflow.status === 'RUNNING')
                .map(workflow => {
                  const pathInstances = workflow.path
                    .map(id => TES_LOCATIONS.find(loc => loc.id === id))
                    .filter(Boolean);
                  
                  const pathCoordinates = pathInstances
                    .filter(instance => instance && instance.coordinates && instance.coordinates.lat && instance.coordinates.lng)
                    .map(instance => [instance!.coordinates.lat, instance!.coordinates.lng] as [number, number]);
                  
                  if (pathCoordinates.length < 2) return null;
                  
                  // Different colors for different workflow types
                  const workflowColor = workflow.type === 'Nextflow' ? '#4299e1' :
                                      workflow.type === 'CWL' ? '#48bb78' :
                                      workflow.type === 'Snakemake' ? '#ed8936' : '#9f7aea';
                  
                  return (
                    <Polyline
                      key={`workflow-${workflow.id}`}
                      positions={pathCoordinates}
                      pathOptions={{
                        color: workflowColor,
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '12,8',
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                      className="workflow-connection"
                    />
                  );
                })}
              
              {/* Data Flow Connections between Storage and TES */}
              {showDataFlow && workflowExecutions
                .filter(workflow => workflow.status === 'RUNNING')
                .slice(0, 3) // Show only first 3 for performance
                .map(workflow => {
                  return workflow.storageLocations?.map((storageId, index) => {
                    const storage = STORAGE_LOCATIONS.find(s => s.id === storageId);
                    const tesInstance = TES_LOCATIONS.find(t => t.id === workflow.tesInstance);
                    
                    if (!storage || !tesInstance) return null;
                    
                    return (
                      <Polyline
                        key={`dataflow-${workflow.id}-${storageId}-${index}`}
                        positions={[
                          [storage.coordinates.lat, storage.coordinates.lng],
                          [tesInstance.coordinates.lat, tesInstance.coordinates.lng]
                        ]}
                        pathOptions={{
                          color: '#805ad5',
                          weight: 2,
                          opacity: 0.6,
                          dashArray: '8,4'
                        }}
                      />
                    );
                  });
                }).flat().filter(Boolean)}
              
              {/* Inter-TES Connections for Multi-site Workflows */}
              {showWorkflowPaths && workflowExecutions
                .filter(workflow => workflow.status === 'RUNNING' && workflow.path.length > 2)
                .slice(0, 2) // Show only 2 multi-site workflows
                .map(workflow => {
                  const connections = [];
                  for (let i = 0; i < workflow.path.length - 1; i++) {
                    const fromInstance = TES_LOCATIONS.find(loc => loc.id === workflow.path[i]);
                    const toInstance = TES_LOCATIONS.find(loc => loc.id === workflow.path[i + 1]);
                    
                    if (fromInstance && toInstance) {
                      connections.push(
                        <Polyline
                          key={`inter-tes-${workflow.id}-${i}`}
                          positions={[
                            [fromInstance.coordinates.lat, fromInstance.coordinates.lng],
                            [toInstance.coordinates.lat, toInstance.coordinates.lng]
                          ]}
                          pathOptions={{
                            color: '#f56565',
                            weight: 3,
                            opacity: 0.7,
                            dashArray: '15,10'
                          }}
                        />
                      );
                    }
                  }
                  return connections;
                }).flat()}
              
              {/* Workflow Path Lines */}
              {showWorkflowPaths && workflowExecutions
                .filter(workflow => !selectedWorkflow || workflow.id === selectedWorkflow)
                .map(workflow => {
                  const pathInstances = workflow.path
                    .map(id => TES_LOCATIONS.find(loc => loc.id === id))
                    .filter(Boolean);
                  
                  const pathCoordinates = pathInstances
                    .filter(instance => instance && instance.coordinates && instance.coordinates.lat && instance.coordinates.lng)
                    .map(instance => [instance!.coordinates.lat, instance!.coordinates.lng] as [number, number]);
                  const isActive = workflow.status === 'RUNNING';
                  
                  if (pathCoordinates.length < 2) return null;
                  
                  return (
                    <Polyline
                      key={workflow.id}
                      positions={pathCoordinates}
                      color={isActive ? '#4299e1' : '#cbd5e0'}
                      weight={isActive ? 4 : 2}
                      opacity={isActive ? 0.8 : 0.4}
                      dashArray={isActive ? '10,5' : undefined}
                    />
                  );
                })}
              
              {/* Data Flow Lines between Storage and TES instances */}
              {showDataFlow && selectedWorkflow && (
                <>
                  {workflowExecutions
                    .find(w => w.id === selectedWorkflow)
                    ?.storageLocations.map((storageId) => {
                      const storage = STORAGE_LOCATIONS.find(s => s.id === storageId);
                      const workflow = workflowExecutions.find(w => w.id === selectedWorkflow);
                      
                      if (!storage || !workflow) return null;

                      return workflow.path.map((tesId) => {
                        const tesInstance = TES_LOCATIONS.find(t => t.id === tesId);
                        if (!tesInstance) return null;

                        return (
                          <Polyline
                            key={`${selectedWorkflow}-${storageId}-${tesId}`}
                            positions={[
                              [storage.coordinates.lat, storage.coordinates.lng],
                              [tesInstance.coordinates.lat, tesInstance.coordinates.lng]
                            ]}
                            color="#4c51bf"
                            weight={2}
                            opacity={0.6}
                            dashArray="8,4"
                          />
                        );
                      });
                    })}
                </>
              )}
            </MapContainer>

            <Legend>
              <LegendItem>
                <LegendDot color="#48bb78" />
                Healthy Instance
              </LegendItem>
              <LegendItem>
                <LegendDot color="#ed8936" />
                Processing Jobs
              </LegendItem>
              <LegendItem>
                <LegendDot color="#f56565" />
                Unhealthy Instance
              </LegendItem>
              <LegendItem>
                <div style={{ width: '20px', height: '2px', background: '#4299e1' }}></div>
                Active Workflow Path
              </LegendItem>
            </Legend>
          </MapView>
        </MapWrapper>

        <Sidebar>
          <SidebarHeader>
            <h3>Network Details</h3>
            <p>Real-time monitoring and analytics</p>
          </SidebarHeader>

          <TabContainer>
            <Tab
              active={selectedTab === 'instances'}
              onClick={() => setSelectedTab('instances')}
            >
              <Server size={14} />
              Instances
            </Tab>
            <Tab
              active={selectedTab === 'workflows'}
              onClick={() => setSelectedTab('workflows')}
            >
              <Play size={14} />
              Workflows
            </Tab>
            <Tab
              active={selectedTab === 'analytics'}
              onClick={() => setSelectedTab('analytics')}
            >
              <Activity size={14} />
              Analytics
            </Tab>
          </TabContainer>

          <FilterSection>
            <FilterInput
              type="text"
              placeholder={`Filter ${selectedTab}...`}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </FilterSection>

          <SidebarContent>
            <TabContent>
              {selectedTab === 'instances' && (
                <div>
                  {filteredInstances.map(instance => (
                    <InstanceCard
                      key={instance.id}
                      selected={selectedInstance === instance.id}
                      onClick={() => handleInstanceClick(instance.id)}
                    >
                      <InstanceHeader>
                        <InstanceName>
                          <Server size={16} />
                          {instance.name}
                        </InstanceName>
                        <StatusBadge status={getInstanceStatus(instance.id)}>
                          {getInstanceStatus(instance.id)}
                        </StatusBadge>
                      </InstanceHeader>
                      
                      <InstanceDetails>
                        <div>
                          <span>Location:</span>
                          <span>{instance.country}</span>
                        </div>
                        <div>
                          <span>Active Tasks:</span>
                          <span>{instance.tasks}</span>
                        </div>
                        <div>
                          <span>Workflows:</span>
                          <span>{instance.workflows}</span>
                        </div>
                        <div>
                          <span>URL:</span>
                          <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                            {instance.url.replace('https://', '')}
                          </span>
                        </div>
                      </InstanceDetails>
                    </InstanceCard>
                  ))}
                </div>
              )}

              {selectedTab === 'workflows' && (
                <WorkflowList>
                  {filteredWorkflows.map(workflow => (
                    <WorkflowItem
                      key={workflow.id}
                      active={selectedWorkflow === workflow.id}
                      onClick={() => handleWorkflowClick(workflow.id)}
                    >
                      <WorkflowHeader>
                        <WorkflowType>{workflow.type}</WorkflowType>
                        <StatusBadge status={
                          workflow.status === 'COMPLETED' ? 'healthy' :
                          workflow.status === 'RUNNING' || workflow.status === 'SUBMITTED' ? 'processing' :
                          'unhealthy'
                        }>
                          {workflow.status}
                        </StatusBadge>
                      </WorkflowHeader>
                      
                      <WorkflowDetails>
                        <div>ID: {workflow.id.slice(0, 8)}...</div>
                        <div>Instance: {workflow.tesInstance}</div>
                        <div>Progress: {workflow.currentStep}/{workflow.totalSteps} steps</div>
                        <div>Data Size: {workflow.dataSize}</div>
                        <div>Execution Time: {workflow.executionTime}min</div>
                        <div>Storage: {workflow.storageLocations.length} locations</div>
                        <div>Started: {workflow.startTime.toLocaleTimeString()}</div>
                        
                        {selectedWorkflow === workflow.id && (
                          <>
                            <WorkflowStepsSection>
                              <h4>Workflow Steps:</h4>
                              {workflow.steps.map((step, index) => (
                                <WorkflowStep key={index} status={step.status}>
                                  <StepIndicator status={step.status}>
                                    {step.status === 'completed' ? '✓' :
                                     step.status === 'running' ? '▶' :
                                     step.status === 'failed' ? '✗' : '○'}
                                  </StepIndicator>
                                  <div>
                                    <div>{step.name}</div>
                                    <small>{step.instanceId} • {step.duration ? `${step.duration}s` : 'Pending'}</small>
                                  </div>
                                </WorkflowStep>
                              ))}
                            </WorkflowStepsSection>
                            
                            <StorageSection>
                              <h4>Storage Connections:</h4>
                              {workflow.storageLocations.map(storageId => {
                                const storage = STORAGE_LOCATIONS.find(s => s.id === storageId);
                                return storage ? (
                                  <StorageConnection key={storageId}>
                                    <Database size={14} />
                                    <div>
                                      <div>{storage.name}</div>
                                      <small>{storage.type} • {storage.location}</small>
                                    </div>
                                  </StorageConnection>
                                ) : null;
                              })}
                            </StorageSection>
                          </>
                        )}
                      </WorkflowDetails>
                    </WorkflowItem>
                  ))}
                </WorkflowList>
              )}

              {selectedTab === 'analytics' && (
                <div>
                  <InstanceCard>
                    <InstanceHeader>
                      <InstanceName>
                        <Activity size={16} />
                        Network Summary
                      </InstanceName>
                    </InstanceHeader>
                    <InstanceDetails>
                      <div>
                        <span>Total Instances:</span>
                        <span>{TES_LOCATIONS.length}</span>
                      </div>
                      <div>
                        <span>Healthy:</span>
                        <span>{TES_LOCATIONS.filter(loc => getInstanceStatus(loc.id) === 'healthy').length}</span>
                      </div>
                      <div>
                        <span>Processing:</span>
                        <span>{TES_LOCATIONS.filter(loc => getInstanceStatus(loc.id) === 'processing').length}</span>
                      </div>
                      <div>
                        <span>Active Workflows:</span>
                        <span>{workflowExecutions.filter(w => w.status === 'RUNNING' || w.status === 'SUBMITTED').length}</span>
                      </div>
                      <div>
                        <span>Total Tasks:</span>
                        <span>{TES_LOCATIONS.reduce((sum, loc) => sum + loc.tasks, 0)}</span>
                      </div>
                    </InstanceDetails>
                  </InstanceCard>

                  <InstanceCard>
                    <InstanceHeader>
                      <InstanceName>
                        <Database size={16} />
                        Storage Overview
                      </InstanceName>
                    </InstanceHeader>
                    <InstanceDetails>
                      <div>
                        <span>Storage Locations:</span>
                        <span>{STORAGE_LOCATIONS.length}</span>
                      </div>
                      <div>
                        <span>Total Capacity:</span>
                        <span>{
                          STORAGE_LOCATIONS.reduce((sum, storage) => {
                            const capacity = parseFloat(storage.capacity.replace(/[^0-9.]/g, ''));
                            const unit = storage.capacity.includes('PB') ? 1000 : 1;
                            return sum + capacity * unit;
                          }, 0).toFixed(1)
                        }TB</span>
                      </div>
                      <div>
                        <span>Average Usage:</span>
                        <span>{Math.round(STORAGE_LOCATIONS.reduce((sum, s) => sum + s.usage, 0) / STORAGE_LOCATIONS.length)}%</span>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <strong>Storage Breakdown:</strong>
                      </div>
                      {STORAGE_LOCATIONS.map(storage => (
                        <div key={storage.id} style={{ 
                          fontSize: '12px', 
                          color: '#718096',
                          marginLeft: '8px',
                          marginBottom: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{storage.name}</span>
                            <span>{storage.usage}%</span>
                          </div>
                          <div style={{ 
                            background: '#e2e8f0', 
                            height: '4px', 
                            borderRadius: '2px',
                            overflow: 'hidden',
                            marginTop: '2px'
                          }}>
                            <div 
                              style={{ 
                                background: storage.usage > 80 ? '#f56565' : 
                                          storage.usage > 60 ? '#ed8936' : '#48bb78',
                                height: '100%',
                                width: `${storage.usage}%`,
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </InstanceDetails>
                  </InstanceCard>

                  <InstanceCard>
                    <InstanceHeader>
                      <InstanceName>
                        <Clock size={16} />
                        Recent Activity
                      </InstanceName>
                    </InstanceHeader>
                    <WorkflowDetails>
                      {workflowExecutions.slice(0, 5).map(workflow => (
                        <div key={workflow.id} style={{ marginBottom: '8px', padding: '8px', background: '#f7fafc', borderRadius: '4px' }}>
                          <div style={{ fontWeight: '600', color: '#2d3748' }}>
                            {workflow.type} workflow started
                          </div>
                          <div style={{ fontSize: '12px' }}>
                            {workflow.startTime.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </WorkflowDetails>
                  </InstanceCard>
                </div>
              )}
            </TabContent>
          </SidebarContent>
        </Sidebar>
      </MainContent>
      
      {/* Professional Tooltip */}
      <Tooltip 
        show={tooltip.show} 
        x={tooltip.x} 
        y={tooltip.y}
      >
        {tooltip.type === 'tes' && tooltip.data && (
          <>
            <TooltipHeader>
              <Server size={18} color="#4299e1" />
              <h4>{tooltip.data.name}</h4>
            </TooltipHeader>
            <TooltipContent>
              <div className="metric">
                <span className="label">Location:</span>
                <span className="value">{tooltip.data.city}, {tooltip.data.country}</span>
              </div>
              <div className="metric">
                <span className="label">Status:</span>
                <span className={`status ${getInstanceStatus(tooltip.data.id)}`}>
                  {getInstanceStatus(tooltip.data.id)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Active Tasks:</span>
                <span className="value">{tooltip.data.tasks}</span>
              </div>
              <div className="metric">
                <span className="label">Workflows:</span>
                <span className="value">{tooltip.data.workflows}</span>
              </div>
              <div className="metric">
                <span className="label">CPU Capacity:</span>
                <span className="value">{tooltip.data.capacity?.cpu}</span>
              </div>
              <div className="metric">
                <span className="label">Memory:</span>
                <span className="value">{tooltip.data.capacity?.memory}</span>
              </div>
              <div className="metric">
                <span className="label">Storage:</span>
                <span className="value">{tooltip.data.capacity?.storage}</span>
              </div>
              <div className="metric">
                <span className="label">Version:</span>
                <span className="value">{tooltip.data.version}</span>
              </div>
              {tooltip.data.coordinates && (
                <div className="coordinates">
                  📍 {tooltip.data.coordinates.lat}°N, {tooltip.data.coordinates.lng}°E
                </div>
              )}
            </TooltipContent>
          </>
        )}
        
        {tooltip.type === 'storage' && tooltip.data && (
          <>
            <TooltipHeader>
              <Database size={18} color="#4c51bf" />
              <h4>{tooltip.data.name}</h4>
            </TooltipHeader>
            <TooltipContent>
              <div className="metric">
                <span className="label">Location:</span>
                <span className="value">{tooltip.data.location}</span>
              </div>
              <div className="metric">
                <span className="label">Type:</span>
                <span className="value">{tooltip.data.type}</span>
              </div>
              <div className="metric">
                <span className="label">Capacity:</span>
                <span className="value">{tooltip.data.capacity}</span>
              </div>
              <div className="metric">
                <span className="label">Usage:</span>
                <span className="value">{tooltip.data.usage}%</span>
              </div>
              <div style={{ 
                background: '#374151', 
                height: '6px', 
                borderRadius: '3px',
                overflow: 'hidden',
                marginTop: '8px'
              }}>
                <div 
                  style={{ 
                    background: tooltip.data.usage > 80 ? '#f56565' : 
                              tooltip.data.usage > 60 ? '#ed8936' : '#48bb78',
                    height: '100%',
                    width: `${tooltip.data.usage}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </TooltipContent>
          </>
        )}
      </Tooltip>
    </PageContainer>
  );
};

export default NetworkTopologyPage;
