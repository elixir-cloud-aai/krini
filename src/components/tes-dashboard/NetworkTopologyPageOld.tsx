import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Server, 
  Activity, 
  Zap, 
  RefreshCw, 
  Play, 
  Database, 
  Network,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Layers,
  Settings,
  Info,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import { usePolling } from './hooks/usePolling';
import { fetchDashboardData } from './services/api';
import { POLLING_INTERVALS } from './utils/constants';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

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

const MapContainer = styled.div`
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
`;

const WorldMap = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3C!-- World Map Continents --%3E%3Cg fill='%23e2e8f0' stroke='%23cbd5e0' stroke-width='0.5'%3E%3C!-- North America --%3E%3Cpath d='M50,120 Q80,100 120,110 L160,130 Q180,140 200,135 L240,140 Q260,135 280,140 L320,145 Q340,140 360,150 L380,160 Q400,155 420,165 L440,175 Q460,170 480,180 L500,185 Q520,180 540,190 L560,200 Q580,195 600,205 L620,215 Q640,210 660,220 L680,230 Q700,225 720,235 L740,245 Q760,240 780,250 L800,260 Q820,255 840,265 L860,275 Q880,270 900,280 L920,290 Q940,285 960,295 L980,305 Q990,300 995,310 L990,320 Q980,325 970,320 L950,315 Q930,320 910,315 L890,310 Q870,315 850,310 L830,305 Q810,310 790,305 L770,300 Q750,305 730,300 L710,295 Q690,300 670,295 L650,290 Q630,295 610,290 L590,285 Q570,290 550,285 L530,280 Q510,285 490,280 L470,275 Q450,280 430,275 L410,270 Q390,275 370,270 L350,265 Q330,270 310,265 L290,260 Q270,265 250,260 L230,255 Q210,260 190,255 L170,250 Q150,255 130,250 L110,245 Q90,250 70,245 L50,240 Q40,235 45,225 L55,215 Q65,210 75,220 L85,210 Q95,205 105,215 L115,205 Q125,200 135,210 L145,200 Q155,195 165,205 L175,195 Q185,190 195,200 L205,190 Q215,185 225,195 L235,185 Q245,180 255,190 L265,180 Q275,175 285,185 L295,175 Q305,170 315,180 L325,170 Q335,165 345,175 L355,165 Q365,160 375,170 L385,160 Q395,155 405,165 L415,155 Q425,150 435,160 L445,150 Q455,145 465,155 L475,145 Q485,140 495,150 L505,140 Q515,135 525,145 L535,135 Q545,130 555,140 L565,130 Q575,125 585,135 L595,125 Q605,120 615,130 Z'/%3E%3C!-- Europe --%3E%3Cpath d='M480,90 Q500,80 520,85 L540,90 Q560,85 580,90 L600,95 Q620,90 640,95 L660,100 Q680,95 700,100 L720,105 Q740,100 760,105 L780,110 Q800,105 820,110 L840,115 Q860,110 880,115 L900,120 Q920,115 940,120 L960,125 Q980,120 990,130 L985,140 Q975,145 965,140 L945,135 Q925,140 905,135 L885,130 Q865,135 845,130 L825,125 Q805,130 785,125 L765,120 Q745,125 725,120 L705,115 Q685,120 665,115 L645,110 Q625,115 605,110 L585,105 Q565,110 545,105 L525,100 Q505,105 485,100 Z'/%3E%3C!-- Asia --%3E%3Cpath d='M700,70 Q720,60 740,65 L760,70 Q780,65 800,70 L820,75 Q840,70 860,75 L880,80 Q900,75 920,80 L940,85 Q960,80 980,85 L990,90 Q985,100 975,95 L955,90 Q935,95 915,90 L895,85 Q875,90 855,85 L835,80 Q815,85 795,80 L775,75 Q755,80 735,75 L715,70 Q705,75 700,70 Z'/%3E%3C!-- Africa --%3E%3Cpath d='M500,200 Q520,190 540,195 L560,200 Q580,195 600,200 L620,205 Q640,200 660,205 L680,210 Q700,205 720,210 L740,215 Q760,210 780,215 L800,220 Q820,215 840,220 L860,225 Q880,220 900,225 L920,230 Q940,225 960,230 L980,235 Q990,240 985,250 L975,255 Q955,250 935,255 L915,250 Q895,255 875,250 L855,245 Q835,250 815,245 L795,240 Q775,245 755,240 L735,235 Q715,240 695,235 L675,230 Q655,235 635,230 L615,225 Q595,230 575,225 L555,220 Q535,225 515,220 L505,215 Q500,205 500,200 Z'/%3E%3C!-- South America --%3E%3Cpath d='M200,280 Q220,270 240,275 L260,280 Q280,275 300,280 L320,285 Q340,280 360,285 L380,290 Q400,285 420,290 L440,295 Q460,290 480,295 L500,300 Q520,295 540,300 L560,305 Q580,300 600,305 L620,310 Q640,305 660,310 L680,315 Q700,310 720,315 L740,320 Q760,315 780,320 L800,325 Q820,320 840,325 L860,330 Q880,325 900,330 L920,335 Q940,330 960,335 L980,340 Q990,345 985,355 L975,360 Q955,355 935,360 L915,355 Q895,360 875,355 L855,350 Q835,355 815,350 L795,345 Q775,350 755,345 L735,340 Q715,345 695,340 L675,335 Q655,340 635,335 L615,330 Q595,335 575,330 L555,325 Q535,330 515,325 L495,320 Q475,325 455,320 L435,315 Q415,320 395,315 L375,310 Q355,315 335,310 L315,305 Q295,310 275,305 L255,300 Q235,305 215,300 L205,295 Q200,285 200,280 Z'/%3E%3C!-- Australia --%3E%3Cpath d='M800,350 Q820,340 840,345 L860,350 Q880,345 900,350 L920,355 Q940,350 960,355 L980,360 Q990,365 985,375 L975,380 Q955,375 935,380 L915,375 Q895,380 875,375 L855,370 Q835,375 815,370 L805,365 Q800,355 800,350 Z'/%3E%3C/g%3E%3C!-- Coastlines and islands --%3E%3Cg fill='none' stroke='%23a0aec0' stroke-width='0.3'%3E%3Cpath d='M100,200 Q150,180 200,200'/%3E%3Cpath d='M300,180 Q350,160 400,180'/%3E%3Cpath d='M500,160 Q550,140 600,160'/%3E%3Cpath d='M700,140 Q750,120 800,140'/%3E%3C/g%3E%3C/svg%3E");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const TESInstance = styled.div<{ x: number; y: number; status: 'healthy' | 'unhealthy' | 'processing' }>`
  position: absolute;
  left: ${props => props.x}%;
  top: ${props => props.y}%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 4px solid ${props => 
    props.status === 'healthy' ? '#48bb78' :
    props.status === 'processing' ? '#ed8936' : '#f56565'
  };
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
  
  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: ${props => 
      props.status === 'healthy' ? '#48bb7820' :
      props.status === 'processing' ? '#ed893620' : '#f5656520'
    };
    border: 2px solid ${props => 
      props.status === 'healthy' ? '#48bb7840' :
      props.status === 'processing' ? '#ed893640' : '#f5656540'
    };
    animation: pulse 2s infinite;
    z-index: -1;
  }
  
  @keyframes pulse {
    0% { transform: scale(0.8); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 0.3; }
    100% { transform: scale(0.8); opacity: 0.8; }
  }
