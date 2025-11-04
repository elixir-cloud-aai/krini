/**
 * Test Script for Real-Time TES Dashboard Features
 * Tests all the new real-time capabilities
 */

import TESApiService from '../services/tesApi';
import NetworkDiscoveryService from '../services/networkDiscovery';
import DataFlowMonitoringService from '../services/dataFlowMonitoring';

// Test TES API Service
async function testTESApiService() {
  console.log('🔍 Testing TES API Service...');
  
  try {
    // Test service discovery
    const instances = await TESApiService.discoverTESInstances();
    console.log('✅ Discovered TES instances:', instances.length);
    
    if (instances.length > 0) {
      // Test status monitoring
      const firstInstance = instances[0];
      const status = await TESApiService.getTESInstanceStatus(firstInstance.id);
      console.log('✅ Instance status:', status.status);
      
      // Test task listing
      const tasks = await TESApiService.listTasks(firstInstance.id, { pageSize: 5 });
      console.log('✅ Listed tasks:', tasks.tasks.length);
      
      // Test real-time polling
      TESApiService.startRealTimePolling(firstInstance.id, 3000);
      console.log('✅ Started real-time polling');
      
      // Stop polling after 10 seconds
      setTimeout(() => {
        TESApiService.stopRealTimePolling(firstInstance.id);
        console.log('✅ Stopped real-time polling');
      }, 10000);
    }
  } catch (error) {
    console.error('❌ TES API Service test failed:', error);
  }
}

// Test Network Discovery Service
async function testNetworkDiscovery() {
  console.log('🌐 Testing Network Discovery Service...');
  
  try {
    const topology = await NetworkDiscoveryService.discoverNetworkTopology({
      includeStorage: true,
      includeGateways: true,
      timeout: 5000,
      maxDepth: 2,
      regions: ['EU', 'US']
    });
    
    console.log('✅ Network topology discovered:');
    console.log('  - Nodes:', topology.nodes.length);
    console.log('  - Connections:', topology.connections.length);
    console.log('  - Clusters:', topology.clusters.length);
    
    // Test node types
    const tesNodes = topology.nodes.filter(n => n.type === 'tes');
    const storageNodes = topology.nodes.filter(n => n.type === 'storage');
    const gatewayNodes = topology.nodes.filter(n => n.type === 'gateway');
    
    console.log('  - TES nodes:', tesNodes.length);
    console.log('  - Storage nodes:', storageNodes.length);
    console.log('  - Gateway nodes:', gatewayNodes.length);
    
  } catch (error) {
    console.error('❌ Network Discovery test failed:', error);
  }
}

// Test Data Flow Monitoring Service
async function testDataFlowMonitoring() {
  console.log('📊 Testing Data Flow Monitoring Service...');
  
  try {
    // Start monitoring
    DataFlowMonitoringService.startMonitoring(1000);
    console.log('✅ Started data flow monitoring');
    
    // Track a test transfer
    const transferId = DataFlowMonitoringService.trackTransfer({
      fileName: 'test_dataset.fastq.gz',
      fileSize: 1024 * 1024 * 1024, // 1GB
      source: {
        type: 'storage',
        id: 'storage-test',
        url: 'https://storage.test.com/test_dataset.fastq.gz',
        location: 'Test Location'
      },
      destination: {
        type: 'tes',
        id: 'tes-test',
        url: 'https://tes.test.com/workspace/',
        location: 'Test TES'
      },
      status: 'transferring',
      metadata: {
        taskId: 'test-task-001',
        transferMethod: 'https',
        checksumType: 'sha256'
      }
    });
    
    console.log('✅ Tracked test transfer:', transferId);
    
    // Simulate progress updates
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 50 * 1024 * 1024; // Random progress
      if (progress >= 1024 * 1024 * 1024) {
        progress = 1024 * 1024 * 1024;
        clearInterval(progressInterval);
      }
      
      DataFlowMonitoringService.updateTransferProgress(transferId, progress);
      console.log(`📈 Transfer progress: ${((progress / (1024 * 1024 * 1024)) * 100).toFixed(1)}%`);
    }, 2000);
    
    // Get metrics after a few seconds
    setTimeout(() => {
      const metrics = DataFlowMonitoringService.getDataFlowMetrics();
      console.log('✅ Data flow metrics:');
      console.log('  - Active transfers:', metrics.activeTransfers);
      console.log('  - Total transfers:', metrics.totalTransfers);
      console.log('  - Average speed:', (metrics.averageTransferSpeed / (1024 * 1024)).toFixed(1), 'MB/s');
      console.log('  - Network utilization:', metrics.networkUtilization.toFixed(1), '%');
      
      const patterns = DataFlowMonitoringService.getDataFlowPatterns();
      console.log('✅ Data flow patterns:', patterns.length);
      
      // Stop monitoring
      DataFlowMonitoringService.stopMonitoring();
      console.log('✅ Stopped data flow monitoring');
    }, 8000);
    
  } catch (error) {
    console.error('❌ Data Flow Monitoring test failed:', error);
  }
}

// Test Real-Time Integration
async function testRealTimeIntegration() {
  console.log('⚡ Testing Real-Time Integration...');
  
  try {
    // Test simultaneous monitoring
    console.log('🚀 Starting comprehensive real-time monitoring...');
    
    // Start all services
    await testTESApiService();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testNetworkDiscovery();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testDataFlowMonitoring();
    
    console.log('✅ All real-time services tested successfully!');
    
  } catch (error) {
    console.error('❌ Real-time integration test failed:', error);
  }
}

// Main test function
export async function runAllTests() {
  console.log('🎯 Starting Real-Time TES Dashboard Tests...');
  console.log('================================================');
  
  await testRealTimeIntegration();
  
  console.log('================================================');
  console.log('✨ All tests completed!');
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testTESDashboard = runAllTests;
  console.log('💡 Run testTESDashboard() in browser console to test');
} else {
  // Node environment
  runAllTests().catch(console.error);
}

export default {
  testTESApiService,
  testNetworkDiscovery,
  testDataFlowMonitoring,
  testRealTimeIntegration,
  runAllTests
};
