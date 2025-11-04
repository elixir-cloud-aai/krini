import React from 'react';
import styled from 'styled-components';
import { Home, Activity, Database, Network, Settings } from 'lucide-react';

const SidebarContainer = styled.div<{ isOpen?: boolean }>`
  width: 240px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: ${props => props.isOpen ? '0' : '-240px'};
  top: 0;
  z-index: 100;
  transition: left 0.3s ease;
  
  @media (min-width: 768px) {
    left: 0;
  }
`;

const SidebarHeader = styled.div`
  padding: 0 20px 20px;
  border-bottom: 1px solid #e2e8f0;
  
  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #2d3748;
    margin: 0;
  }
  
  p {
    font-size: 12px;
    color: #718096;
    margin: 4px 0 0;
  }
`;

const NavList = styled.nav`
  flex: 1;
  padding: 20px 0;
`;

const NavItem = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 2px 0;
  cursor: pointer;
  color: ${props => props.active ? '#3182ce' : '#4a5568'};
  background: ${props => props.active ? '#ebf8ff' : 'transparent'};
  border-right: 3px solid ${props => props.active ? '#3182ce' : 'transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    background: #f7fafc;
    color: #3182ce;
  }
  
  .icon {
    width: 20px;
    height: 20px;
  }
  
  .label {
    font-size: 14px;
    font-weight: 500;
  }
`;

interface DashboardSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeSection = 'dashboard',
  onSectionChange,
  isOpen = true,
  onToggle: _onToggle
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'network', label: 'Network Topology', icon: Network },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <SidebarContainer isOpen={isOpen}>
      <SidebarHeader>
        <h2>TES Dashboard</h2>
        <p>Real-time Infrastructure Monitor</p>
      </SidebarHeader>
      
      <NavList>
        {navItems.map(item => (
          <NavItem
            key={item.id}
            active={activeSection === item.id}
            onClick={() => onSectionChange?.(item.id)}
          >
            <item.icon className="icon" />
            <span className="label">{item.label}</span>
          </NavItem>
        ))}
      </NavList>
    </SidebarContainer>
  );
};

export default DashboardSidebar;
