# SwapInterCam.ox – Web Platform

This repository contains the production-ready **web version** of SwapInterCam.ox, tied to commit `1593dde078969e57b9323a7cfdd847dcf9b1b867`.

---

## 📦 Project Structure

```
SwapInterCam.ox/
├─ src/
│  ├─ backend/              # MCP Backend Server (Port 8001)
│  │  ├─ server.js          # Main MCP server - Single Source of Truth
│  │  ├─ state-manager.js   # State management with persistence
│  │  ├─ action-executor.js # Action execution engine
│  │  ├─ logging-system.js  # Comprehensive logging
│  │  ├─ modules/           # Auto-recovery modules
│  │  └─ persistence/       # State backup system
│  ├─ renderer/             # Frontend components
│  │  ├─ components/        # UI components (30+)
│  │  └─ *.html             # Web interfaces
│  └─ main/                 # Main process services
├─ assets/                  # Branding, logos, icons
├─ web-production-server.js # Web Server (Port 3000)
├─ swep-server.js           # SWEP Service (Port 8000)
├─ START-SWAPINTERCAM-WEB.bat # Launch script
├─ INSTALL.bat              # Dependency installer
├─ package.json             # Dependencies & scripts
├─ .gitignore               # Git exclusions
└─ README.md                # This file
```

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/www.SwapInterCam.Ox.git
cd www.SwapInterCam.Ox
```

### 2. Install dependencies
```bash
npm install
```

Or on Windows, run:
```cmd
INSTALL.bat
```

### 3. Configure environment (Optional)
Create a `.env` file in the project root for custom settings:

```env
# Server Configuration
BACKEND_PORT=8001
SWEP_PORT=8000
WEB_PORT=3000

# Email Configuration (Optional)
EMAIL_HOST=smtp.example.com
EMAIL_USER=contact@swapintercam.ox
EMAIL_PASS=your_password_here
CONTACT_EMAIL=support@swapintercam.ox

# Logging
LOG_LEVEL=info
```

⚠️ **Never commit `.env`** — it's excluded via `.gitignore`.

### 4. Launch the platform

**Windows:**
```cmd
START-SWAPINTERCAM-WEB.bat
```

**Linux/Mac:**
```bash
npm run backend:start &
npm run swep:start &
npm start
```

---

## 📡 Services Architecture

### 🔌 MCP Backend Server (Port 8001)
- **Single Source of Truth** for system state
- 25+ REST API endpoints
- WebSocket real-time updates
- Auto-recovery modules (Camera, OBS, Window)
- State persistence with crash recovery
- Comprehensive logging & monitoring

### 🔐 SWEP Service (Port 8000)
- Authentication & security layer
- Camera device management
- System integration API
- CORS-enabled for web access

### 🌐 Web Production Server (Port 3000)
- Express web server
- API proxy to MCP server
- WebSocket proxy for real-time updates
- Static file serving
- Multiple interface routes

---

## 🌐 Web Interfaces

After launching, access these interfaces:

- **Main Dashboard**: http://localhost:3000
- **Face Swap Studio**: http://localhost:3000/face-swap
- **Chat Integration**: http://localhost:3000/chat
- **Monitoring Dashboard**: http://localhost:3000/monitoring

---

## 📬 API Endpoints

### Health & Status
- `GET /api/health` - Server health check
- `GET /api/state` - Current system state
- `GET /api/status` - Detailed status

### Camera Management
- `GET /api/cameras` - List available cameras
- `POST /api/camera/select` - Select camera
- `GET /api/camera/preview` - Camera preview stream

### Face Swap
- `POST /api/face-swap/start` - Start face swap
- `POST /api/face-swap/stop` - Stop face swap
- `GET /api/face-swap/status` - Face swap status

### System Control
- `POST /api/action/execute` - Execute system action
- `GET /api/logs` - Retrieve system logs
- `GET /api/metrics` - Performance metrics

Full API documentation: See `src/backend/server.js`

---

## 🛠️ Development Scripts

```bash
# Start services individually
npm run backend:start      # Start MCP backend
npm run swep:start         # Start SWEP service
npm start                  # Start web server

# Development mode
npm run backend:dev        # Backend with auto-reload
npm run dev                # Web server with dev mode

# Testing
npm run test               # Run tests
npm run smoke-test         # Quick smoke test

# Monitoring
npm run monitoring         # Start monitoring dashboard
npm run backend:status     # Check backend status
```

---

## 📬 Contact & Support

For support or inquiries:
- **Email**: contact@swapintercam.ox
- **Website**: https://swapintercam.ox
- **Issues**: https://github.com/<your-username>/www.SwapInterCam.Ox/issues

---

## 🔒 Security Notes

### For Contributors:
1. **Always audit staged files** before committing:
   ```bash
   git add -n .
   ```

2. **Keep secrets in `.env`**, never in source code

3. **Review `.gitignore`** to ensure sensitive files are excluded

4. **Document new features** in this README or relevant docs

### Environment Variables:
- All sensitive data goes in `.env`
- Use `.env.example` as a template (without real values)
- Never commit API keys, passwords, or tokens

---

## 🏗️ Architecture Highlights

### Backend-Centric Design
- MCP server is the **Single Source of Truth**
- All state changes flow through backend
- Frontend components are stateless consumers

### Real-Time Updates
- WebSocket connections for live data
- State synchronization across clients
- Event-driven architecture

### Auto-Recovery System
- Camera disconnection recovery
- OBS crash recovery
- Window focus recovery
- Automatic state restoration

### Persistence Layer
- Auto-save every 30 seconds
- Crash recovery with backups
- Maximum 10 backup files retained

---

## 📋 System Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **OS**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for installation

---

## 🚀 Deployment

### Local Development
Already covered in "Getting Started" above.

### Production Deployment
1. Set `NODE_ENV=production` in `.env`
2. Configure production ports and domains
3. Set up SSL certificates (recommended)
4. Use process manager (PM2 recommended):
   ```bash
   npm install -g pm2
   pm2 start src/backend/server.js --name mcp-backend
   pm2 start swep-server.js --name swep-service
   pm2 start web-production-server.js --name web-server
   ```

### Docker Deployment (Coming Soon)
Docker support is planned for future releases.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- Node.js & Express
- WebSocket (ws)
- Socket.io
- Winston (logging)
- And many other open-source libraries

---

**Version**: 1.0.0  
**Last Updated**: October 17, 2025  
**Commit**: 1593dde078969e57b9323a7cfdd847dcf9b1b867
