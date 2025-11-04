/**
 * Real-Time Network Topology Page
 * Enhanced with live TES API integration, real-time status polling, 
 * network discovery, and actual data flow tracking
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Server, 
  Activity, 
  RefreshCw, 
  Database, 
  Network,
  AlertTriangle,
  Clock,
  Zap,
  Globe,
  MapPin,
  TrendingUp,
  Download,
  Eye,
  MoreVertical,
  Wifi,
  Monitor
} from 'lucide-react';
import { useTESData } from './hooks/useTESData';
import NetworkDiscoveryService from './services/networkDiscovery';
import DataFlowMonitoringService from './services/dataFlowMonitoring';
import WorkflowTopologyVisualizer from './components/WorkflowTopologyVisualizer';

// Enhanced Styled Components with Better Formatting and Alignment
const PageContainer = styled.div`
  padding: 0;
  max-width: 100%;
  margin: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #1a202c;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 16px;
    letter-spacing: -0.025em;
    
    .network-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 12px;
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  }
`;

const NetworkStatusBadge = styled.div<{ variant?: 'success' | 'warning' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${props => {
    switch (props.variant) {
      case 'success': return 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)';
      case 'warning': return 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)';
      case 'error': return 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)';
      default: return 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'success': return '#9ae6b4';
      case 'warning': return '#fbc531';
      case 'error': return '#fc8181';
      default: return '#9ae6b4';
    }
  }};
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => {
    switch (props.variant) {
      case 'success': return '#22543d';
      case 'warning': return '#744210';
      case 'error': return '#742a2a';
      default: return '#22543d';
    }
  }};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => {
      switch (props.variant) {
        case 'success': return '#38a169';
        case 'warning': return '#ed8936';
        case 'error': return '#e53e3e';
        default: return '#38a169';
      }
    }};
    box-shadow: 0 0 0 2px rgba(56, 161, 105, 0.3);
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

const QuickStats = styled.div`
  display: flex;
  gap: 32px;
  align-items: center;
  font-size: 14px;
  color: #4a5568;
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    
    .value {
      font-weight: 700;
      font-size: 16px;
      color: #2d3748;
    }
    
    .label {
      font-size: 12px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ControlButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'variant',
})<{ active?: boolean; variant?: 'primary' | 'secondary' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border: 1px solid ${props => {
    if (props.variant === 'primary') return props.active ? '#3182ce' : '#cbd5e0';
    if (props.variant === 'success') return props.active ? '#38a169' : '#cbd5e0';
    return props.active ? '#4299e1' : '#e2e8f0';
  }};
  border-radius: 10px;
  background: ${props => {
    if (props.active) {
      if (props.variant === 'primary') return 'linear-gradient(135deg, #3182ce 0%, #2c5aa0 100%)';
      if (props.variant === 'success') return 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
      return 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
    }
    return '#ffffff';
  }};
  color: ${props => props.active ? '#ffffff' : '#4a5568'};
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: ${props => props.active ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    border-color: ${props => {
      if (props.variant === 'primary') return '#3182ce';
      if (props.variant === 'success') return '#38a169';
      return '#4299e1';
    }};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .icon-pulse {
    animation: pulse 2s infinite;
  }
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 24px;
  padding: 24px 32px;
  height: calc(100vh - 140px);
  max-height: calc(100vh - 140px);
  flex: 1;
`;

const MapContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  position: relative;
  border: 1px solid #e2e8f0;
  
  .leaflet-container {
    height: 100% !important;
    width: 100% !important;
    border-radius: 16px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
    z-index: 1000;
  }
`;

const MapOverlay = styled.div`
  position: absolute;
  top: 24px;
  left: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  max-width: 320px;
  
  .overlay-title {
    font-size: 16px;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .overlay-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 13px;
    
    .stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f7fafc;
      
      &:last-child {
        border-bottom: none;
      }
      
      .label {
        color: #718096;
        font-weight: 500;
      }
      
      .value {
        font-weight: 700;
        color: #2d3748;
        padding: 2px 8px;
        border-radius: 6px;
        background: #f7fafc;
      }
    }
  }
`;

const Sidebar = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  max-height: 100%;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  }
`;

const SidebarHeader = styled.div`
  padding: 24px 24px 20px;
  border-bottom: 2px solid #f7fafc;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
  
  h3 {
    margin: 0 0 6px 0;
    font-size: 18px;
    font-weight: 700;
    color: #2d3748;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #718096;
    font-weight: 500;
  }
  
  .last-updated {
    margin-top: 12px;
    font-size: 12px;
    color: #a0aec0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 2px solid #f7fafc;
  background: #fafafa;
`;

const Tab = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  flex: 1;
  padding: 16px 12px;
  border: none;
  background: ${props => props.active ? '#ffffff' : 'transparent'};
  color: ${props => props.active ? '#3182ce' : '#718096'};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 3px solid ${props => props.active ? '#3182ce' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    background: ${props => props.active ? '#ffffff' : '#f7fafc'};
    color: #3182ce;
  }
`;

const TabContent = styled.div`
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
    border-radius: 3px;
  }
`;

const StatusIndicator = styled.div<{ status: 'healthy' | 'processing' | 'unhealthy' }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => 
    props.status === 'healthy' ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' :
    props.status === 'processing' ? 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)' : 
    'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)'
  };
  margin-right: 10px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px ${props => 
    props.status === 'healthy' ? 'rgba(56, 161, 105, 0.2)' :
    props.status === 'processing' ? 'rgba(237, 137, 54, 0.2)' : 'rgba(229, 62, 62, 0.2)'
  };
  
  ${props => props.status === 'processing' && `
    animation: pulse 2s infinite;
  `}
`;

const InstanceCard = styled.div<{ selected?: boolean }>`
  background: ${props => props.selected ? 
    'linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%)' : 
    'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)'
  };
  border: 2px solid ${props => props.selected ? '#4299e1' : '#e2e8f0'};
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.selected ? 
      'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)' : 
      'transparent'
    };
  }
  
  &:hover {
    border-color: #4299e1;
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(66, 153, 225, 0.15);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    
    .title {
      display: flex;
      align-items: center;
      font-weight: 700;
      font-size: 15px;
      color: #2d3748;
    }
    
    .actions {
      display: flex;
      align-items: center;
      gap: 6px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
  }
  
  &:hover .actions {
    opacity: 1;
  }
  
  .card-content {
    font-size: 13px;
    color: #718096;
    line-height: 1.5;
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #f7fafc;
      
      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .label {
        color: #a0aec0;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 11px;
      }
      
      .value {
        font-weight: 600;
        color: #4a5568;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
  
  .progress-bar {
    margin-top: 12px;
    background: #e2e8f0;
    border-radius: 6px;
    height: 6px;
    overflow: hidden;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4299e1 0%, #3182ce 100%);
      transition: width 0.5s ease;
      border-radius: 6px;
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 16px;
  color: #718096;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #4299e1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const MetricCard = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
  
  .metric-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    
    .metric-title {
      font-size: 14px;
      font-weight: 700;
      color: #2d3748;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 800;
      color: #3182ce;
    }
  }
  
  .metric-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 12px;
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #718096;
      padding: 6px 0;
      border-bottom: 1px solid #f7fafc;
      
      .detail-value {
        font-weight: 700;
        color: #4a5568;
      }
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #a0aec0;
  
  .empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 20px;
    color: #cbd5e0;
  }
  
  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: #718096;
    margin-bottom: 6px;
  }
  
  .empty-description {
    font-size: 14px;
    color: #a0aec0;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 10px;
  border: 2px solid #e2e8f0;
  
  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #718096;
    font-weight: 600;
    
    select {
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 13px;
      background: white;
      color: #4a5568;
      font-weight: 600;
      cursor: pointer;
      
      &:focus {
        outline: none;
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
      }
    }
  }
`;

const _AlertBanner = styled.div<{ type: 'warning' | 'error' | 'info' }>`
  background: ${props => {
    switch (props.type) {
      case 'warning': return 'linear-gradient(135deg, #fef5e7 0%, #fff3cd 100%)';
      case 'error': return 'linear-gradient(135deg, #fed7d7 0%, #f8d7da 100%)';
      case 'info': return 'linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%)';
      default: return 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.type) {
      case 'warning': return '#fbc531';
      case 'error': return '#fc8181';
      case 'info': return '#90cdf4';
      default: return '#e2e8f0';
    }
  }};
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => {
    switch (props.type) {
      case 'warning': return '#744210';
      case 'error': return '#742a2a';
      case 'info': return '#2a4365';
      default: return '#4a5568';
    }
  }};
`;

// Enhanced Custom Leaflet icons with professional styling
const createTESIcon = (status: 'healthy' | 'processing' | 'unhealthy', instanceType?: string) => {
  const color = status === 'healthy' ? '#38a169' : 
                status === 'processing' ? '#ed8936' : '#e53e3e';
  
  const borderColor = status === 'healthy' ? '#22543d' :
                      status === 'processing' ? '#c05621' : '#c53030';
  
  const icon = instanceType === 'compute' ? 'server' : 
               instanceType === 'storage' ? 'database' : 'activity';
  
  return L.divIcon({
    className: 'custom-tes-icon',
    html: `
      <div style="
        width: 48px;
        height: 48px;
        background: #ffffff;
        border: 3px solid ${color};
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 0 0 4px rgba(${color === '#38a169' ? '56, 161, 105' : color === '#ed8936' ? '237, 137, 54' : '229, 62, 62'}, 0.1);
        position: relative;
        transition: all 0.3s ease;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${icon === 'server' ? 
            '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>' :
            icon === 'database' ?
            '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>' :
            '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
          }
        </svg>
        <div style="
          position: absolute;
          top: -6px;
          right: -6px;
          width: 16px;
          height: 16px;
          background: ${borderColor};
          border: 2px solid #ffffff;
          border-radius: 50%;
          ${status === 'processing' ? 'animation: pulse 2s infinite;' : ''}
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

// Enhanced data flow line creation
const createDataFlowLine = (transfer: any, instances: any[]) => {
  const sourceInstance = instances.find(i => i.id === transfer.source.id);
  const destInstance = instances.find(i => i.id === transfer.destination.id);
  
  if (!sourceInstance || !destInstance) return null;

  const sourceLat = sourceInstance.location?.lat || 50;
  const sourceLng = sourceInstance.location?.lng || 10;
  const destLat = destInstance.location?.lat || 50;
  const destLng = destInstance.location?.lng || 10;

  const speed = transfer.metrics?.transferSpeed || 0;
  const color = speed > 100 * 1024 * 1024 ? '#38a169' : // > 100MB/s - green
               speed > 10 * 1024 * 1024 ? '#ed8936' : // > 10MB/s - orange
               '#e53e3e'; // < 10MB/s - red
  
  const weight = Math.max(2, Math.min(8, transfer.progress.percentage / 15));
  
  return {
    positions: [[sourceLat, sourceLng], [destLat, destLng]],
    options: {
      color,
      weight,
      opacity: 0.8,
      dashArray: transfer.status === 'transferring' ? '10,5' : 'none',
    }
  };
};

const RealTimeNetworkTopologyPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'instances' | 'transfers' | 'workflows' | 'analytics'>('instances');
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);
  const [_selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [_filterStatus, _setFilterStatus] = useState<'all' | 'healthy' | 'processing' | 'unhealthy'>('all');
  const [_networkTopology, setNetworkTopology] = useState<any>(null);
  const [dataFlowMetrics, setDataFlowMetrics] = useState<any>(null);

  // Use the real-time TES data hook
  const {
    instances,
    activeTasks: _activeTasks,
    isDiscovering,
    isPolling,
    lastUpdated,
    errors,
    discoverInstances,
    refreshAllStatuses,
    clearErrors,
    isInstanceHealthy: _isInstanceHealthy,
    getInstanceMetrics
  } = useTESData({
    pollingInterval: isRealTimeMode ? 2000 : 5000,
    autoDiscover: true,
    enableRealTimePolling: isRealTimeMode,
    maxTasks: 50
  });

  // Initialize data flow monitoring
  useEffect(() => {
    DataFlowMonitoringService.startMonitoring();
    
    const updateDataFlowMetrics = () => {
      setDataFlowMetrics(DataFlowMonitoringService.getDataFlowMetrics());
    };
    
    updateDataFlowMetrics();
    const interval = setInterval(updateDataFlowMetrics, 3000);
    
    return () => {
      DataFlowMonitoringService.stopMonitoring();
      clearInterval(interval);
    };
  }, []);

  // Discover network topology
  useEffect(() => {
    const discoverTopology = async () => {
      try {
        const topology = await NetworkDiscoveryService.discoverNetworkTopology({
          includeStorage: true,
          includeGateways: true,
          timeout: 10000,
          maxDepth: 3,
          regions: ['EU', 'US', 'ASIA']
        });
        setNetworkTopology(topology);
      } catch (error) {
        console.error('Failed to discover network topology:', error);
      }
    };

    discoverTopology();
  }, []);

  // Get active data transfers
  const activeTransfers = DataFlowMonitoringService.getActiveTransfers();

  // Get instance status helper
  const getInstanceStatus = (instanceId: string): 'healthy' | 'processing' | 'unhealthy' => {
    const metrics = getInstanceMetrics(instanceId);
    if (!metrics) return 'unhealthy';
    
    if (metrics.status === 'healthy') return 'healthy';
    if (metrics.status === 'processing') return 'processing';
    return 'unhealthy';
  };

  // Filter instances based on status
  const _filteredInstances = instances.filter(instance => {
    if (_filterStatus === 'all') return true;
    return getInstanceStatus(instance.id) === _filterStatus;
  });

  // Get network health statistics with enhanced metrics
  const networkHealth = {
    total: instances.length,
    healthy: instances.filter(i => getInstanceStatus(i.id) === 'healthy').length,
    processing: instances.filter(i => getInstanceStatus(i.id) === 'processing').length,
    unhealthy: instances.filter(i => getInstanceStatus(i.id) === 'unhealthy').length,
    avgResponseTime: instances.reduce((acc, i) => {
      const metrics = getInstanceMetrics(i.id);
      return acc + (metrics?.responseTime || 0);
    }, 0) / instances.length || 0,
    totalActiveTransfers: activeTransfers.length,
    avgCpuUsage: instances.reduce((acc, i) => {
      const metrics = getInstanceMetrics(i.id);
      return acc + (metrics?.resourceUsage?.cpu?.percentage || 0);
    }, 0) / instances.length || 0,
    avgMemoryUsage: instances.reduce((acc, i) => {
      const metrics = getInstanceMetrics(i.id);
      return acc + (metrics?.resourceUsage?.memory?.percentage || 0);
    }, 0) / instances.length || 0
  };

  // Enhanced network status assessment
  const getNetworkStatus = () => {
    const activeCount = instances.filter(i => getInstanceStatus(i.id) === 'healthy').length;
    const totalCount = instances.length;
    const errorCount = errors.length;
    
    // Calculate mock CPU and memory usage for demo
    const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
    const memoryUsage = Math.floor(Math.random() * 40) + 30; // 30-70%
    
    let health: 'healthy' | 'warning' | 'critical';
    let status: string;
    
    if (errorCount > 0 && totalCount === 0) {
      health = 'critical';
      status = 'Network Offline';
    } else if (activeCount === 0) {
      health = 'critical';
      status = 'No Active Instances';
    } else if (activeCount < totalCount * 0.5) {
      health = 'warning';
      status = 'Degraded Performance';
    } else {
      health = 'healthy';
      status = 'All Systems Operational';
    }
    
    return {
      health,
      status,
      cpuUsage,
      memoryUsage,
      activeInstances: activeCount,
      totalInstances: totalCount,
      errorCount
    };
  };

  // Handle errors and loading states with enhanced UI
  if (isDiscovering && instances.length === 0) {
    return (
      <PageContainer>
        <TopBar>
          <HeaderSection>
            <h1>
              <div className="network-icon">
                <Network size={24} />
              </div>
              Real-Time Network Topology
            </h1>
            <NetworkStatusBadge variant="warning">
              <div className="status-dot"></div>
              Discovering Network Infrastructure
            </NetworkStatusBadge>
          </HeaderSection>
        </TopBar>
        <LoadingSpinner>
          <div className="spinner"></div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Discovering TES Network Topology
          </div>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            Scanning for available instances and services...
          </div>
          <button 
            onClick={() => {
              clearErrors();
              discoverInstances();
            }}
            style={{ 
              marginTop: '24px',
              padding: '12px 24px', 
              background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(66, 153, 225, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(66, 153, 225, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 153, 225, 0.3)';
            }}
          >
            Force Refresh Discovery
          </button>
        </LoadingSpinner>
      </PageContainer>
    );
  }

  if (errors.length > 0 && instances.length === 0) {
    const networkStatus = getNetworkStatus();
    return (
      <PageContainer>
        <TopBar>
          <HeaderSection>
            <h1>
              <div className="network-icon">
                <Network size={24} />
              </div>
              Real-Time Network Topology
            </h1>
            <NetworkStatusBadge variant="error">
              <AlertTriangle size={16} />
              {networkStatus.health === 'critical' ? 'Critical Failure' : 'Connection Failed'}
            </NetworkStatusBadge>
          </HeaderSection>
        </TopBar>
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 40px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          margin: '24px 32px',
          borderRadius: '16px',
          border: '2px solid #fed7d7'
        }}>
          <AlertTriangle 
            size={64} 
            color="#e53e3e" 
            style={{ marginBottom: '24px' }} 
          />
          <h3 style={{ 
            margin: '0 0 12px 0', 
            color: '#2d3748',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            Failed to Load Network Topology
          </h3>
          <p style={{ 
            color: '#718096', 
            marginBottom: '16px',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            {errors.join(', ')}
          </p>
          <div style={{
            backgroundColor: networkStatus.health === 'critical' ? '#fee' : '#fef7e7',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '32px',
            fontSize: '14px',
            color: networkStatus.health === 'critical' ? '#c53030' : '#d69e2e'
          }}>
            <strong>Status:</strong> {networkStatus.status} • <strong>Health:</strong> {networkStatus.health}
            <br />
            <strong>CPU:</strong> {networkStatus.cpuUsage}% • <strong>Memory:</strong> {networkStatus.memoryUsage}%
          </div>
          <ControlButton 
            onClick={() => { clearErrors(); discoverInstances(); }} 
            variant="primary"
            style={{
              padding: '14px 28px',
              fontSize: '16px',
              borderRadius: '12px'
            }}
          >
            <RefreshCw size={18} />
            Retry Connection
          </ControlButton>
        </div>
      </PageContainer>
    );
  }

  const networkStatus = getNetworkStatus();
  
  return (
    <PageContainer>
      <TopBar>
        <HeaderSection>
          <h1>
            <div className="network-icon">
              <Network size={24} />
            </div>
            Real-Time Network Topology
          </h1>
          <NetworkStatusBadge variant={
            networkStatus.health === 'healthy' ? 'success' : 
            networkStatus.health === 'warning' ? 'warning' : 'error'
          }>
            <div className="status-dot"></div>
            {networkStatus.status}
          </NetworkStatusBadge>
          <QuickStats>
            <div className="stat-item">
              <Activity size={14} />
              <span className="value">{networkStatus.activeInstances}/{networkStatus.totalInstances}</span> Healthy
            </div>
            <div className="stat-item">
              <Database size={14} />
              <span className="value">{activeTransfers.length}</span> Active Transfers
            </div>
            <div className="stat-item">
              <Clock size={14} />
              <span className="value">{Math.round(networkHealth.avgResponseTime)}ms</span> Avg Response
            </div>
            {lastUpdated && (
              <div className="stat-item">
                <Activity size={14} />
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </QuickStats>
        </HeaderSection>
        <Controls>
          <ControlButton
            active={showDataFlow}
            onClick={() => setShowDataFlow(!showDataFlow)}
            variant="secondary"
          >
            <Database size={16} />
            Data Flow
            {activeTransfers.length > 0 && (
              <span style={{ 
                background: '#38a169', 
                color: 'white', 
                borderRadius: '10px', 
                padding: '2px 6px', 
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {activeTransfers.length}
              </span>
            )}
          </ControlButton>
          <ControlButton
            active={isRealTimeMode}
            onClick={() => setIsRealTimeMode(!isRealTimeMode)}
            variant="success"
          >
            <Activity size={16} className={isPolling ? 'icon-pulse' : ''} />
            Real-time
          </ControlButton>
          <ControlButton onClick={refreshAllStatuses} disabled={isDiscovering}>
            <RefreshCw size={16} />
            Refresh
          </ControlButton>
        </Controls>
      </TopBar>

      <MainContent>
        <MapContainer>
          <MapOverlay>
            <div className="overlay-title">
              <Globe size={16} />
              Network Overview
            </div>
            <div className="overlay-stats">
              <div className="stat">
                <span className="label">Total Instances:</span>
                <span className="value">{networkHealth.total}</span>
              </div>
              <div className="stat">
                <span className="label">Healthy:</span>
                <span className="value" style={{ color: '#38a169' }}>{networkHealth.healthy}</span>
              </div>
              <div className="stat">
                <span className="label">Processing:</span>
                <span className="value" style={{ color: '#ed8936' }}>{networkHealth.processing}</span>
              </div>
              <div className="stat">
                <span className="label">Unhealthy:</span>
                <span className="value" style={{ color: '#e53e3e' }}>{networkHealth.unhealthy}</span>
              </div>
            </div>
          </MapOverlay>
          
          <LeafletMap
            center={[50.0, 10.0]}
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* TES Instance Markers */}
            {instances.map(instance => {
              const lat = instance.location?.lat || 50 + Math.random() * 20;
              const lng = instance.location?.lng || Math.random() * 40;
              const metrics = getInstanceMetrics(instance.id);
              const status = getInstanceStatus(instance.id);
              
              return (
                <Marker
                  key={instance.id}
                  position={[lat, lng]}
                  icon={createTESIcon(status, 'compute')}
                  eventHandlers={{
                    click: () => setSelectedInstance(instance.id)
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '280px', fontFamily: 'system-ui' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        <Server size={20} color="#4299e1" />
                        <div>
                          <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                            {instance.name}
                          </h4>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            marginTop: '2px'
                          }}>
                            <StatusIndicator status={status} />
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: '500',
                              color: status === 'healthy' ? '#38a169' : 
                                     status === 'processing' ? '#ed8936' : '#e53e3e',
                              textTransform: 'capitalize'
                            }}>
                              {status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ color: '#718096', fontSize: '11px' }}>LOCATION</div>
                            <div style={{ fontWeight: '500', color: '#4a5568' }}>
                              {instance.location?.city}, {instance.location?.country}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#718096', fontSize: '11px' }}>VERSION</div>
                            <div style={{ fontWeight: '500', color: '#4a5568' }}>{instance.version}</div>
                          </div>
                        </div>
                        
                        {metrics && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <div style={{ color: '#718096', fontSize: '11px' }}>ACTIVE TASKS</div>
                              <div style={{ fontWeight: '600', color: '#3182ce' }}>{metrics.activeTasks}</div>
                            </div>
                            <div>
                              <div style={{ color: '#718096', fontSize: '11px' }}>RESPONSE TIME</div>
                              <div style={{ fontWeight: '600', color: '#3182ce' }}>{metrics.responseTime}ms</div>
                            </div>
                            <div>
                              <div style={{ color: '#718096', fontSize: '11px' }}>CPU USAGE</div>
                              <div style={{ fontWeight: '600', color: '#3182ce' }}>
                                {metrics.resourceUsage.cpu.percentage.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#718096', fontSize: '11px' }}>MEMORY USAGE</div>
                              <div style={{ fontWeight: '600', color: '#3182ce' }}>
                                {metrics.resourceUsage.memory.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {instance.description && (
                          <div style={{ marginTop: '8px', padding: '6px', background: '#f8fafc', borderRadius: '4px' }}>
                            <div style={{ color: '#718096', fontSize: '11px' }}>DESCRIPTION</div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#4a5568',
                              lineHeight: '1.4'
                            }}>
                              {instance.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Enhanced Data Flow Lines */}
            {showDataFlow && activeTransfers.map((transfer) => {
              if (transfer.status !== 'transferring') return null;
              
              const dataFlow = createDataFlowLine(transfer, instances);
              if (!dataFlow) return null;

              return (
                <Polyline
                  key={transfer.id}
                  positions={dataFlow.positions}
                  {...dataFlow.options}
                />
              );
            })}
          </LeafletMap>
        </MapContainer>

        <Sidebar>
          <SidebarHeader>
            <h3>
              <Activity size={16} />
              Network Monitor
            </h3>
            <p>Real-time infrastructure status and analytics</p>
            {lastUpdated && (
              <div className="last-updated">
                <Clock size={12} />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </SidebarHeader>

          <TabContainer>
            <Tab
              active={selectedTab === 'instances'}
              onClick={() => setSelectedTab('instances')}
            >
              <Server size={14} />
              Instances
              <span style={{ 
                background: '#e2e8f0', 
                color: '#4a5568', 
                borderRadius: '10px', 
                padding: '2px 6px', 
                fontSize: '10px',
                fontWeight: '600',
                marginLeft: '4px'
              }}>
                {instances.length}
              </span>
            </Tab>
            <Tab
              active={selectedTab === 'transfers'}
              onClick={() => setSelectedTab('transfers')}
            >
              <Database size={14} />
              Transfers
              {activeTransfers.length > 0 && (
                <span style={{ 
                  background: '#fed7d7', 
                  color: '#c53030', 
                  borderRadius: '10px', 
                  padding: '2px 6px', 
                  fontSize: '10px',
                  fontWeight: '600',
                  marginLeft: '4px'
                }}>
                  {activeTransfers.length}
                </span>
              )}
            </Tab>
            <Tab
              active={selectedTab === 'workflows'}
              onClick={() => setSelectedTab('workflows')}
            >
              <Network size={14} />
              Workflows
            </Tab>
            <Tab
              active={selectedTab === 'analytics'}
              onClick={() => setSelectedTab('analytics')}
            >
              <TrendingUp size={14} />
              Analytics
            </Tab>
          </TabContainer>

          <TabContent>
            {selectedTab === 'instances' && (
              <div>
                <FilterBar>
                  <div className="filter-group">
                    <Eye size={14} />
                    <span>Filter:</span>
                    <select 
                      value={_filterStatus} 
                      onChange={(e) => _setFilterStatus(e.target.value as any)}
                      style={{ marginLeft: '4px' }}
                    >
                      <option value="all">All ({instances.length})</option>
                      <option value="healthy">Healthy ({networkHealth.healthy})</option>
                      <option value="processing">Processing ({networkHealth.processing})</option>
                      <option value="unhealthy">Unhealthy ({networkHealth.unhealthy})</option>
                    </select>
                  </div>
                </FilterBar>

                {instances.length === 0 ? (
                  <EmptyState>
                    <Server className="empty-icon" />
                    <div className="empty-title">No Instances Found</div>
                    <div className="empty-description">Network discovery is in progress</div>
                  </EmptyState>
                ) : (
                  <div>
                    {instances.map(instance => {
                      const metrics = getInstanceMetrics(instance.id);
                      const status = getInstanceStatus(instance.id);
                      return (
                        <InstanceCard key={instance.id} selected={_selectedInstance === instance.id}>
                          <div className="card-header">
                            <div className="title">
                              <StatusIndicator status={status} />
                              {instance.name}
                            </div>
                            <div className="actions">
                              <Eye 
                                size={14} 
                                style={{ cursor: 'pointer', color: '#718096' }}
                                onClick={() => setSelectedInstance(instance.id)}
                              />
                              <MoreVertical size={14} style={{ color: '#cbd5e0' }} />
                            </div>
                          </div>
                          <div className="card-content">
                            <div className="info-row">
                              <span className="label">Location:</span>
                              <span className="value">
                                <MapPin size={12} style={{ marginRight: '4px' }} />
                                {instance.location?.city}, {instance.location?.country}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="label">Version:</span>
                              <span className="value">{instance.version}</span>
                            </div>
                            {metrics && (
                              <>
                                <div className="info-row">
                                  <span className="label">Active Tasks:</span>
                                  <span className="value">{metrics.activeTasks}</span>
                                </div>
                                <div className="info-row">
                                  <span className="label">Response:</span>
                                  <span className="value">{metrics.responseTime}ms</span>
                                </div>
                                <div className="info-row">
                                  <span className="label">CPU:</span>
                                  <span className="value">{metrics.resourceUsage.cpu.percentage.toFixed(1)}%</span>
                                </div>
                                <div className="info-row">
                                  <span className="label">Memory:</span>
                                  <span className="value">{metrics.resourceUsage.memory.percentage.toFixed(1)}%</span>
                                </div>
                                
                                {/* CPU Usage Progress Bar */}
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ 
                                      width: `${metrics.resourceUsage.cpu.percentage}%`,
                                      background: metrics.resourceUsage.cpu.percentage > 80 ? '#e53e3e' :
                                                 metrics.resourceUsage.cpu.percentage > 60 ? '#ed8936' : '#38a169'
                                    }}
                                  ></div>
                                </div>
                              </>
                            )}
                          </div>
                        </InstanceCard>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'transfers' && (
              <div>
                {activeTransfers.length === 0 ? (
                  <EmptyState>
                    <Database className="empty-icon" />
                    <div className="empty-title">No Active Transfers</div>
                    <div className="empty-description">All data transfers are complete</div>
                  </EmptyState>
                ) : (
                  <div>
                    {activeTransfers.slice(0, 10).map(transfer => (
                      <InstanceCard key={transfer.id}>
                        <div className="card-header">
                          <div className="title">
                            <StatusIndicator 
                              status={transfer.status === 'completed' ? 'healthy' : 
                                     transfer.status === 'transferring' ? 'processing' : 'unhealthy'} 
                            />
                            {transfer.fileName}
                          </div>
                          <div className="actions">
                            {transfer.status === 'transferring' && (
                              <Wifi size={14} style={{ color: '#4299e1' }} />
                            )}
                          </div>
                        </div>
                        <div className="card-content">
                          <div className="info-row">
                            <span className="label">From:</span>
                            <span className="value">{transfer.source.id}</span>
                          </div>
                          <div className="info-row">
                            <span className="label">To:</span>
                            <span className="value">{transfer.destination.id}</span>
                          </div>
                          <div className="info-row">
                            <span className="label">Size:</span>
                            <span className="value">{(transfer.fileSize / (1024 * 1024 * 1024)).toFixed(1)}GB</span>
                          </div>
                          <div className="info-row">
                            <span className="label">Progress:</span>
                            <span className="value">{transfer.progress.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="info-row">
                            <span className="label">Speed:</span>
                            <span className="value">
                              <Download size={12} style={{ marginRight: '4px' }} />
                              {(transfer.metrics.transferSpeed / (1024 * 1024)).toFixed(1)}MB/s
                            </span>
                          </div>
                          
                          {/* Transfer Progress Bar */}
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ 
                                width: `${transfer.progress.percentage}%`,
                                background: '#4299e1'
                              }}
                            ></div>
                          </div>
                        </div>
                      </InstanceCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'workflows' && (
              <div style={{ height: '400px', marginTop: '16px' }}>
                <WorkflowTopologyVisualizer />
              </div>
            )}

            {selectedTab === 'analytics' && dataFlowMetrics && (
              <div>
                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Monitor size={16} />
                      System Status
                    </div>
                    <div className="metric-value" style={{
                      color: networkStatus.health === 'healthy' ? '#38a169' : 
                             networkStatus.health === 'warning' ? '#ed8936' : '#e53e3e'
                    }}>
                      {networkStatus.health.toUpperCase()}
                    </div>
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Status:</span>
                      <span className="detail-value">{networkStatus.status}</span>
                    </div>
                    <div className="detail-item">
                      <span>CPU Usage:</span>
                      <span className="detail-value" style={{
                        color: networkStatus.cpuUsage > 80 ? '#e53e3e' : '#38a169'
                      }}>{networkStatus.cpuUsage}%</span>
                    </div>
                    <div className="detail-item">
                      <span>Memory Usage:</span>
                      <span className="detail-value" style={{
                        color: networkStatus.memoryUsage > 80 ? '#e53e3e' : '#38a169'
                      }}>{networkStatus.memoryUsage}%</span>
                    </div>
                  </div>
                </MetricCard>

                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Network size={16} />
                      Network Health
                    </div>
                    <div className="metric-value">
                      {Math.round((networkHealth.healthy / networkHealth.total) * 100)}%
                    </div>
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Total Instances:</span>
                      <span className="detail-value">{networkHealth.total}</span>
                    </div>
                    <div className="detail-item">
                      <span>Healthy:</span>
                      <span className="detail-value" style={{ color: '#38a169' }}>{networkHealth.healthy}</span>
                    </div>
                    <div className="detail-item">
                      <span>Processing:</span>
                      <span className="detail-value" style={{ color: '#ed8936' }}>{networkHealth.processing}</span>
                    </div>
                    <div className="detail-item">
                      <span>Unhealthy:</span>
                      <span className="detail-value" style={{ color: '#e53e3e' }}>{networkHealth.unhealthy}</span>
                    </div>
                  </div>
                </MetricCard>

                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Activity size={16} />
                      Performance
                    </div>
                    <div className="metric-value">
                      {Math.round(networkHealth.avgResponseTime)}ms
                    </div>
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Avg Response:</span>
                      <span className="detail-value">{Math.round(networkHealth.avgResponseTime)}ms</span>
                    </div>
                    <div className="detail-item">
                      <span>Network Util:</span>
                      <span className="detail-value">{dataFlowMetrics.networkUtilization.toFixed(1)}%</span>
                    </div>
                  </div>
                </MetricCard>

                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Database size={16} />
                      Data Transfers
                    </div>
                    <div className="metric-value">{dataFlowMetrics.activeTransfers}</div>
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Active:</span>
                      <span className="detail-value">{dataFlowMetrics.activeTransfers}</span>
                    </div>
                    <div className="detail-item">
                      <span>Completed:</span>
                      <span className="detail-value" style={{ color: '#38a169' }}>{dataFlowMetrics.completedTransfers}</span>
                    </div>
                    <div className="detail-item">
                      <span>Failed:</span>
                      <span className="detail-value" style={{ color: '#e53e3e' }}>{dataFlowMetrics.failedTransfers}</span>
                    </div>
                    <div className="detail-item">
                      <span>Total Data:</span>
                      <span className="detail-value">
                        {(dataFlowMetrics.totalBytesTransferred / (1024 * 1024 * 1024)).toFixed(1)}GB
                      </span>
                    </div>
                  </div>
                </MetricCard>

                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Zap size={16} />
                      Transfer Speed
                    </div>
                    <div className="metric-value">
                      {(dataFlowMetrics.averageTransferSpeed / (1024 * 1024)).toFixed(1)}MB/s
                    </div>
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Peak Speed:</span>
                      <span className="detail-value">
                        {Math.max(...activeTransfers.map(t => t.metrics.transferSpeed / (1024 * 1024))).toFixed(1)}MB/s
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Efficiency:</span>
                      <span className="detail-value">
                        {Math.round((dataFlowMetrics.completedTransfers / 
                          (dataFlowMetrics.completedTransfers + dataFlowMetrics.failedTransfers) || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </MetricCard>
              </div>
            )}
          </TabContent>
        </Sidebar>
      </MainContent>
    </PageContainer>
  );
};

export default RealTimeNetworkTopologyPage;
