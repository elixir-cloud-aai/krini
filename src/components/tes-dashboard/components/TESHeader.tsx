import React from 'react';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';

const HeaderContainer = styled.header`
  background-color: #1a202c;
  color: white;
  padding: 16px 24px;
  margin-top: 100px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LogoIcon = styled.div`
  background-color: #007bff;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 16px;
`;

const LogoText = styled.div``;

const Title = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: white;
`;

const Subtitle = styled.p`
  margin: 0;
  margin-top: 2px;
  font-size: 14px;
  opacity: 0.8;
  font-weight: 400;
`;

const StatusArea = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ConnectionStatus = styled.div<{ isConnected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  background-color: ${props => props.isConnected ? '#d4edda' : '#f8d7da'};
  color: ${props => props.isConnected ? '#155724' : '#721c24'};
  border: 1px solid ${props => props.isConnected ? '#c3e6cb' : '#f5c6cb'};
`;

const StatusIndicator = styled.div<{ isConnected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.isConnected ? '#28a745' : '#dc3545'};
`;

const TestButton = styled.button`
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface TESHeaderProps {
  connectionStatus: string;
  isConnected: boolean;
  onTestConnection?: () => void;
  testingConnection?: boolean;
}

const TESHeader: React.FC<TESHeaderProps> = ({
  connectionStatus,
  isConnected,
  onTestConnection,
  testingConnection = false
}) => {
  return (
    <HeaderContainer>
      <Logo>
        <LogoIcon>TES</LogoIcon>
        <LogoText>
          <Title>TES Dashboard</Title>
          <Subtitle>Task Execution Service Management</Subtitle>
        </LogoText>
      </Logo>
      
      <StatusArea>
        <ConnectionStatus isConnected={isConnected}>
          <StatusIndicator isConnected={isConnected} />
          {connectionStatus}
        </ConnectionStatus>
        
        {onTestConnection && (
          <TestButton 
            onClick={onTestConnection}
            disabled={testingConnection}
          >
            <RefreshCw size={14} />
            Test Connection
          </TestButton>
        )}
      </StatusArea>
    </HeaderContainer>
  );
};

export default TESHeader;
