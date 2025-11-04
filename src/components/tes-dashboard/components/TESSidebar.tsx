import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Home, 
  Play, 
  GitBranch, 
  Layers, 
  Activity, 
  Settings, 
  Server,
  FileText,
  BarChart3
} from 'lucide-react';

const SidebarContainer = styled.nav`
  width: 250px;
  min-height: calc(100vh - 80px);
  background-color: #2d3748;
  color: white;
  padding: 20px 0;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
`;

const NavSection = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #a0aec0;
  margin: 0 20px 16px 20px;
  font-weight: 600;
`;

const NavItem = styled(Link)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: ${props => props.$isActive ? '#ffffff' : '#cbd5e0'};
  text-decoration: none;
  transition: all 0.2s ease;
  background-color: ${props => props.$isActive ? '#4299e1' : 'transparent'};
  border-right: ${props => props.$isActive ? '3px solid #3182ce' : '3px solid transparent'};
  
  &:hover {
    background-color: rgba(66, 153, 225, 0.1);
    color: #ffffff;
  }
`;

const NavIcon = styled.div<{ $isActive?: boolean }>`
  margin-right: 12px;
  display: flex;
  align-items: center;
`;

const NavText = styled.span`
  font-size: 14px;
  font-weight: 500;
`;

interface SidebarProps {
  basePath?: string;
}

const TESSidebar: React.FC<SidebarProps> = ({ basePath = '/federated-analytics-showcase' }) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <SidebarContainer>
      <NavSection>
        <SectionTitle>Main</SectionTitle>
        <NavItem to={basePath} $isActive={isActive(basePath)}>
          <NavIcon><Home size={18} /></NavIcon>
          <NavText>Dashboard</NavText>
        </NavItem>
        
        <NavItem to={`${basePath}/tasks`} $isActive={isActive(`${basePath}/tasks`)}>
          <NavIcon><Play size={18} /></NavIcon>
          <NavText>Tasks</NavText>
        </NavItem>
        
        <NavItem to={`${basePath}/workflows`} $isActive={isActive(`${basePath}/workflows`)}>
          <NavIcon><GitBranch size={18} /></NavIcon>
          <NavText>Workflows</NavText>
        </NavItem>
        
        <NavItem to={`${basePath}/batch`} $isActive={isActive(`${basePath}/batch`)}>
          <NavIcon><Layers size={18} /></NavIcon>
          <NavText>Batch Processing</NavText>
        </NavItem>
      </NavSection>

      <NavSection>
        <SectionTitle>Monitoring</SectionTitle>
        <NavItem to={`${basePath}/status`} $isActive={isActive(`${basePath}/status`)}>
          <NavIcon><Activity size={18} /></NavIcon>
          <NavText>System Status</NavText>
        </NavItem>
        
        <NavItem to={`${basePath}/service-info`} $isActive={isActive(`${basePath}/service-info`)}>
          <NavIcon><Server size={18} /></NavIcon>
          <NavText>Service Info</NavText>
        </NavItem>
        
        <NavItem to={`${basePath}/logs`} $isActive={isActive(`${basePath}/logs`)}>
          <NavIcon><FileText size={18} /></NavIcon>
          <NavText>Logs</NavText>
        </NavItem>
        
        <NavItem to={`${basePath}/topology`} $isActive={isActive(`${basePath}/topology`)}>
          <NavIcon><BarChart3 size={18} /></NavIcon>
          <NavText>Network Topology</NavText>
        </NavItem>
      </NavSection>

      <NavSection>
        <SectionTitle>Settings</SectionTitle>
        <NavItem to={`${basePath}/settings`} $isActive={isActive(`${basePath}/settings`)}>
          <NavIcon><Settings size={18} /></NavIcon>
          <NavText>Settings</NavText>
        </NavItem>
      </NavSection>
    </SidebarContainer>
  );
};

export default TESSidebar;
