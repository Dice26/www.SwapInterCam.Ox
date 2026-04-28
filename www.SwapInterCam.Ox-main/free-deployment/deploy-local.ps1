# SwapInterCam.ox - Local Testing Script
# Run this to test your deployment locally before pushing to Render/GitHub Pages

param(
    [string]$Port = "3000",
    [string]$StaticDir = "frontend",
    [string]$LogDir = "logs"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " SwapInterCam.ox - Local Deployment Test" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "[CHECK] Verifying Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
}
catch {
    Write-Host "✗ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✓ npm $npmVersion found" -ForegroundColor Green
}
catch {
    Write-Host "✗ npm not found! Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Navigate to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "[STEP 1] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Create directories if they don't exist
Write-Host "[STEP 2] Creating directories..." -ForegroundColor Yellow
if (-not (Test-Path $StaticDir)) {
    New-Item -ItemType Directory -Path $StaticDir | Out-Null
    Write-Host "✓ Created $StaticDir directory" -ForegroundColor Green
} else {
    Write-Host "✓ $StaticDir directory exists" -ForegroundColor Green
}

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
    Write-Host "✓ Created $LogDir directory" -ForegroundColor Green
} else {
    Write-Host "✓ $LogDir directory exists" -ForegroundColor Green
}
Write-Host ""

# Set environment variables
Write-Host "[STEP 3] Setting environment variables..." -ForegroundColor Yellow
$env:NODE_ENV = "development"
$env:PORT = $Port
$env:HOST = "0.0.0.0"
$env:STATIC_DIR = (Resolve-Path $StaticDir).Path
$env:LOG_DIR = (Resolve-Path $LogDir).Path
$env:API_BASE = "/api"
$env:AUDIT_TAG = "mcp-local"
$env:COMMIT_ID = "1593dde078969e57b9323a7cfdd847dcf9b1b867"

Write-Host "✓ Environment configured:" -ForegroundColor Green
Write-Host "  NODE_ENV: $env:NODE_ENV"
Write-Host "  PORT: $env:PORT"
Write-Host "  STATIC_DIR: $env:STATIC_DIR"
Write-Host "  LOG_DIR: $env:LOG_DIR"
Write-Host ""

# Start server
Write-Host "[STEP 4] Starting server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Server Starting on http://localhost:$Port" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test endpoints:" -ForegroundColor Yellow
Write-Host "  • Health: http://localhost:$Port/health"
Write-Host "  • MCP API: http://localhost:$Port/api/mcp/version"
Write-Host "  • SWEP API: http://localhost:$Port/api/swep/status"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

node server-unified.js
