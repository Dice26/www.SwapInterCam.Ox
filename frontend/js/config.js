// SwapInterCam.ox - API Configuration
// Update the production baseUrl with your actual Render backend URL after deployment

const API_CONFIG = {
    // Development (local)
    development: {
        baseUrl: 'http://localhost:3000',
        wsBase: 'ws://localhost:3000',
        apiBase: '/api'
    },

    // Production (Render.com)
    production: {
        baseUrl: 'https://www-swapintercam-ox.onrender.com',
        wsBase: 'wss://www-swapintercam-ox.onrender.com',
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
    wsBase: API_CONFIG[ENV].wsBase,
    apiBase: API_CONFIG[ENV].apiBase,

    // Helper methods
    getUrl: (path) => `${API.baseUrl}${path}`,
    getApiUrl: (path) => `${API.baseUrl}${API.apiBase}${path}`,
    getWsUrl: (path = '') => `${API.wsBase}${path}`,

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
    wsBase: API.wsBase,
    apiBase: API.apiBase
});
