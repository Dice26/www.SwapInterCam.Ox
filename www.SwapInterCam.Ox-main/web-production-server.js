const express = require('express');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const app = express();
const PORT = 3000;
const MCP_SERVER_URL = 'http://127.0.0.1:8001';

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/config', express.static(path.join(__dirname, 'config')));

// Main web interface
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'web-production-interface.html')));
app.get('/face-swap', (req, res) => res.sendFile(path.join(__dirname, 'web-face-swap-production.html')));
app.get('/monitoring', (req, res) => res.sendFile(path.join(__dirname, 'web-monitoring-dashboard.html')));

// API Proxy to MCP Server (All 25+ endpoints)
app.use('/api', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const mcpUrl = MCP_SERVER_URL + req.originalUrl;
    const response = await fetch(mcpUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({error: 'MCP Server connection failed', details: error.message});
  }
});

// WebSocket proxy for real-time updates
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Web client connected to WebSocket');
  const mcpWs = new WebSocket('ws://127.0.0.1:8001/ws');
  mcpWs.on('message', (data) => ws.send(data));
  ws.on('close', () => mcpWs.close());
});

server.listen(PORT, () => {
  console.log(`🌐 SwapInterCam Web Production Server: http://localhost:${PORT}`);
  console.log(`🔌 MCP Server Integration: ${MCP_SERVER_URL}`);
  console.log(`📡 WebSocket Real-time Updates: ws://localhost:${PORT}`);
});// Chat Integration Route 
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'web-chat-integration.html'))); 
