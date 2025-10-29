#!/bin/bash
# SwapInterCam.ox - SSL Certificate Setup with Let's Encrypt

set -e

echo "========================================="
echo " SwapInterCam.ox - SSL Setup"
echo "========================================="
echo ""

# Configuration
DOMAIN="www.swapintercam.ox"
EMAIL="contact@swapintercam.ox"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Certbot not found. Installing..."
    apt update
    apt install -y certbot python3-certbot-nginx
    log_info "Certbot installed"
fi

# Verify DNS is pointing to this server
echo "Verifying DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    log_warn "DNS may not be configured correctly"
    echo "  Server IP: $SERVER_IP"
    echo "  Domain IP: $DOMAIN_IP"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    log_info "DNS is configured correctly"
fi

# Obtain SSL certificate
echo ""
echo "Obtaining SSL certificate from Let's Encrypt..."
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

certbot --nginx \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --redirect

if [ $? -eq 0 ]; then
    log_info "SSL certificate obtained successfully"
else
    log_error "Failed to obtain SSL certificate"
    exit 1
fi

# Set up auto-renewal
echo ""
echo "Setting up automatic renewal..."

# Test renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    log_info "Auto-renewal test passed"
else
    log_warn "Auto-renewal test failed"
fi

# Add cron job for renewal
CRON_JOB="0 3 * * * /usr/bin/certbot renew --quiet"
(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -
log_info "Cron job added for automatic renewal"

# Restart Nginx
echo ""
echo "Restarting Nginx..."
systemctl restart nginx
log_info "Nginx restarted"

# Verify HTTPS
echo ""
echo "Verifying HTTPS..."
if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
    log_info "HTTPS is working correctly"
else
    log_warn "HTTPS verification failed (may need time to propagate)"
fi

# Final summary
echo ""
echo "========================================="
echo " SSL Setup Complete!"
echo "========================================="
echo ""
echo "Certificate Details:"
echo "  • Domain: $DOMAIN"
echo "  • Issuer: Let's Encrypt"
echo "  • Auto-renewal: Enabled (daily at 3 AM)"
echo ""
echo "Test your site:"
echo "  • https://$DOMAIN"
echo "  • https://$DOMAIN/health"
echo ""
echo "Certificate files:"
echo "  • /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  • /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "Renewal commands:"
echo "  • Test: sudo certbot renew --dry-run"
echo "  • Force: sudo certbot renew --force-renewal"
echo ""
