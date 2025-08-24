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
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 20px 0;
  box-shadow: 2px 0 10px rgba(0,0,0,0.1);
`;

const NavSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #bdc3c7;
  margin: 0 20px 15px 20px;
  font-weight: 600;
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: ${props => props.$isActive ? '#ffffff' : '#bdc3c7'};
  text-decoration: none;
  transition: all 0.3s ease;
  background: ${props => props.$isActive ? 'rgba(52, 152, 219, 0.3)' : 'transparent'};
  border-right: ${props => props.$isActive ? '3px solid #3498db' : '3px solid transparent'};
  
  &:hover {
    background: rgba(52, 152, 219, 0.2);
    color: #ffffff;
  }
`;

const NavIcon = styled.div`
  margin-right: 12px;
  display: flex;
  align-items: center;
`;

const NavText = styled.span`
  font-size: 14px;
  font-weight: 500;
`;

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <SidebarContainer>
      <NavSection>
        <SectionTitle>Main</SectionTitle>
        <NavItem to="/" $isActive={isActive('/')}>
          <NavIcon><Home size={18} /></NavIcon>
          <NavText>Dashboard</NavText>
        </NavItem>
        
        <NavItem to="/tasks" $isActive={isActive('/tasks')}>
          <NavIcon><Play size={18} /></NavIcon>
          <NavText>Tasks</NavText>
        </NavItem>
        
        <NavItem to="/workflows" $isActive={isActive('/workflows')}>
          <NavIcon><GitBranch size={18} /></NavIcon>
          <NavText>Workflows</NavText>
        </NavItem>
        
        <NavItem to="/batch" $isActive={isActive('/batch')}>
          <NavIcon><Layers size={18} /></NavIcon>
          <NavText>Batch Processing</NavText>
        </NavItem>
      </NavSection>

      <NavSection>
        <SectionTitle>Monitoring</SectionTitle>
        <NavItem to="/status" $isActive={isActive('/status')}>
          <NavIcon><Activity size={18} /></NavIcon>
          <NavText>System Status</NavText>
        </NavItem>
        
        <NavItem to="/service-info" $isActive={isActive('/service-info')}>
          <NavIcon><Server size={18} /></NavIcon>
          <NavText>Service Info</NavText>
        </NavItem>
        
        <NavItem to="/logs" $isActive={isActive('/logs')}>
          <NavIcon><FileText size={18} /></NavIcon>
          <NavText>Logs</NavText>
        </NavItem>
        
        <NavItem to="/topology" $isActive={isActive('/topology')}>
          <NavIcon><BarChart3 size={18} /></NavIcon>
          <NavText>Network Topology</NavText>
        </NavItem>
      </NavSection>

      <NavSection>
        <SectionTitle>Settings</SectionTitle>
        <NavItem to="/settings" $isActive={isActive('/settings')}>
          <NavIcon><Settings size={18} /></NavIcon>
          <NavText>Settings</NavText>
        </NavItem>
      </NavSection>
    </SidebarContainer>
  );
};

export default Sidebar;
