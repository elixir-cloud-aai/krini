import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #dc3545;
  border: 1px solid #ddd;
  margin: 20px;
`;

const ErrorIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #ffe6e6;
  margin-bottom: 16px;
`;

const ErrorIcon = styled(AlertTriangle)`
  color: #dc3545;
`;

const ErrorTitle = styled.h3`
  color: #333;
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
`;

const ErrorText = styled.p`
  color: #666;
  margin: 0 0 24px 0;
  text-align: center;
  line-height: 1.5;
  font-size: 14px;
  max-width: 400px;
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #c82333;
  }

  &:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
`;

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  showRetry?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Try Again',
  showRetry = true
}) => {
  return (
    <ErrorContainer>
      <ErrorIconWrapper>
        <ErrorIcon size={48} />
      </ErrorIconWrapper>
      <ErrorTitle>{title}</ErrorTitle>
      <ErrorText>{message}</ErrorText>
      {showRetry && onRetry && (
        <RetryButton onClick={onRetry}>
          <RefreshCw size={18} />
          {retryLabel}
        </RetryButton>
      )}
    </ErrorContainer>
  );
};

export default ErrorMessage;
