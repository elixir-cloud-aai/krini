#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing CORS Configuration...\n');

// Test if backend is running
function testBackend() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/test_connection',
            method: 'GET',
            headers: {
                'Origin': 'http://localhost:3001',
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            console.log('✅ Backend Response Status:', res.statusCode);
            console.log('🔧 CORS Headers:');
            console.log('   Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
            console.log('   Access-Control-Allow-Methods:', res.headers['access-control-allow-methods']);
            console.log('   Access-Control-Allow-Headers:', res.headers['access-control-allow-headers']);
            console.log('');
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('📦 Backend Response:', response);
                    resolve(response);
                } catch (e) {
                    console.log('📦 Raw Response:', data);
                    resolve(data);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Backend connection failed:', error.message);
            reject(error);
        });

        req.end();
    });
}

// Test CORS preflight
function testPreflightCORS() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/test_connection',
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3001',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        };

        const req = http.request(options, (res) => {
            console.log('🚀 Preflight Response Status:', res.statusCode);
            console.log('🔧 Preflight CORS Headers:');
            console.log('   Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
            console.log('   Access-Control-Allow-Methods:', res.headers['access-control-allow-methods']);
            console.log('   Access-Control-Allow-Headers:', res.headers['access-control-allow-headers']);
            console.log('');
            
            resolve(res.statusCode === 200);
        });

        req.on('error', (error) => {
            console.log('❌ Preflight request failed:', error.message);
            reject(error);
        });

        req.end();
    });
}

async function runTests() {
    try {
        console.log('1. Testing backend connection...');
        await testBackend();
        
        console.log('\n2. Testing CORS preflight...');
        await testPreflightCORS();
        
        console.log('\n🎉 Tests completed!');
        console.log('\n💡 If CORS headers are present, the issue might be on the frontend side.');
        console.log('💡 If CORS headers are missing, the backend CORS config needs to be fixed.');
        
    } catch (error) {
        console.log('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
