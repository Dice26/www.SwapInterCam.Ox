#!/usr/bin/env node

/**
 * Test deployment status and endpoints
 */

const https = require('https');

const BASE_URL = 'https://www-swapintercam-ox.onrender.com';

async function testEndpoint(path) {
    return new Promise((resolve) => {
        const url = `${BASE_URL}${path}`;
        console.log(`Testing: ${url}`);

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`✅ ${path} - Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`   Response: ${JSON.stringify(json, null, 2)}`);
                    } catch (e) {
                        console.log(`   Response: ${data.substring(0, 100)}...`);
                    }
                } else {
                    console.log(`   Error: ${data}`);
                }
                resolve({ status: res.statusCode, data });
            });
        }).on('error', (err) => {
            console.log(`❌ ${path} - Error: ${err.message}`);
            resolve({ error: err.message });
        });
    });
}

async function runTests() {
    console.log('🔍 Testing SwapInterCam.ox Deployment\n');

    const endpoints = [
        '/',
        '/health',
        '/api/mcp/version',
        '/api/mcp/status',
        '/api/swep/version',
        '/api/swep/status'
    ];

    for (const endpoint of endpoints) {
        await testEndpoint(endpoint);
        console.log('');
    }

    console.log('✅ Deployment test complete!');
}

runTests().catch(console.error);