import React from 'react';
import styled from 'styled-components';
import { AlertCircle, X } from 'lucide-react';

const ErrorContainer = styled.div`
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  color: #721c24;
`;

const IconContainer = styled.div`
  margin-right: 10px;
  flex-shrink: 0;
`;

const MessageContainer = styled.div`
  flex-grow: 1;
`;

const Title = styled.h4`
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
`;

const Message = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
  color: #721c24;
  
  &:hover {
    opacity: 0.7;
  }
`;

const ErrorMessage = ({ 
  title = 'Error', 
  message, 
  error, 
  onClose,
  className = '' 
}) => {
  const displayMessage = message || (error && error.message) || 'An unexpected error occurred';
  
  return (
    <ErrorContainer className={className}>
      <IconContainer>
        <AlertCircle size={20} />
      </IconContainer>
      <MessageContainer>
        <Title>{title}</Title>
        <Message>{displayMessage}</Message>
        {error && error.response && error.response.data && (
          <Message style={{ marginTop: '5px', fontSize: '12px', opacity: 0.8 }}>
            {JSON.stringify(error.response.data)}
          </Message>
        )}
      </MessageContainer>
      {onClose && (
        <CloseButton onClick={onClose}>
          <X size={18} />
        </CloseButton>
      )}
    </ErrorContainer>
  );
};

export default ErrorMessage;
