// SwapInterCam.ox - API Configuration
// Update this with your actual Render backend URL after deployment

const API_CONFIG = {
    // Development (local)
    development: {
        baseUrl: 'http://localhost:3000',
        apiBase: '/api'
    },
    
    // Production (Render.com)
    production: {
        baseUrl: 'https://swapintercam.onrender.com',
        apiBase: '/api'
    }
};

// Auto-detect environment
const ENV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'development' 
    : 'production';

// Export configuration
const API = {
    baseUrl: API_CONFIG[ENV].baseUrl,
    apiBase: API_CONFIG[ENV].apiBase,
    
    // Helper methods
    getUrl: (path) => `${API.baseUrl}${path}`,
    getApiUrl: (path) => `${API.baseUrl}${API.apiBase}${path}`,
    
    // Endpoints
    endpoints: {
        health: '/health',
        mcpVersion: '/api/mcp/version',
        mcpStatus: '/api/mcp/status',
        swepVersion: '/api/swep/version',
        swepStatus: '/api/swep/status'
    }
};

console.log('API Configuration:', {
    environment: ENV,
    baseUrl: API.baseUrl,
    apiBase: API.apiBase
});
