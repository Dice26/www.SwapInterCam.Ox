@echo off
title SwapInterCam.ox - Local Test
color 0A
echo.
echo ========================================
echo  SwapInterCam.ox - Local Test
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo   Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed!
    echo.
    pause
    exit /b 1
)

echo [OK] npm found
npm --version
echo.

echo ========================================
echo  Installing Dependencies
echo ========================================
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo ========================================
echo  Creating Directories
echo ========================================
echo.
if not exist "frontend" mkdir frontend
if not exist "logs" mkdir logs
echo [OK] Directories created
echo.

echo ========================================
echo  Starting Server
echo ========================================
echo.
echo Server will start on: http://localhost:3000
echo.
echo Test endpoints:
echo   - Health: http://localhost:3000/health
echo   - MCP API: http://localhost:3000/api/mcp/version
echo   - SWEP API: http://localhost:3000/api/swep/status
echo.
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

REM Set environment variables
set NODE_ENV=development
set PORT=3000
set HOST=0.0.0.0
set STATIC_DIR=frontend
set API_BASE=/api
set LOG_DIR=logs
set AUDIT_TAG=mcp-local
set COMMIT_ID=1593dde078969e57b9323a7cfdd847dcf9b1b867

REM Start the server
node server-unified.js

pause
