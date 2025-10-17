// SwapInterCam.ox - Frontend Application

// Check backend status on page load
async function checkBackendStatus() {
    const statusContainer = document.getElementById('status-container');
    
    try {
        statusContainer.innerHTML = '<p>Connecting to backend...</p>';
        
        const response = await fetch(API.getUrl('/health'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            statusContainer.innerHTML = `
                <p class="status-online">✓ Backend is ONLINE</p>
                <p><strong>Environment:</strong> ${data.env}</p>
                <p><strong>Commit:</strong> ${data.commit?.substring(0, 7)}</p>
                <p><strong>Services:</strong></p>
                <ul>
                    <li>MCP: ${data.services?.mcp || 'unknown'}</li>
                    <li>SWEP: ${data.services?.swep || 'unknown'}</li>
                    <li>Web: ${data.services?.web || 'unknown'}</li>
                </ul>
            `;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        statusContainer.innerHTML = `
            <p class="status-offline">✗ Backend is OFFLINE</p>
            <p>Error: ${error.message}</p>
            <p><small>The backend may be sleeping (normal for free tier). Try clicking "Test Backend Connection" to wake it up.</small></p>
        `;
    }
}

// Test API button handler
document.getElementById('test-api')?.addEventListener('click', async function() {
    const resultDiv = document.getElementById('api-result');
    const button = this;
    
    button.disabled = true;
    button.textContent = 'Testing...';
    resultDiv.innerHTML = '<p>Testing backend connection...</p>';
    
    try {
        // Test health endpoint
        const healthResponse = await fetch(API.getUrl('/health'));
        const healthData = await healthResponse.json();
        
        // Test MCP API
        const mcpResponse = await fetch(API.getApiUrl('/mcp/version'));
        const mcpData = await mcpResponse.json();
        
        // Test SWEP API
        const swepResponse = await fetch(API.getApiUrl('/swep/version'));
        const swepData = await swepResponse.json();
        
        // Display results
        resultDiv.innerHTML = `
            <strong>✓ All tests passed!</strong>
            
            <strong>Health Check:</strong>
            ${JSON.stringify(healthData, null, 2)}
            
            <strong>MCP API:</strong>
            ${JSON.stringify(mcpData, null, 2)}
            
            <strong>SWEP API:</strong>
            ${JSON.stringify(swepData, null, 2)}
        `;
        
        // Update status
        checkBackendStatus();
        
    } catch (error) {
        resultDiv.innerHTML = `
            <strong>✗ Test failed</strong>
            
            Error: ${error.message}
            
            This may be because:
            1. Backend is sleeping (free tier sleeps after 15 min)
            2. Backend is still starting up (wait 30 seconds)
            3. CORS configuration issue
            4. Network connectivity problem
            
            Check browser console for more details.
        `;
        console.error('API Test Error:', error);
    } finally {
        button.disabled = false;
        button.textContent = 'Test Backend Connection';
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('SwapInterCam.ox Frontend Loaded');
    console.log('API Base URL:', API.baseUrl);
    
    // Check backend status
    checkBackendStatus();
});

// Auto-refresh status every 30 seconds
setInterval(checkBackendStatus, 30000);
