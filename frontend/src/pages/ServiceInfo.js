import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Info, Server, Database, Code, RefreshCw, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { serviceInfoService } from '../services/serviceInfoService';
import { TES_INSTANCES } from '../utils/constants';

const ServiceInfoContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.div``;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #4b5563;
  font-size: 1rem;
`;

const InstanceSelector = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #374151;
  min-width: 300px;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const RefreshButton = styled.button`
  background: #2563eb;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  margin-left: 1rem;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const ServiceInfoCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const InfoSection = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
`;

const InfoSectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-weight: 500;
  color: #222b45;
  text-align: right;
  max-width: 200px;
  word-break: break-all;
`;

const JsonViewer = styled.pre`
  background: #1f2937;
  color: #e5e7eb;
  padding: 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-size: 0.875rem;
  line-height: 1.6;
  margin-top: 1rem;
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const ErrorCard = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
`;

const ServiceInfo = () => {
  const [selectedInstance, setSelectedInstance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serviceInfo, setServiceInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    if (TES_INSTANCES.length > 0 && !selectedInstance) {
      setSelectedInstance(TES_INSTANCES[0].url);
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedInstance) {
      loadServiceInfo();
    }
  }, [selectedInstance]);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadServiceInfo = async () => {
    if (!selectedInstance) return;

    try {
      setLoading(true);
      setError('');
      const info = await serviceInfoService.getServiceInfo(selectedInstance);
      setServiceInfo(info);
    } catch (err) {
      setError(`Failed to load service info: ${err.message}`);
      setServiceInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDebugInfo = async () => {
    try {
      const info = await serviceInfoService.getDebugInfo();
      setDebugInfo(info);
    } catch (err) {
      console.error('Failed to load debug info:', err);
    }
  };

  const formatServiceInfo = (info) => {
    if (!info) return null;

    const basicInfo = {
      'Service Name': info.name || 'Unknown',
      'Service Version': info.version || 'Unknown',
      'Service ID': info.id || 'Unknown',
      'Organization Name': info.organization?.name || 'Unknown',
      'Organization URL': info.organization?.url || 'Unknown',
      'Contact URL': info.contactUrl || 'Unknown',
      'Documentation URL': info.documentationUrl || 'Unknown',
    };

    const apiInfo = {
      'API Version': info.type?.version || 'Unknown',
      'API Group': info.type?.group || 'Unknown',
      'API Artifact': info.type?.artifact || 'Unknown',
    };

    const storageInfo = {
      'Storage Type': info.storage?.join(', ') || 'Unknown',
    };

    return { basicInfo, apiInfo, storageInfo };
  };

  const selectedInstanceName = TES_INSTANCES.find(i => i.url === selectedInstance)?.name || 'Unknown';

  return (
    <ServiceInfoContainer>
      <Header>
        <HeaderLeft>
          <Title>Service Information</Title>
          <Subtitle>View detailed information about TES service instances</Subtitle>
        </HeaderLeft>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <InstanceSelector
            value={selectedInstance}
            onChange={(e) => setSelectedInstance(e.target.value)}
          >
            <option value="">Select TES Instance</option>
            {TES_INSTANCES.map((instance, idx) => (
              <option key={idx} value={instance.url}>
                {instance.name} ({instance.url})
              </option>
            ))}
          </InstanceSelector>
          <RefreshButton onClick={loadServiceInfo} disabled={loading || !selectedInstance}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </div>
      </Header>

      {error && (
        <ErrorCard>
          <AlertTriangle size={16} />
          {error}
        </ErrorCard>
      )}

      {selectedInstance && (
        <ServiceInfoCard>
          <SectionTitle>
            <Info size={20} />
            Service Information - {selectedInstanceName}
          </SectionTitle>

          {loading ? (
            <LoadingSpinner />
          ) : serviceInfo ? (
            (() => {
              const formattedInfo = formatServiceInfo(serviceInfo);
              return (
                <InfoGrid>
                  <InfoSection>
                    <InfoSectionTitle>
                      <Server size={16} />
                      Basic Information
                    </InfoSectionTitle>
                    {Object.entries(formattedInfo.basicInfo).map(([key, value]) => (
                      <InfoItem key={key}>
                        <InfoLabel>{key}</InfoLabel>
                        <InfoValue>{value}</InfoValue>
                      </InfoItem>
                    ))}
                  </InfoSection>

                  <InfoSection>
                    <InfoSectionTitle>
                      <Code size={16} />
                      API Information
                    </InfoSectionTitle>
                    {Object.entries(formattedInfo.apiInfo).map(([key, value]) => (
                      <InfoItem key={key}>
                        <InfoLabel>{key}</InfoLabel>
                        <InfoValue>{value}</InfoValue>
                      </InfoItem>
                    ))}
                  </InfoSection>

                  <InfoSection>
                    <InfoSectionTitle>
                      <Database size={16} />
                      Storage Information
                    </InfoSectionTitle>
                    {Object.entries(formattedInfo.storageInfo).map(([key, value]) => (
                      <InfoItem key={key}>
                        <InfoLabel>{key}</InfoLabel>
                        <InfoValue>{value}</InfoValue>
                      </InfoItem>
                    ))}
                  </InfoSection>
                </InfoGrid>
              );
            })()
          ) : selectedInstance ? (
            <NoDataMessage>
              No service information available for this instance
            </NoDataMessage>
          ) : null}

          {serviceInfo && (
            <div>
              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontWeight: 600 }}>
                Raw Service Info (JSON)
              </h3>
              <JsonViewer>
                {JSON.stringify(serviceInfo, null, 2)}
              </JsonViewer>
            </div>
          )}
        </ServiceInfoCard>
      )}

      {debugInfo && (
        <ServiceInfoCard>
          <SectionTitle>
            <Code size={20} />
            Debug Information
          </SectionTitle>

          <InfoGrid>
            <InfoSection>
              <InfoSectionTitle>
                Environment Variables
              </InfoSectionTitle>
              {debugInfo.environment ? (
                Object.entries(debugInfo.environment).map(([key, value]) => (
                  <InfoItem key={key}>
                    <InfoLabel>{key}</InfoLabel>
                    <InfoValue>{value || '(empty)'}</InfoValue>
                  </InfoItem>
                ))
              ) : (
                <p>No environment information available</p>
              )}
            </InfoSection>

            <InfoSection>
              <InfoSectionTitle>
                System Information
              </InfoSectionTitle>
              {debugInfo.system ? (
                Object.entries(debugInfo.system).map(([key, value]) => (
                  <InfoItem key={key}>
                    <InfoLabel>{key}</InfoLabel>
                    <InfoValue>{String(value)}</InfoValue>
                  </InfoItem>
                ))
              ) : (
                <p>No system information available</p>
              )}
            </InfoSection>
          </InfoGrid>

          {debugInfo && (
            <div>
              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontWeight: 600 }}>
                Raw Debug Info (JSON)
              </h3>
              <JsonViewer>
                {JSON.stringify(debugInfo, null, 2)}
              </JsonViewer>
            </div>
          )}
        </ServiceInfoCard>
      )}
    </ServiceInfoContainer>
  );
};

export default ServiceInfo;
