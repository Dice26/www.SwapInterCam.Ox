# SwapInterCam.ox - Test Live Deployment
# Run this after deploying to Render and GitHub Pages

param(
    [string]$BackendUrl = "https://swapintercam.onrender.com",
    [string]$FrontendUrl = "https://yourname.github.io/www.SwapInterCam.Ox"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " SwapInterCam.ox - Deployment Test" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  URL: $Url"
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 30 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ PASS - Status: $($response.StatusCode)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ FAIL - Status: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Backend Tests (Render)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test backend health
if (Test-Endpoint "Backend Health Check" "$BackendUrl/health") {
    $passed++
} else {
    $failed++
}
Write-Host ""

# Test MCP API
if (Test-Endpoint "MCP API Version" "$BackendUrl/api/mcp/version") {
    $passed++
} else {
    $failed++
}
Write-Host ""

# Test SWEP API
if (Test-Endpoint "SWEP API Status" "$BackendUrl/api/swep/status") {
    $passed++
} else {
    $failed++
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Frontend Tests (GitHub Pages)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test frontend
if (Test-Endpoint "Frontend Homepage" $FrontendUrl) {
    $passed++
} else {
    $failed++
}
Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Test Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✓ All tests passed! Deployment is working." -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed. Check the errors above." -ForegroundColor Red
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open frontend in browser: $FrontendUrl"
Write-Host "  2. Check browser console for errors"
Write-Host "  3. Test API calls from frontend"
Write-Host "  4. Monitor Render logs for backend issues"
Write-Host ""
