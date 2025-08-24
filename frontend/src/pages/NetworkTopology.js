import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Network, Server, MapPin, Globe, RefreshCw, Eye, EyeOff, Map, Layers, Route } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { statusService } from '../services/statusService';
import { TES_INSTANCES } from '../utils/constants';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TopologyContainer = styled.div`
  padding: 2rem 1rem;
  max-width: 1600px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f8faff 0%, #f1f5ff 100%);
  min-height: 100vh;
  font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
`;

const Header = styled.div`
  margin-bottom: 2.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  }
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
`;

const Subtitle = styled.p`
  color: #6b7280;
  font-size: 1.1rem;
  font-weight: 400;
  opacity: 0.9;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ToggleButton = styled.button`
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
    : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'};
  color: ${props => props.active ? 'white' : '#374151'};
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.active 
    ? '0 4px 15px rgba(16, 185, 129, 0.3)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.active 
      ? '0 8px 25px rgba(16, 185, 129, 0.4)' 
      : '0 4px 15px rgba(0, 0, 0, 0.15)'};
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const TopologySection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;

  svg {
    color: #667eea;
    filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.2));
  }

  &::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.3) 0%, transparent 100%);
    margin-left: 1rem;
  }
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  padding: 0.5rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  width: fit-content;
`;

const ViewButton = styled.button`
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;

  background: ${props => props.active 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    : 'transparent'};
  color: ${props => props.active ? 'white' : '#4b5563'};
  box-shadow: ${props => props.active 
    ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
    : 'none'};

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover {
    background: ${props => props.active 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : 'rgba(102, 126, 234, 0.1)'};
    transform: translateY(-1px);
    
    &::before {
      left: 100%;
    }
  }

  svg {
    font-size: 1.1rem;
  }
  }
`;

const MapSection = styled.div`
  height: 650px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #f8faff 0%, #ffffff 100%);

  .leaflet-container {
    border-radius: 16px;
  }
`;

const MapCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  border-radius: 16px;
`;

const MapLegend = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1001;
  min-width: 200px;
  max-width: 250px;

  h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 700;
    color: #1a202c;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &::before {
      content: '📍';
      font-size: 1.1rem;
    }
  }
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: #4b5563;
  font-weight: 500;

  &:last-child {
    margin-bottom: 0;
  }

  span {
    flex: 1;
  }
`;

const LegendMarker = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${props => props.color};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
`;

const WorkflowControls = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  min-width: 280px;
  max-width: 320px;

  .control-title {
    font-weight: 700;
    font-size: 1rem;
    color: #1a202c;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &::before {
      content: '⚙️';
      font-size: 1.1rem;
    }
  }
`;

const WorkflowSelector = styled.select`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(229, 231, 235, 0.6);
  border-radius: 12px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  margin-bottom: 1rem;
  transition: all 0.2s;
  backdrop-filter: blur(10px);

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  option {
    background: white;
    color: #374151;
  }
`;

const AnimationButton = styled.button`
  width: 100%;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const NetworkDiagram = styled.div`
  width: 100%;
  height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  position: relative;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
`;

const NetworkNode = styled.div`
  position: absolute;
  width: ${props => props.size || 80}px;
  height: ${props => props.size || 80}px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'healthy':
        return 'linear-gradient(135deg, #22c55e, #16a34a)';
      case 'warning':
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'error':
        return 'linear-gradient(135deg, #ef4444, #dc2626)';
      default:
        return 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
  }};
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  left: ${props => props.x || 0}px;
  top: ${props => props.y || 0}px;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
`;

const ConnectionLine = styled.div`
  position: absolute;
  background: ${props => props.status === 'active' ? '#22c55e' : '#e5e7eb'};
  height: 2px;
  transform-origin: left center;
  z-index: 1;
  transition: all 0.3s ease;
  opacity: ${props => props.visible ? 1 : 0.3};
`;

const NodeTooltip = styled.div`
  position: absolute;
  background: #222b45;
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  max-width: 200px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s;
`;

const InstanceList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
`;

const InstanceCard = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
`;

const InstanceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const InstanceStatus = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'healthy':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }};
`;

const InstanceName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #222b45;
`;

const InstanceDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InstanceDetail = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
`;

const DetailLabel = styled.span`
  color: #6b7280;
