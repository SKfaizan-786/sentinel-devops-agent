const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000';
const SECRET = process.env.ALERTMANAGER_SECRET || 'test-secret';

async function testWebhook() {
    console.log('Testing Webhook Security...');
    
    // 1. Test missing header
    try {
        await axios.post(`${BASE_URL}/api/webhooks/alertmanager`, { alerts: [] });
        console.error('FAIL: Webhook accepted without token');
    } catch (err) {
        if (err.response?.status === 401) console.log('PASS: Webhook rejected missing token');
        else console.error('FAIL: Unexpected error on missing token:', err.message);
    }

    // 2. Test valid header
    try {
        const res = await axios.post(`${BASE_URL}/api/webhooks/alertmanager`, {
            alerts: [{
                status: 'firing',
                labels: { alertname: 'TestAlert', severity: 'critical', instance: 'test-node' },
                annotations: { summary: 'This is a test' }
            }]
        }, {
            headers: { 'X-Sentinel-Token': SECRET }
        });
        if (res.status === 200) console.log('PASS: Webhook accepted valid token');
    } catch (err) {
        console.error('FAIL: Webhook rejected valid token:', err.response?.data || err.message);
    }
}

async function testMetrics() {
    console.log('\nTesting Metrics Endpoint...');
    try {
        const res = await axios.get(`${BASE_URL}/metrics`);
        if (res.data.includes('sentinel_incidents_total')) {
            console.log('PASS: Metrics endpoint contains sentinel_incidents_total');
        } else {
            console.error('FAIL: Metrics endpoint missing sentinel_incidents_total');
        }
        if (res.data.includes('sentinel_mttr_seconds')) {
            console.log('PASS: Metrics endpoint contains sentinel_mttr_seconds');
        } else {
            console.error('FAIL: Metrics endpoint missing sentinel_mttr_seconds');
        }
    } catch (err) {
        console.error('FAIL: Could not reach metrics endpoint:', err.message);
    }
}

async function runTests() {
    console.log('Starting verification...\n');
    await testWebhook();
    await testMetrics();
}

runTests().catch(console.error);
