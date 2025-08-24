#!/usr/bin/env node

const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve(data); 
        }
      });
    }).on('error', reject);
  });
}

async function testDashboard() {
  console.log('🧪 Testing TES Dashboard Integration...\n');
  
  const tests = [
    {
      name: 'Connection Test',
      url: 'http://localhost:8080/api/test_connection',
      validate: (data) => data.status === 'success'
    },
    {
      name: 'Dashboard Data',
      url: 'http://localhost:8080/api/dashboard_data',
      validate: (data) => data.tes_instances && data.tasks && data.workflow_runs
    },
    {
      name: 'TES Locations',
      url: 'http://localhost:8080/api/tes_locations',
      validate: (data) => Array.isArray(data) && data.length > 0
    },
    {
      name: 'Batch Runs',
      url: 'http://localhost:8080/api/batch_runs',
      validate: (data) => Array.isArray(data)
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const startTime = Date.now();
      const result = await makeRequest(test.url);
      const duration = Date.now() - startTime;
      
      if (test.validate(result)) {
        console.log(`✅ ${test.name} - PASSED (${duration}ms)`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED - Invalid response structure`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Dashboard is working correctly.');
    console.log('🌐 Frontend: http://localhost:3000/federated-analytics-showcase');
    console.log('🔧 Backend API: http://localhost:8080');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
}

testDashboard().catch(console.error);
