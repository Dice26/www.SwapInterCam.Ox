# SwapInterCam.ox - Free Tier Usage Monitor
# Check your free tier usage and limits

param(
    [string]$BackendUrl = "https://swapintercam.onrender.com"
)

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " SwapInterCam.ox - Free Tier Monitor" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# GitHub Pages Limits
Write-Host "GitHub Pages (Frontend)" -ForegroundColor Yellow
Write-Host "  Storage Limit: 1 GB"
Write-Host "  Bandwidth Limit: 100 GB/month"
Write-Host "  Build Time Limit: 10 minutes"
Write-Host "  Status: Check at https://github.com/YOUR_USERNAME/www.SwapInterCam.Ox/settings/pages"
Write-Host ""

# Render Free Tier Limits
Write-Host "Render.com (Backend)" -ForegroundColor Yellow
Write-Host "  Hours Limit: 750 hours/month (enough for 24/7)"
Write-Host "  RAM Limit: 512 MB"
Write-Host "  CPU: Shared"
Write-Host "  Auto-sleep: After 15 minutes of inactivity"
Write-Host "  Status: Check at https://dashboard.render.com"
Write-Host ""

# Test backend availability
Write-Host "Testing backend availability..." -ForegroundColor Yellow
try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$BackendUrl/health" -Method Get -TimeoutSec 30 -UseBasicParsing
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Backend is ONLINE" -ForegroundColor Green
        Write-Host "  Response time: $([math]::Round($duration, 0)) ms"
        
        if ($duration -gt 5000) {
            Write-Host "  ⚠ Slow response - backend may have been sleeping" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ✗ Backend is OFFLINE or sleeping" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
}
Write-Host ""

# Usage recommendations
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Usage Recommendations" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To maximize free tier:" -ForegroundColor Yellow
Write-Host "  1. Accept 15-minute auto-sleep (normal for free tier)"
Write-Host "  2. Use uptime monitor to keep backend awake during peak hours"
Write-Host "  3. Optimize frontend assets to reduce GitHub Pages bandwidth"
Write-Host "  4. Monitor Render dashboard for usage stats"
Write-Host ""

Write-Host "When to upgrade:" -ForegroundColor Yellow
Write-Host "  • Need 24/7 availability without cold starts"
Write-Host "  • Traffic exceeds 100GB/month on frontend"
Write-Host "  • Backend needs more than 512MB RAM"
Write-Host "  • Response time is critical (< 100ms)"
Write-Host ""

Write-Host "Monitoring tools:" -ForegroundColor Yellow
Write-Host "  • Render Dashboard: https://dashboard.render.com"
Write-Host "  • GitHub Insights: https://github.com/YOUR_USERNAME/www.SwapInterCam.Ox/graphs/traffic"
Write-Host "  • Uptime Monitor: https://uptimerobot.com (free)"
Write-Host ""

# Cost estimate for upgrade
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Upgrade Cost Estimate" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Render Paid Plans:" -ForegroundColor Yellow
Write-Host "  • Starter: `$7/month (no sleep, 512MB RAM)"
Write-Host "  • Standard: `$25/month (1GB RAM, better CPU)"
Write-Host "  • Pro: `$85/month (4GB RAM, dedicated CPU)"
Write-Host ""

Write-Host "GitHub Pages:" -ForegroundColor Yellow
Write-Host "  • Always free for public repos"
Write-Host "  • GitHub Pro: `$4/month (for private repos)"
Write-Host ""

Write-Host "Total monthly cost to upgrade:" -ForegroundColor Yellow
Write-Host "  • Minimum: `$7/month (Render Starter)"
Write-Host "  • Recommended: `$25/month (Render Standard)"
Write-Host "  • Professional: `$85+/month (Render Pro + CDN)"
Write-Host ""
