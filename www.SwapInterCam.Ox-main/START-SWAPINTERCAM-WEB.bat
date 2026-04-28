@echo off
title SwapInterCam.ox Web Platform
echo Starting SwapInterCam.ox Web Platform...
echo.
set PATH=C:\Program Files\nodejs;%PATH%
echo 🔌 Starting MCP Server (Port 8001)...
start "SwapInterCam-MCP" /min cmd /k ""C:\Program Files\nodejs\node.exe" src/backend/server.js"
timeout /t 8 /nobreak >nul
echo 🔐 Starting SWEP Server (Port 8000)...
start "SwapInterCam-SWEP" /min cmd /k ""C:\Program Files\nodejs\node.exe" swep-server.js"
timeout /t 5 /nobreak >nul
echo 🌐 Starting Web Server (Port 3000)...
start "SwapInterCam-Web" cmd /k ""C:\Program Files\nodejs\node.exe" web-production-server.js"
timeout /t 5 /nobreak >nul
echo 🌐 Opening Web Browser...
start http://localhost:3000
echo.
echo ✅ SwapInterCam.ox Web Platform Started!
echo    🌐 Web Interface: http://localhost:3000
echo    🔌 MCP Server: http://127.0.0.1:8001
pause
