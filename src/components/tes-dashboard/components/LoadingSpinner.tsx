import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
  margin: 20px;
`;

const Spinner = styled.div`
  border: 3px solid #f0f0f0;
  border-top: 3px solid #0066cc;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
  margin-top: 16px;
  margin-bottom: 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
`;

const LoadingSubtext = styled.p`
  margin: 8px 0 0 0;
  color: #666;
  font-size: 14px;
  font-weight: 400;
  text-align: center;
`;

interface LoadingSpinnerProps {
  message?: string;
  subtext?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  subtext = 'Please wait while we fetch the data'
}) => {
  return (
    <SpinnerContainer>
      <Spinner />
      <LoadingText>{message}</LoadingText>
      <LoadingSubtext>{subtext}</LoadingSubtext>
    </SpinnerContainer>
  );
};

export default LoadingSpinner;