`;

const StorageMarker = styled.div<{ x: number; y: number; type: string }>`
  position: absolute;
  left: ${props => props.x}%;
  top: ${props => props.y}%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid #4c51bf;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 80;
  
  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }
`;

const StorageLabel = styled.div`
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: #4c51bf;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
`;

const DataFlowLine = styled.line`
  stroke-width: 2;
  opacity: 0.6;
  filter: drop-shadow(0 0 4px rgba(66, 153, 225, 0.3));
`;

const WorkflowPath = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
`;

const DataFlow = styled.div<{ from: { x: number; y: number }; to: { x: number; y: number }; active: boolean }>`
  position: absolute;
  background: ${props => props.active ? '#4299e1' : '#cbd5e0'};
  height: 2px;
  transform-origin: left center;
  opacity: ${props => props.active ? 0.8 : 0.3};
  z-index: 40;
  
  ${props => {
    const dx = props.to.x - props.from.x;
    const dy = props.to.y - props.from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return `
      left: ${props.from.x}%;
      top: ${props.from.y}%;
      width: ${length}%;
      transform: rotate(${angle}deg);
    `;
  }}
  
  &::after {
    content: '';
    position: absolute;
    right: -8px;
    top: -3px;
    width: 0;
    height: 0;
    border-left: 8px solid ${props => props.active ? '#4299e1' : '#cbd5e0'};
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
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
// TES Instance locations with real geographic coordinates for Leaflet
const TES_LOCATIONS = [
  {
    id: 'tes-gateway',
    name: 'TES Gateway',
    country: 'Switzerland',
    city: 'Basel',
    lat: 47.5596,
    lng: 7.5886,
    status: 'healthy' as const,
    tasks: 156,
    workflows: 23,
    capacity: { cpu: '64 cores', memory: '512GB', storage: '10TB' },
    version: '1.1.0',
    url: 'https://tes-gateway.example.org'
  },
  {
    id: 'tes-czech-1',
    name: 'CESNET TES',
    country: 'Czech Republic', 
    city: 'Prague',
    lat: 50.0755,
    lng: 14.4378,
    status: 'processing' as const,
    tasks: 89,
    workflows: 8,
    capacity: { cpu: '128 cores', memory: '1TB', storage: '20TB' },
    version: '1.0.5',
    url: 'https://tes.cesnet.cz'
  },
  {
    id: 'tes-finland-1',
    name: 'CSC TES Finland',
    country: 'Finland',
    city: 'Helsinki', 
    lat: 60.1699,
    lng: 24.9384,
    status: 'healthy' as const,
    tasks: 134,
    workflows: 5,
    capacity: { cpu: '256 cores', memory: '2TB', storage: '50TB' },
    version: '1.1.2',
    url: 'https://tes.csc.fi'
  },
  {
    id: 'tes-greece-1',
    name: 'GRNET TES',
    country: 'Greece',
    city: 'Athens',
    lat: 37.9838,
    lng: 23.7275,
    status: 'healthy' as const,
    tasks: 67,
    workflows: 3,
    capacity: { cpu: '96 cores', memory: '768GB', storage: '15TB' },
    version: '1.0.8',
    url: 'https://tes.grnet.gr'
  },
  {
    id: 'tes-canada-1',
    name: 'Compute Canada TES',
    country: 'Canada',
    city: 'Toronto',
    lat: 43.6532,
    lng: -79.3832,
    status: 'processing' as const,
    tasks: 203,
    workflows: 4,
    capacity: { cpu: '512 cores', memory: '4TB', storage: '100TB' },
    version: '1.1.1',
    url: 'https://tes.computecanada.ca'
  },
  {
    id: 'tes-canada-2',
    name: 'Digital Research Alliance',
    country: 'Canada',
    city: 'Vancouver',
    lat: 49.2827,
    lng: -123.1207,
    status: 'healthy' as const,
    tasks: 178,
    workflows: 12,
    capacity: { cpu: '384 cores', memory: '3TB', storage: '75TB' },
    version: '1.0.9',
    url: 'https://tes.alliancecan.ca'
  },
  {
    id: 'tes-netherlands-1',
    name: 'SURF TES',
    country: 'Netherlands',
    city: 'Amsterdam',
    lat: 52.3676,
    lng: 4.9041,
    status: 'healthy' as const,
    tasks: 245,
    workflows: 9,
    capacity: { cpu: '192 cores', memory: '1.5TB', storage: '30TB' },
    version: '1.1.0',
    url: 'https://tes.surf.nl'
  },
  {
    id: 'tes-uk-1',
    name: 'EMBL-EBI TES',
    country: 'United Kingdom',
    city: 'Cambridge',
    lat: 52.2053,
    lng: 0.1218,
    status: 'processing' as const,
    tasks: 312,
    workflows: 25,
    capacity: { cpu: '768 cores', memory: '6TB', storage: '200TB' },
    version: '1.1.3',
    url: 'https://tes.ebi.ac.uk'
  },
  {
    id: 'tes-usa-1',
    name: 'NCBI TES',
    country: 'United States',
    city: 'Bethesda',
    lat: 38.9847,
    lng: -77.1003,
    status: 'healthy' as const,
    tasks: 423,
    workflows: 6,
    capacity: { cpu: '1024 cores', memory: '8TB', storage: '500TB' },
    version: '1.2.0',
    url: 'https://tes.ncbi.nlm.nih.gov'
  },
  {
    id: 'tes-germany-1', 
    name: 'de.NBI TES',
    country: 'Germany',
    city: 'Tübingen',
    lat: 48.5216,
    lng: 9.0576,
    status: 'healthy' as const,
    tasks: 189,
    workflows: 7,
    capacity: { cpu: '320 cores', memory: '2.5TB', storage: '80TB' },
    version: '1.0.7',
    url: 'https://tes.denbi.de'
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
  lat: number;
  lng: number;
  capacity: string;
  usage: number;
}

// Storage locations with real geographic coordinates for Leaflet
const STORAGE_LOCATIONS: StorageLocation[] = [
  {
    id: 'storage-eu-central',
    name: 'EU Central Storage',
    type: 'S3',
    location: 'Frankfurt, Germany',
    lat: 50.1109,
    lng: 8.6821,
    capacity: '500TB',
    usage: 65
  },
  {
    id: 'storage-eu-north',
    name: 'EU North Storage', 
    type: 'MinIO',
    location: 'Stockholm, Sweden',
    lat: 59.3293,
    lng: 18.0686,
    capacity: '300TB',
    usage: 45
  },
  {
    id: 'storage-na-east',
    name: 'NA East Storage',
    type: 'S3',
    location: 'Virginia, USA',
    lat: 37.4316,
    lng: -78.6569,
    capacity: '800TB',
    usage: 78
  },
  {
    id: 'storage-na-west',
    name: 'NA West Storage',
    type: 'HDFS',
    location: 'California, USA', 
    lat: 37.7749,
    lng: -122.4194,
    capacity: '1.2PB',
    usage: 52
  },
  {
    id: 'storage-global',
    name: 'Global Cache Hub',
    type: 'MinIO',
    location: 'London, UK',
    lat: 51.5074,
    lng: -0.1278,
    capacity: '2PB',
    usage: 34
  }
];

// Custom Leaflet icons
const createTESIcon = (status: 'healthy' | 'processing' | 'unhealthy') => {
  const color = status === 'healthy' ? '#48bb78' : 
                status === 'processing' ? '#ed8936' : '#f56565';
  
  return L.divIcon({
    className: 'custom-tes-icon',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: white;
        border: 3px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        position: relative;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <div style="
          position: absolute;
          width: 60px;
          height: 60px;
          border: 2px solid ${color}40;
          border-radius: 50%;
          animation: pulse 2s infinite;
          background: ${color}20;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(0.8); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const createStorageIcon = () => {
  return L.divIcon({
    className: 'custom-storage-icon',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: white;
        border: 2px solid #4c51bf;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4c51bf" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="m3 5 0 14 c0 3 4.03 6 9 6 s9-3 9-6 l0-14"/>
          <path d="m3 12 c0 3 4.03 6 9 6 s9-3 9-6"/>
        </svg>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const NetworkTopologyPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'instances' | 'workflows' | 'analytics'>('instances');
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [showWorkflowPaths, setShowWorkflowPaths] = useState(true);
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'tes' | 'storage' | null;
    data: any;
  }>({
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
      status: run.status || 'SUBMITTED',
      tesInstance: run.tes_instance_name || 'TES Gateway',
      startTime: new Date(run.submitted_at || Date.now()),
      path: generateWorkflowPath(run.mode || run.batch_mode || 'gateway'),
      currentStep: Math.floor(Math.random() * 5) + 1,
      totalSteps: Math.floor(Math.random() * 8) + 5,
      dataSize: ['1.2GB', '850MB', '2.8GB', '450MB', '3.4GB'][index % 5],
      storageLocations: generateStorageLocations(index),
      executionTime: Math.floor(Math.random() * 120),
      steps: generateWorkflowSteps(run.workflow_type || 'Nextflow', run.status || 'SUBMITTED')
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
  const generateWorkflowPath = (mode: string): string[] => {
    if (mode === 'gateway') {
      return ['tes-gateway', TES_LOCATIONS[Math.floor(Math.random() * (TES_LOCATIONS.length - 1))].id];
    } else {
      return TES_LOCATIONS.slice(1, Math.floor(Math.random() * 4) + 2).map(loc => loc.id);
    }
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

  // Tooltip handlers
  const handleMouseEnter = (event: React.MouseEvent, type: 'tes' | 'storage', data: any) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      type,
      data
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  const getInstanceStatus = (instanceId: string): 'healthy' | 'unhealthy' | 'processing' => {
    const runningWorkflows = workflowExecutions.filter(
      w => w.path.includes(instanceId) && (w.status === 'RUNNING' || w.status === 'SUBMITTED')
    );
    
    if (runningWorkflows.length > 0) return 'processing';
    
    const instance = TES_LOCATIONS.find(loc => loc.id === instanceId);
    return instance?.status || 'healthy';
  };

  const renderWorkflowPaths = () => {
    if (!showWorkflowPaths) return null;

    return workflowExecutions
      .filter(workflow => !selectedWorkflow || workflow.id === selectedWorkflow)
      .map(workflow => {
        const pathInstances = workflow.path.map(id => TES_LOCATIONS.find(loc => loc.id === id)).filter(Boolean);
        
        return (
          <g key={workflow.id}>
            {pathInstances.map((instance, index) => {
              if (index === pathInstances.length - 1) return null;
              
              const nextInstance = pathInstances[index + 1];
              if (!instance || !nextInstance) return null;

              const isActive = workflow.status === 'RUNNING' && index <= workflow.currentStep;
              
              return (
                <line
                  key={`${workflow.id}-${index}`}
                  x1={`${instance.x}%`}
                  y1={`${instance.y}%`}
                  x2={`${nextInstance.x}%`}
                  y2={`${nextInstance.y}%`}
                  stroke={isActive ? '#4299e1' : '#cbd5e0'}
                  strokeWidth={isActive ? '3' : '2'}
                  strokeDasharray={isActive ? '5,5' : 'none'}
                  opacity={isActive ? 0.8 : 0.4}
                  style={{
                    animation: isActive ? 'dash 1s linear infinite' : 'none'
                  }}
                />
              );
            })}
          </g>
        );
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
            <Network size={28} />
            Network Topology
          </h1>
          <p>Real-time visualization of TES instances and workflow execution paths</p>
        </div>
        <Controls>
          <ControlButton
            active={showDataFlow}
            onClick={() => setShowDataFlow(!showDataFlow)}
          >
            <Database size={16} />
            Data Flow
          </ControlButton>
          <ControlButton
            active={showWorkflowPaths}
            onClick={() => setShowWorkflowPaths(!showWorkflowPaths)}
          >
            <Zap size={16} />
            Workflow Paths
          </ControlButton>
          <ControlButton
            active={isRealTimeMode}
            onClick={() => setIsRealTimeMode(!isRealTimeMode)}
          >
            <Activity size={16} />
            Real-time
          </ControlButton>
          <ControlButton onClick={refetch} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </ControlButton>
        </Controls>
      </HeaderSection>

      <MainContent>
        <MapContainer>
          <LeafletMap
            center={[50.0, 10.0]} // Center on Europe
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* TES Instance Markers */}
            {TES_LOCATIONS.map(instance => (
              <Marker
                key={instance.id}
                position={[instance.lat, instance.lng]}
                icon={createTESIcon(getInstanceStatus(instance.id))}
                eventHandlers={{
                  click: () => handleInstanceClick(instance.id)
                }}
              >
                <Popup>
                  <div style={{ minWidth: '250px' }}>
                    <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Server size={18} color="#4299e1" />
                      {instance.name}
                    </h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                      <div><strong>Location:</strong> {instance.city}, {instance.country}</div>
                      <div><strong>Status:</strong> <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        background: getInstanceStatus(instance.id) === 'healthy' ? '#48bb7820' :
                                   getInstanceStatus(instance.id) === 'processing' ? '#ed893620' : '#f5656520',
                        color: getInstanceStatus(instance.id) === 'healthy' ? '#48bb78' :
                               getInstanceStatus(instance.id) === 'processing' ? '#ed8936' : '#f56565'
                      }}>
                        {getInstanceStatus(instance.id)}
                      </span></div>
                      <div><strong>Active Tasks:</strong> {instance.tasks}</div>
                      <div><strong>Workflows:</strong> {instance.workflows}</div>
                      <div><strong>CPU:</strong> {instance.capacity.cpu}</div>
                      <div><strong>Memory:</strong> {instance.capacity.memory}</div>
                      <div><strong>Storage:</strong> {instance.capacity.storage}</div>
                      <div><strong>Version:</strong> {instance.version}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                        📍 {instance.lat.toFixed(4)}°N, {instance.lng.toFixed(4)}°E
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Storage Location Markers */}
            {showDataFlow && STORAGE_LOCATIONS.map(storage => (
              <Marker
                key={storage.id}
                position={[storage.lat, storage.lng]}
                icon={createStorageIcon()}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Database size={18} color="#4c51bf" />
                      {storage.name}
                    </h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                      <div><strong>Location:</strong> {storage.location}</div>
                      <div><strong>Type:</strong> {storage.type}</div>
                      <div><strong>Capacity:</strong> {storage.capacity}</div>
                      <div><strong>Usage:</strong> {storage.usage}%</div>
                      <div style={{ 
                        background: '#e2e8f0', 
                        height: '6px', 
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '8px'
                      }}>
                        <div style={{ 
                          background: storage.usage > 80 ? '#f56565' : 
                                    storage.usage > 60 ? '#ed8936' : '#48bb78',
                          height: '100%',
                          width: `${storage.usage}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Workflow Path Lines */}
            {showWorkflowPaths && selectedWorkflow && (() => {
              const workflow = workflowExecutions.find(w => w.id === selectedWorkflow);
              if (!workflow) return null;

              const pathCoordinates = workflow.path
                .map(tesId => TES_LOCATIONS.find(tes => tes.id === tesId))
                .filter(Boolean)
                .map(tes => [tes!.lat, tes!.lng] as [number, number]);

              return pathCoordinates.length > 1 ? (
                <Polyline
                  positions={pathCoordinates}
                  color="#4c51bf"
                  weight={3}
                  opacity={0.8}
                  dashArray="10,5"
                />
              ) : null;
            })()}

            {/* Data Flow Lines */}
            {showDataFlow && selectedWorkflow && (() => {
              const workflow = workflowExecutions.find(w => w.id === selectedWorkflow);
              if (!workflow) return null;

              return workflow.storageLocations.map(storageId => {
                const storage = STORAGE_LOCATIONS.find(s => s.id === storageId);
                if (!storage) return null;

                return workflow.path.map(tesId => {
                  const tesInstance = TES_LOCATIONS.find(t => t.id === tesId);
                  if (!tesInstance) return null;

                  return (
                    <Polyline
                      key={`${workflow.id}-${storageId}-${tesId}`}
                      positions={[
                        [storage.lat, storage.lng],
                        [tesInstance.lat, tesInstance.lng]
                      ]}
                      color="#4299e1"
                      weight={2}
                      opacity={0.6}
                      dashArray="8,4"
                    />
                  );
                });
              }).flat();
            })()}
          </LeafletMap>
        </MapContainer>
      </MainContent>
                <DataFlow
                  key={`flow-${instance.id}`}
                  from={{ x: gateway.x, y: gateway.y }}
                  to={{ x: instance.x, y: instance.y }}
                  active={hasActiveWorkflow}
                />
              );
            })}
            
            {/* Storage to TES Data Flow Lines */}
            {showDataFlow && selectedWorkflow && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 60
                }}
              >
                {workflowExecutions
                  .find(w => w.id === selectedWorkflow)
                  ?.storageLocations.map((storageId) => {
                    const storage = STORAGE_LOCATIONS.find(s => s.id === storageId);
                    const workflow = workflowExecutions.find(w => w.id === selectedWorkflow);
                    
                    if (!storage || !workflow) return null;

                    // Draw lines from storage to all TES instances in the workflow path
                    return workflow.path.map((tesId, index) => {
                      const tesInstance = TES_LOCATIONS.find(t => t.id === tesId);
                      if (!tesInstance) return null;

                      return (
                        <g key={`${selectedWorkflow}-${storageId}-${tesId}`}>
                          <DataFlowLine
                            x1={`${storage.x}%`}
                            y1={`${storage.y}%`}
                            x2={`${tesInstance.x}%`}
                            y2={`${tesInstance.y}%`}
                            stroke="#4c51bf"
                            strokeWidth="2"
                            strokeDasharray="8,4"
                            opacity="0.7"
                          />
                          <DataFlowLine
                            x1={`${storage.x}%`}
                            y1={`${storage.y}%`}
                            x2={`${tesInstance.x}%`}
                            y2={`${tesInstance.y}%`}
                            stroke="#4c51bf"
                            strokeWidth="2"
                            strokeDasharray="8,4"
                            opacity="0.9"
                            strokeDashoffset="0"
                          >
                            <animate
                              attributeName="stroke-dashoffset"
                              values="0;-12"
                              dur="1.5s"
                              repeatCount="indefinite"
                            />
                          </DataFlowLine>
                        </g>
                      );
                    });
                  })}
              </svg>
            )}

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
        </MapContainer>

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
