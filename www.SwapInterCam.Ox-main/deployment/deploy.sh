#!/bin/bash
# SwapInterCam.ox - Production Deployment Script

set -e  # Exit on error

echo "========================================="
echo " SwapInterCam.ox - Production Deployment"
echo "========================================="
echo ""

# Configuration
DEPLOY_DIR="/opt/swapintercam"
SERVICE_NAME="swapintercam"
NGINX_CONF="/etc/nginx/sites-available/swapintercam.conf"
SYSTEMD_SERVICE="/etc/systemd/system/swapintercam.service"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Create deployment directory
echo "Step 1: Creating deployment directory..."
mkdir -p $DEPLOY_DIR
mkdir -p $DEPLOY_DIR/logs
mkdir -p $DEPLOY_DIR/web
log_info "Deployment directory created"

# Step 2: Copy application files
echo ""
echo "Step 2: Copying application files..."
cp -r ../src $DEPLOY_DIR/
cp -r ../assets $DEPLOY_DIR/
cp ../server-unified.js $DEPLOY_DIR/
cp ../package.json $DEPLOY_DIR/
cp ../.env.example $DEPLOY_DIR/
log_info "Application files copied"

# Step 3: Install dependencies
echo ""
echo "Step 3: Installing Node.js dependencies..."
cd $DEPLOY_DIR
npm install --production
log_info "Dependencies installed"

# Step 4: Set permissions
echo ""
echo "Step 4: Setting permissions..."
chown -R www-data:www-data $DEPLOY_DIR
chmod -R 755 $DEPLOY_DIR
chmod -R 775 $DEPLOY_DIR/logs
log_info "Permissions set"

# Step 5: Install systemd service
echo ""
echo "Step 5: Installing systemd service..."
if [ -f "../config/swapintercam.service" ]; then
    cp ../config/swapintercam.service $SYSTEMD_SERVICE
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    log_info "Systemd service installed"
else
    log_warn "Systemd service file not found, skipping"
fi

# Step 6: Install Nginx configuration
echo ""
echo "Step 6: Installing Nginx configuration..."
if [ -f "../config/nginx.conf" ]; then
    cp ../config/nginx.conf $NGINX_CONF
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/swapintercam.conf
    nginx -t && log_info "Nginx configuration installed" || log_error "Nginx configuration test failed"
else
    log_warn "Nginx configuration file not found, skipping"
fi

# Step 7: Start services
echo ""
echo "Step 7: Starting services..."
systemctl restart $SERVICE_NAME
systemctl restart nginx
log_info "Services started"

# Step 8: Verify deployment
echo ""
echo "Step 8: Verifying deployment..."
sleep 3

if systemctl is-active --quiet $SERVICE_NAME; then
    log_info "SwapInterCam service is running"
else
    log_error "SwapInterCam service failed to start"
    systemctl status $SERVICE_NAME
    exit 1
fi

if systemctl is-active --quiet nginx; then
    log_info "Nginx is running"
else
    log_error "Nginx failed to start"
    systemctl status nginx
    exit 1
fi

# Test health endpoint
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log_info "Health check passed"
else
    log_warn "Health check failed (service may still be starting)"
fi

# Final summary
echo ""
echo "========================================="
echo " Deployment Complete!"
echo "========================================="
echo ""
echo "Service Status:"
echo "  • SwapInterCam: $(systemctl is-active $SERVICE_NAME)"
echo "  • Nginx: $(systemctl is-active nginx)"
echo ""
echo "Useful Commands:"
echo "  • View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  • Restart service: sudo systemctl restart $SERVICE_NAME"
echo "  • Check status: sudo systemctl status $SERVICE_NAME"
echo "  • View access logs: tail -f $DEPLOY_DIR/logs/access.log"
echo ""
echo "Next Steps:"
echo "  1. Set up SSL: sudo ./ssl-setup.sh"
echo "  2. Test from browser: http://YOUR_SERVER_IP"
echo "  3. Configure DNS to point to this server"
echo ""