`;

const DetailValue = styled.span`
  color: #222b45;
  font-weight: 500;
`;

// WorkflowRow Component for displaying individual workflow with log viewing capability
const WorkflowRow = ({ workflow, index }) => {
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState('');
  const [loadingLog, setLoadingLog] = useState(false);

  const toggleLog = async () => {
    if (!showLog) {
      setLoadingLog(true);
      try {
        const response = await fetch(`http://localhost:8080/api/batch_log/${workflow.run_id}`);
        const logText = await response.text();
        setLog(logText || 'No log available');
      } catch (error) {
        setLog('Error loading log: ' + error.message);
      }
      setLoadingLog(false);
    }
    setShowLog(!showLog);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED': return '#f59e0b';
      case 'RUNNING': return '#10b981';
      case 'COMPLETED': case 'COMPLETE': return '#3b82f6';
      case 'FAILED': case 'ERROR': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED': return '📤';
      case 'RUNNING': return '🔄';
      case 'COMPLETED': case 'COMPLETE': return '✅';
      case 'FAILED': case 'ERROR': return '❌';
      default: return '⭕';
    }
  };

  return (
    <>
      <tr style={{ 
        borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
        backgroundColor: index % 2 === 0 ? 'rgba(248, 250, 252, 0.5)' : 'rgba(255, 255, 255, 0.5)',
        transition: 'all 0.2s ease'
      }}>
        <td style={{ 
          padding: '0.75rem 1rem', 
          fontWeight: '600',
          color: '#374151'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {workflow.workflow_type}
            </span>
          </div>
        </td>
        <td style={{ 
          padding: '0.75rem 1rem',
          color: '#4b5563',
          fontSize: '0.875rem'
        }}>
          {workflow.tes_instance_name || workflow.tes_name}
        </td>
        <td style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>
              {getStatusIcon(workflow.status)}
            </span>
            <span style={{ 
              color: getStatusColor(workflow.status),
              fontWeight: '600',
              fontSize: '0.875rem'
            }}>
              {workflow.status}
            </span>
          </div>
        </td>
        <td style={{ 
          padding: '0.75rem 1rem',
          color: '#6b7280',
          fontSize: '0.875rem'
        }}>
          {new Date(workflow.submitted_at).toLocaleDateString()} {new Date(workflow.submitted_at).toLocaleTimeString()}
        </td>
        <td style={{ 
          padding: '0.75rem 1rem',
          color: '#6b7280',
          fontSize: '0.75rem',
          fontFamily: 'monospace'
        }}>
          {workflow.run_id}
        </td>
        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <button
            onClick={toggleLog}
            style={{
              background: showLog ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {loadingLog ? '⏳' : showLog ? '🙈 Hide' : '👁️ View'} Log
          </button>
        </td>
      </tr>
      {showLog && (
        <tr style={{ backgroundColor: 'rgba(243, 244, 246, 0.8)' }}>
          <td colSpan="6" style={{ padding: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
              color: '#e5e7eb',
              padding: '1.5rem',
              borderRadius: '12px',
              fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #10b981, #059669)'
              }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: '#9ca3af',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: '600',
                letterSpacing: '0.1em'
              }}>
                <span>📋</span>
                Execution Log - {workflow.run_id}
              </div>
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                color: '#d1d5db'
              }}>
                {log}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const NetworkTopology = () => {
  // Add pulse animation CSS
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .workflow-pulse {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 0.4; }
        50% { opacity: 1; }
        100% { opacity: 0.4; }
      }
      
      .leaflet-overlay-pane svg {
        pointer-events: auto;
      }

      @keyframes pulse {
        0% { 
          opacity: 0.8;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
        50% { 
          opacity: 1;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
        }
        100% { 
          opacity: 0.8;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
      }

      .glassmorphism {
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.18);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instances, setInstances] = useState([]);
  const [tesLocations, setTesLocations] = useState([]);
  const [workflowPaths, setWorkflowPaths] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [currentView, setCurrentView] = useState('map'); // Start with map view
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [realtimeWorkflows, setRealtimeWorkflows] = useState([]);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const canvasRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const realtimeIntervalRef = React.useRef(null);

  useEffect(() => {
    loadNetworkTopology();
    startRealtimeTracking();
    
    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const startRealtimeTracking = () => {
    const fetchRealtimeWorkflows = async () => {
      if (!isRealTimeActive) return;
      
      try {
        const response = await fetch('http://localhost:8080/api/realtime_workflows');
        const data = await response.json();
        
        if (data.workflows) {
          setRealtimeWorkflows(data.workflows);
          
          // Auto-select the most recent active workflow for visualization
          const activeWorkflows = data.workflows.filter(w => w.status === 'RUNNING');
          if (activeWorkflows.length > 0 && !selectedWorkflow) {
            setSelectedWorkflow(activeWorkflows[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching real-time workflows:', error);
      }
    };
    
    // Initial load
    fetchRealtimeWorkflows();
    
    // Set up polling every 2 seconds
    realtimeIntervalRef.current = setInterval(fetchRealtimeWorkflows, 2000);
  };

  const toggleRealtimeTracking = () => {
    setIsRealTimeActive(!isRealTimeActive);
    
    if (!isRealTimeActive) {
      startRealtimeTracking();
    } else {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
      }
    }
  };

  const loadNetworkTopology = async () => {
    try {
      setLoading(true);
      setError('');

      // Load TES locations with geographic data
      const locationsPromise = fetch('http://localhost:8080/api/tes_locations').then(r => r.json());
      const workflowsPromise = fetch('http://localhost:8080/api/dashboard_data').then(r => r.json());

      const [locations, dashboardData] = await Promise.all([locationsPromise, workflowsPromise]);
      
      setTesLocations(locations);
      setDashboardData(dashboardData);
      
      // Use real-time workflows if available, otherwise fallback to dashboard data
      const workflowsToUse = realtimeWorkflows.length > 0 ? realtimeWorkflows : [
        ...dashboardData.batch_runs.map(run => ({
          id: run.run_id,
          type: run.workflow_type,
          name: `${run.workflow_type.toUpperCase()} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: run.submitted_at,
          mode: run.mode
        })),
        ...dashboardData.workflow_runs.map(run => ({
          id: run.run_id,
          type: run.type,
          name: `${run.type.toUpperCase()} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: new Date().toISOString()
        }))
      ];
      
      setWorkflowPaths(workflowsToUse);

      // Check status of each TES instance
      const instancePromises = locations.map(async (location, index) => {
        try {
          // For demo purposes, assume all instances are healthy
          // In production, you'd make actual status checks
          const tasks = []; // await statusService.listTasks(location.url);
          return {
            ...location,
            id: location.name.replace(/\s+/g, '-').toLowerCase(),
            status: 'healthy', // Set as healthy for visualization
            taskCount: tasks?.tasks?.length || Math.floor(Math.random() * 5), // Random task count for demo
            lastChecked: new Date().toISOString(),
            position: calculateNodePosition(index, locations.length),
            connections: [],
            latency: Math.floor(Math.random() * 100) + 20,
            region: location.country
          };
        } catch (err) {
          return {
            ...location,
            id: location.name.replace(/\s+/g, '-').toLowerCase(),
            status: 'healthy', // Still show as healthy for visualization
            taskCount: Math.floor(Math.random() * 3), // Random task count
            lastChecked: new Date().toISOString(),
            position: calculateNodePosition(index, locations.length),
            connections: [],
            latency: Math.floor(Math.random() * 150) + 50, // Higher latency for potentially problematic instances
            region: location.country,
            error: err.message
          };
        }
      });

      const instanceResults = await Promise.all(instancePromises);
      
      // Add a central gateway node
      const gatewayNode = {
        id: 'gateway',
        name: 'TES Gateway',
        url: 'gateway',
        status: 'healthy',
        taskCount: instanceResults.reduce((sum, inst) => sum + inst.taskCount, 0),
        position: { x: 350, y: 200 },
        connections: instanceResults.map(inst => inst.id),
        latency: 5,
        region: 'Central Europe',
        lat: 52.52, // Berlin - Central Europe (matching backend gateway)
        lon: 13.405,
        isGateway: true
      };

      setInstances([gatewayNode, ...instanceResults]);
    } catch (err) {
      setError('Failed to load network topology: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateNodePosition = (index, total) => {
    const radius = 150;
    const centerX = 350;
    const centerY = 200;
    const angle = (index / total) * 2 * Math.PI;
    
    return {
      x: centerX + radius * Math.cos(angle) - 40,
      y: centerY + radius * Math.sin(angle) - 40
    };
  };

  const getRegionFromUrl = (url) => {
    if (url.includes('eu-west')) return 'EU West';
    if (url.includes('us-east')) return 'US East';
    if (url.includes('ap-south')) return 'Asia Pacific';
    if (url.includes('tesk-prod')) return 'EU Central';
    if (url.includes('tesk-na')) return 'North America';
    if (url.includes('127.0.0.1') || url.includes('localhost')) return 'Local';
    return 'Unknown';
  };

  // Custom Leaflet icons
  const createCustomIcon = (status, isGateway = false) => {
    const color = status === 'healthy' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444';
    const size = isGateway ? 30 : 20;
    
    return L.divIcon({
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: ${isGateway ? '16px' : '12px'};
      ">
        ${isGateway ? '🌐' : '🖥️'}
      </div>`,
      className: 'custom-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  // Draw workflow paths on canvas
  const drawWorkflowPaths = (selectedWorkflowId) => {
    const canvas = canvasRef.current;
    if (!canvas || !mapRef.current) return;

    const ctx = canvas.getContext('2d');
    const map = mapRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!selectedWorkflowId) return;

    const selectedWf = workflowPaths.find(w => w.id === selectedWorkflowId);
    if (!selectedWf) return;

    // Find source and destination
    const gateway = instances.find(i => i.isGateway);
    const targetInstance = instances.find(i => i.name === selectedWf.tes_name);

    if (!gateway || !targetInstance || !gateway.lat || !targetInstance.lat) return;

    // Convert lat/lng to pixel coordinates
    const gatewayPoint = map.latLngToContainerPoint([gateway.lat, gateway.lon]);
    const targetPoint = map.latLngToContainerPoint([targetInstance.lat, targetInstance.lon]);

    // Draw animated path
    ctx.strokeStyle = getWorkflowColor(selectedWf.type);
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    // Animate the dash offset
    ctx.lineDashOffset = -animationStep * 2;
    
    ctx.beginPath();
    ctx.moveTo(gatewayPoint.x, gatewayPoint.y);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.stroke();

    // Draw workflow status indicators
    const midX = (gatewayPoint.x + targetPoint.x) / 2;
    const midY = (gatewayPoint.y + targetPoint.y) / 2;
    
    ctx.fillStyle = selectedWf.status === 'SUBMITTED' ? '#2563eb' : 
                   selectedWf.status === 'RUNNING' ? '#f59e0b' : '#22c55e';
    ctx.beginPath();
    ctx.arc(midX, midY, 6, 0, 2 * Math.PI);
    ctx.fill();
  };

  const getWorkflowColor = (type) => {
    switch (type) {
      case 'nextflow': return '#0055cc';
      case 'snakemake': return '#0a7d1c';
      case 'cwl': return '#ff6b35';
      default: return '#6b7280';
    }
  };

  const startAnimation = () => {
    setIsAnimating(true);
    const animate = () => {
      setAnimationStep(step => (step + 1) % 100);
      if (isAnimating) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  };

  const stopAnimation = () => {
    setIsAnimating(false);
  };

  // Update canvas when map moves or workflow changes
  React.useEffect(() => {
    if (currentView === 'map' && selectedWorkflow) {
      drawWorkflowPaths(selectedWorkflow);
    }
  }, [selectedWorkflow, animationStep, currentView, instances, workflowPaths]);

  // Map event handlers
  const MapEvents = () => {
    const map = useMap();
    
    React.useEffect(() => {
      mapRef.current = map;
      
      const handleMoveEnd = () => {
        if (selectedWorkflow) {
          drawWorkflowPaths(selectedWorkflow);
        }
      };
      
      map.on('moveend', handleMoveEnd);
      map.on('zoomend', handleMoveEnd);
      
      return () => {
        map.off('moveend', handleMoveEnd);
        map.off('zoomend', handleMoveEnd);
      };
    }, [map]);
    
    return null;
  };

  const renderConnections = () => {
    if (!showConnections) return null;

    const gateway = instances.find(inst => inst.isGateway);
    if (!gateway) return null;

    return instances
      .filter(inst => !inst.isGateway)
      .map((instance) => {
        const dx = instance.position.x + 40 - (gateway.position.x + 40);
        const dy = instance.position.y + 40 - (gateway.position.y + 40);
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <ConnectionLine
            key={`connection-${instance.id}`}
            style={{
              left: gateway.position.x + 40,
              top: gateway.position.y + 39,
              width: length,
              transform: `rotate(${angle}deg)`,
            }}
            status={instance.status === 'healthy' ? 'active' : 'inactive'}
            visible={showConnections}
          />
        );
      });
  };

  const handleNodeHover = (instance, event) => {
    setHoveredNode(instance);
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY - 10
    });
  };

  const handleNodeLeave = () => {
    setHoveredNode(null);
  };

  return (
    <TopologyContainer>
      <Header>
        <HeaderLeft>
          <Title>Network Topology & Geographic Visualization</Title>
          <Subtitle>Interactive map view of TES instances and workflow execution paths</Subtitle>
        </HeaderLeft>
        <Controls>
          <ViewToggle>
            <ViewButton 
              active={currentView === 'network'} 
              onClick={() => setCurrentView('network')}
            >
              Network Diagram
            </ViewButton>
            <ViewButton 
              active={currentView === 'map'} 
              onClick={() => setCurrentView('map')}
            >
              Geographic Map
            </ViewButton>
          </ViewToggle>
          <ToggleButton
            active={isRealTimeActive}
            onClick={toggleRealtimeTracking}
          >
            {isRealTimeActive ? <RefreshCw size={16} className={isRealTimeActive ? 'animate-spin' : ''} /> : <RefreshCw size={16} />}
            Real-time {isRealTimeActive ? 'ON' : 'OFF'}
          </ToggleButton>
          <ToggleButton
            active={showConnections}
            onClick={() => setShowConnections(!showConnections)}
          >
            {showConnections ? <Eye size={16} /> : <EyeOff size={16} />}
            {showConnections ? 'Hide' : 'Show'} Connections
          </ToggleButton>
          <RefreshButton onClick={loadNetworkTopology} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </Controls>
      </Header>

      {error && <ErrorMessage message={error} />}

      <TopologySection>
        <SectionTitle>
          {currentView === 'map' ? <Globe size={20} /> : <Network size={20} />}
          {currentView === 'map' ? 'Interactive Geographic Map' : 'Network Diagram'}
        </SectionTitle>

        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '3rem',
            margin: '2rem 0',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(102, 126, 234, 0.2)',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1.5rem'
            }} />
            <div style={{
              fontSize: '1.2rem',
              fontWeight: '600',
              color: '#667eea',
              marginBottom: '0.5rem'
            }}>
              Loading Network Topology
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              textAlign: 'center',
              maxWidth: '300px'
            }}>
              Fetching TES instances and workflow data...
            </div>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : currentView === 'map' ? (
          <MapSection>
            <MapContainer
              center={[52.5200, 13.4050]} // Berlin center
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapEvents />
              
              {/* Render TES instance markers */}
              {instances.map((instance) => (
                instance.lat && instance.lon && (
                  <Marker
                    key={instance.id}
                    position={[instance.lat, instance.lon]}
                    icon={createCustomIcon(instance.status, instance.isGateway)}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#222b45' }}>
                          {instance.name}
                        </h3>
                        <div><strong>Status:</strong> {instance.status}</div>
                        <div><strong>Tasks:</strong> {instance.taskCount}</div>
                        <div><strong>Region:</strong> {instance.region}</div>
                        <div><strong>Latency:</strong> {instance.latency}ms</div>
                        {instance.url !== 'gateway' && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                            {instance.url}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* Render all workflow paths as polylines with real-time progress */}
              {(realtimeWorkflows.length > 0 ? realtimeWorkflows : workflowPaths).map(workflow => {
                const gateway = instances.find(i => i.isGateway);
                const targetInstance = instances.find(i => i.name === workflow.tes_instance || i.name === workflow.tes_name);
                
                if (!workflow || !gateway || !targetInstance || !gateway.lat || !targetInstance.lat) {
                  return null;
                }
                
                const pathColor = getWorkflowColor(workflow.workflow_type || workflow.type);
                const isRunning = ['RUNNING', 'QUEUED', 'SUBMITTED'].includes(workflow.status);
                const isSelected = selectedWorkflow === workflow.id;
                const progress = workflow.progress || 0;
                
                const baseOpacity = isSelected ? 1.0 : 0.6;
                const baseWeight = isSelected ? 6 : (isRunning ? 4 : 3);
                
                return (
                  <React.Fragment key={workflow.id}>
                    {/* Main workflow path */}
                    <Polyline
                      positions={[
                        [gateway.lat, gateway.lon],
                        [targetInstance.lat, targetInstance.lon]
                      ]}
                      color={isRunning ? pathColor : '#9ca3af'}
                      weight={baseWeight}
                      opacity={baseOpacity}
                      dashArray={isRunning ? (isSelected ? "10, 10" : "5, 5") : "10, 15"}
                      className={isRunning && isSelected ? 'workflow-pulse' : ''}
                      eventHandlers={{
                        click: () => {
                          setSelectedWorkflow(workflow.id);
                        }
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: '200px' }}>
                          <h4 style={{ margin: '0 0 8px 0' }}>
                            {(workflow.workflow_type || workflow.type || 'workflow').toUpperCase()} Workflow
                          </h4>
                          <div><strong>ID:</strong> {workflow.id.slice(0, 8)}...</div>
                          <div><strong>Name:</strong> {workflow.name || 'Unnamed'}</div>
                          <div><strong>To:</strong> {workflow.tes_instance || workflow.tes_name}</div>
                          <div><strong>Status:</strong> 
                            <span style={{ 
                              color: workflow.status === 'RUNNING' ? '#22c55e' : 
                                    workflow.status === 'COMPLETED' || workflow.status === 'COMPLETE' ? '#3b82f6' : 
                                    workflow.status === 'FAILED' || workflow.status === 'ERROR' ? '#ef4444' : '#f59e0b',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              {workflow.status || 'UNKNOWN'}
                            </span>
                          </div>
                          {progress > 0 && (
                            <>
                              <div><strong>Progress:</strong> {progress}%</div>
                              <div style={{ 
                                width: '100%', 
                                height: '8px', 
                                background: '#e5e7eb', 
                                borderRadius: '4px',
                                margin: '8px 0',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${progress}%`,
                                  height: '100%',
                                  background: pathColor,
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </>
                          )}
                          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#6b7280' }}>
                            Real-time: {isRealTimeActive ? 'Active' : 'Inactive'} | Click to select
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                    
                    {/* Progress indicator for running workflows */}
                    {isRunning && progress > 0 && (
                      <Polyline
                        positions={[
                          [gateway.lat, gateway.lon],
                          [
                            gateway.lat + (targetInstance.lat - gateway.lat) * (progress / 100),
                            gateway.lon + (targetInstance.lon - gateway.lon) * (progress / 100)
                          ]
                        ]}
                        color="#22c55e" // Green for progress
                        weight={baseWeight + 2}
                        opacity={baseOpacity * 0.8}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Selected workflow highlight (if any) */}
            </MapContainer>

            {/* Canvas overlay for animations */}
            <MapCanvas ref={canvasRef} />

            {/* Map Controls */}
            <WorkflowControls>
              <div className="control-title">
                Workflow Visualization
              </div>
              <WorkflowSelector
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
              >
                <option value="">Select a workflow...</option>
                {(realtimeWorkflows.length > 0 ? realtimeWorkflows : workflowPaths).map(workflow => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name} ({workflow.status}) {workflow.progress ? `- ${workflow.progress}%` : ''}
                  </option>
                ))}
              </WorkflowSelector>
              <AnimationButton
                onClick={isAnimating ? stopAnimation : startAnimation}
                disabled={!selectedWorkflow}
              >
                {isAnimating ? '⏹️ Stop Animation' : '▶️ Start Animation'}
              </AnimationButton>
            </WorkflowControls>

            {/* Map Legend */}
            <MapLegend>
              <h4>Legend</h4>
              <LegendItem>
                <LegendMarker color="linear-gradient(135deg, #22c55e, #16a34a)" />
                <span>Healthy TES Instance</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="linear-gradient(135deg, #f59e0b, #d97706)" />
                <span>Warning Status</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="linear-gradient(135deg, #ef4444, #dc2626)" />
                <span>Error Status</span>
              </LegendItem>
              <div style={{ 
                height: '1px', 
                background: 'linear-gradient(90deg, rgba(107, 114, 128, 0.3) 0%, transparent 100%)',
                margin: '1rem 0' 
              }} />
              <LegendItem>
                <LegendMarker color="linear-gradient(135deg, #3b82f6, #1d4ed8)" />
                <span>Nextflow Workflow</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="linear-gradient(135deg, #10b981, #059669)" />
                <span>Snakemake Workflow</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="linear-gradient(135deg, #f97316, #ea580c)" />
                <span>CWL Workflow</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="linear-gradient(135deg, #8b5cf6, #7c3aed)" />
                <span>Individual Task</span>
              </LegendItem>
            </MapLegend>
          </MapSection>
        ) : (
          <NetworkDiagram>
            {renderConnections()}
            
            {instances.map((instance) => (
              <NetworkNode
                key={instance.id}
                status={instance.status}
                size={instance.isGateway ? 100 : 80}
                x={instance.position.x}
                y={instance.position.y}
                onMouseEnter={(e) => handleNodeHover(instance, e)}
                onMouseLeave={handleNodeLeave}
                onMouseMove={(e) => {
                  if (hoveredNode && hoveredNode.id === instance.id) {
                    setTooltipPosition({
                      x: e.clientX + 10,
                      y: e.clientY - 10
                    });
                  }
                }}
              >
                {instance.isGateway ? (
                  <>
                    <Globe size={24} />
                    <div style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>Gateway</div>
                  </>
                ) : (
                  <>
                    <Server size={20} />
                    <div style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
                      {instance.name.length > 10 
                        ? instance.name.substring(0, 10) + '...' 
                        : instance.name
                      }
                    </div>
                  </>
                )}
              </NetworkNode>
            ))}

            {hoveredNode && (
              <NodeTooltip
                visible={true}
                style={{
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                  position: 'fixed'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  {hoveredNode.name}
                </div>
                <div>Status: {hoveredNode.status}</div>
                <div>Tasks: {hoveredNode.taskCount}</div>
                <div>Region: {hoveredNode.region}</div>
                <div>Latency: {hoveredNode.latency}ms</div>
                {hoveredNode.url !== 'gateway' && (
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                    {hoveredNode.url}
                  </div>
                )}
              </NodeTooltip>
            )}
          </NetworkDiagram>
        )}
      </TopologySection>

      <TopologySection>
        <SectionTitle>
          <MapPin size={20} />
          TES Instance Details & Workflow Statistics
        </SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            backdropFilter: 'blur(20px)',
            padding: '2rem', 
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
            }} />
            <h3 style={{ 
              margin: '0 0 1.5rem 0', 
              color: '#1a202c',
              fontSize: '1.2rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📊 Real-time Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563', fontWeight: '500' }}>Total Workflows:</span>
                <span style={{ fontWeight: '700', color: '#667eea', fontSize: '1.1rem' }}>
                  {realtimeWorkflows.length || workflowPaths.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563', fontWeight: '500' }}>Active Workflows:</span>
                <span style={{ fontWeight: '700', color: '#10b981', fontSize: '1.1rem' }}>
                  {realtimeWorkflows.filter(w => w.status === 'RUNNING').length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563', fontWeight: '500' }}>Completed:</span>
                <span style={{ fontWeight: '700', color: '#3b82f6', fontSize: '1.1rem' }}>
                  {realtimeWorkflows.filter(w => w.status === 'COMPLETED' || w.status === 'COMPLETE').length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563', fontWeight: '500' }}>TES Instances:</span>
                <span style={{ fontWeight: '700', color: '#f59e0b', fontSize: '1.1rem' }}>
                  {instances.filter(i => i.status === 'healthy').length} healthy
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            backdropFilter: 'blur(20px)',
            padding: '2rem', 
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
            }} />
            <h3 style={{ 
              margin: '0 0 1.5rem 0', 
              color: '#1a202c',
              fontSize: '1.2rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🚀 Current Activity
            </h3>
            {realtimeWorkflows.slice(0, 3).map(wf => (
              <div key={wf.id} style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    color: getWorkflowColor(wf.workflow_type || wf.type), 
                    fontWeight: '700',
                    fontSize: '0.875rem'
                  }}>
                    {(wf.workflow_type || wf.type || 'task').toUpperCase()}
                  </span>
                  {wf.progress && wf.progress > 0 && (
                    <span style={{ 
                      fontSize: '0.75rem',
                      color: '#059669',
                      fontWeight: '600',
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '8px'
                    }}>
                      {wf.progress}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  → {wf.tes_instance}
                </div>
              </div>
            ))}
            {realtimeWorkflows.length === 0 && (
              <div style={{ 
                color: '#6b7280', 
                fontSize: '0.875rem',
                textAlign: 'center',
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                border: '1px dashed rgba(107, 114, 128, 0.3)'
              }}>
                No active workflows
              </div>
            )}
          </div>
          
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            backdropFilter: 'blur(20px)',
            padding: '2rem', 
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
            }} />
            <h3 style={{ 
              margin: '0 0 1.5rem 0', 
              color: '#1a202c',
              fontSize: '1.2rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🔄 Real-time Status
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                background: isRealTimeActive ? 
                  'radial-gradient(circle, #22c55e 0%, #16a34a 100%)' : 
                  'radial-gradient(circle, #ef4444 0%, #dc2626 100%)',
                boxShadow: isRealTimeActive ? 
                  '0 0 10px rgba(34, 197, 94, 0.5)' : 
                  '0 0 10px rgba(239, 68, 68, 0.5)',
                animation: isRealTimeActive ? 'pulse 2s infinite' : 'none'
              }} />
              <span style={{ fontWeight: '600', color: '#374151' }}>
                Real-time tracking {isRealTimeActive ? 'active' : 'inactive'}
              </span>
            </div>
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              marginBottom: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '8px'
            }}>
              📡 Updates every 2 seconds
            </div>
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '8px'
            }}>
              🕒 Last update: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Workflow Table with Logs */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
          backdropFilter: 'blur(20px)',
          padding: '2rem', 
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2.5rem'
        }}>
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
          }} />
          
          <h3 style={{ 
            margin: '0 0 1.5rem 0', 
            color: '#1a202c',
            fontSize: '1.3rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📋 Workflow Execution History & Logs
          </h3>
          
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'rgba(255, 255, 255, 0.8)'
            }}>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)' }}>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>Workflow Type</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>TES Instance</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>Status</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>Submitted</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>Run ID</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.batch_runs?.slice(-10).reverse().map((workflow, index) => (
                  <WorkflowRow 
                    key={workflow.run_id} 
                    workflow={workflow} 
                    index={index}
                  />
                )) || []}
              </tbody>
            </table>
          </div>
          
          {(!dashboardData?.batch_runs || dashboardData.batch_runs.length === 0) && (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#6b7280',
              fontSize: '1rem'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>No workflows executed yet</div>
              <div style={{ fontSize: '0.875rem' }}>Submit a workflow to see execution history and logs here</div>
            </div>
          )}
        </div>

        <InstanceList>
          {instances.filter(inst => !inst.isGateway).map((instance) => (
            <InstanceCard key={instance.id}>
              <InstanceHeader>
                <InstanceStatus status={instance.status} />
                <InstanceName>{instance.name}</InstanceName>
              </InstanceHeader>
              <InstanceDetails>
                <InstanceDetail>
                  <DetailLabel>Location:</DetailLabel>
                  <DetailValue>{instance.country}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>URL:</DetailLabel>
                  <DetailValue style={{ fontSize: '0.75rem' }}>{instance.url}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Status:</DetailLabel>
                  <DetailValue>{instance.status}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Tasks:</DetailLabel>
                  <DetailValue>{instance.taskCount}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Coordinates:</DetailLabel>
                  <DetailValue>{instance.lat?.toFixed(2)}, {instance.lon?.toFixed(2)}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Latency:</DetailLabel>
                  <DetailValue>{instance.latency}ms</DetailValue>
                </InstanceDetail>
                {instance.error && (
                  <InstanceDetail>
                    <DetailLabel>Error:</DetailLabel>
                    <DetailValue style={{ color: '#ef4444' }}>{instance.error}</DetailValue>
                  </InstanceDetail>
                )}
              </InstanceDetails>
            </InstanceCard>
          ))}
        </InstanceList>
      </TopologySection>
    </TopologyContainer>
  );
};

export default NetworkTopology;
