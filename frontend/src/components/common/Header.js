import React from 'react';
import styled from 'styled-components';
import { Server } from 'lucide-react';

const HeaderContainer = styled.header`
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  padding: 15px 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  justify-content: between;
  align-items: center;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
`;

const LogoIcon = styled.div`
  margin-right: 12px;
  display: flex;
  align-items: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
`;

const Subtitle = styled.span`
  font-size: 14px;
  opacity: 0.8;
  margin-left: 10px;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.1);
  padding: 8px 15px;
  border-radius: 20px;
  margin-left: auto;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$connected ? '#28a745' : '#dc3545'};
  margin-right: 8px;
  animation: ${props => props.$connected ? 'none' : 'pulse 2s infinite'};
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const StatusText = styled.span`
  font-size: 12px;
  font-weight: 500;
`;

const Header = ({ connectionStatus = 'Connected', isConnected = true }) => {
  return (
    <HeaderContainer>
      <Logo>
        <LogoIcon>
          <Server size={28} />
        </LogoIcon>
        <div>
          <Title>TES Dashboard</Title>
          <Subtitle>Task Execution Service Management</Subtitle>
        </div>
      </Logo>
      
      <StatusIndicator>
        <StatusDot $connected={isConnected} />
        <StatusText>{connectionStatus}</StatusText>
      </StatusIndicator>
    </HeaderContainer>
  );
};

export default Header;
