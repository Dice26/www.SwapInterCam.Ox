# 🚀 SwapInterCam.ox - Production Deployment Guide

## 📋 Overview

This guide walks you through deploying SwapInterCam.ox to production using the unified server architecture with Nginx reverse proxy and SSL.

---

## 🎯 Architecture Benefits

### ✅ What This Setup Provides:

1. **Unified Server** - Single Node.js process serving everything
2. **SSL/HTTPS** - Secure connections via Let's Encrypt
3. **Caching** - Nginx caches static assets globally
4. **Audit Logging** - All requests logged for compliance
5. **Auto-Recovery** - Systemd restarts on crashes
6. **Performance** - Optimized for production load
7. **Security** - Headers, rate limiting, DDoS protection

---

## 📦 What's Included

### New Files Created:

```
www.SwapInterCam.Ox/
├── server-unified.js              # ✅ NEW: Unified MCP server
├── config/
│   ├── nginx.conf                 # ✅ NEW: Nginx configuration
│   └── swapintercam.service       # ✅ NEW: Systemd service
├── deployment/
│   ├── deploy.sh                  # ✅ NEW: Deployment script
│   └── ssl-setup.sh               # ✅ NEW: SSL setup script
├── DEPLOYMENT-ARCHITECTURE.md     # ✅ NEW: Architecture docs
└── PRODUCTION-DEPLOYMENT-GUIDE.md # ✅ NEW: This guide
```

---

## 🚀 Quick Start (Local Testing)

### 1. Test Unified Server Locally:

```bash
# Start unified server
npm run unified:dev

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/mcp/version
curl http://localhost:3000/api/swep/status
```

### 2. Verify Audit Logging:

```bash
# Check logs directory
ls -la logs/

# View access log
tail -f logs/access.log

# View runtime log
tail -f logs/runtime.log
```

---

## 🌐 Production Deployment

### Prerequisites:

- Ubuntu 20.04+ or similar Linux server
- Node.js 16+ installed
- Nginx installed
- Domain name pointing to your server
- Root/sudo access

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Verify installations
node --version
nginx -v
```

### Step 2: Deploy Application

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/www.SwapInterCam.Ox.git swapintercam
cd swapintercam

# Run deployment script
sudo chmod +x deployment/deploy.sh
sudo ./deployment/deploy.sh
```

The script will:
- ✅ Create deployment directory
- ✅ Copy application files
- ✅ Install dependencies
- ✅ Set permissions
- ✅ Install systemd service
- ✅ Configure Nginx
- ✅ Start services

### Step 3: Set Up SSL

```bash
# Run SSL setup script
sudo chmod +x deployment/ssl-setup.sh
sudo ./deployment/ssl-setup.sh
```

The script will:
- ✅ Install Certbot
- ✅ Verify DNS configuration
- ✅ Obtain SSL certificate
- ✅ Configure auto-renewal
- ✅ Restart Nginx with HTTPS

### Step 4: Verify Deployment

```bash
# Check service status
sudo systemctl status swapintercam
sudo systemctl status nginx

# Test health endpoint
curl https://www.swapintercam.ox/health

# View logs
sudo journalctl -u swapintercam -f
tail -f /opt/swapintercam/logs/access.log
```

---

## 🔧 Configuration

### Environment Variables

Edit `/etc/systemd/system/swapintercam.service`:

```ini
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=STATIC_DIR=/opt/swapintercam/web
Environment=API_BASE=/api
Environment=LOG_DIR=/opt/swapintercam/logs
Environment=AUDIT_TAG=mcp-unified
Environment=COMMIT_ID=1593dde078969e57b9323a7cfdd847dcf9b1b867
```

After changes:
```bash
sudo systemctl daemon-reload
sudo systemctl restart swapintercam
```

### Nginx Configuration

Edit `/etc/nginx/sites-available/swapintercam.conf`:

- Change `server_name` to your domain
- Adjust cache settings if needed
- Add rate limiting if desired

After changes:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 Monitoring

### Service Status:

```bash
# Check if services are running
sudo systemctl status swapintercam
sudo systemctl status nginx

# View service logs
sudo journalctl -u swapintercam -f
sudo journalctl -u nginx -f
```

### Application Logs:

```bash
# Access log (all requests)
tail -f /opt/swapintercam/logs/access.log

# Runtime log (application events)
tail -f /opt/swapintercam/logs/runtime.log

# Error log (errors only)
tail -f /opt/swapintercam/logs/error.log
```

### Health Checks:

```bash
# Local health check
curl http://localhost:3000/health

# Public health check
curl https://www.swapintercam.ox/health

# Expected response:
{
  "status": "ok",
  "time": "2025-10-17T10:30:45.123Z",
  "tag": "mcp-unified",
  "env": "production",
  "commit": "1593dde078969e57b9323a7cfdd847dcf9b1b867",
  "services": {
    "mcp": "up",
    "swep": "up",
    "web": "up"
  }
}
```

---

## 🔄 Common Operations

### Restart Service:

```bash
sudo systemctl restart swapintercam
```

### Update Code:

```bash
cd /opt/swapintercam
sudo git pull
sudo npm install --production
sudo systemctl restart swapintercam
```

### View Logs:

```bash
# Real-time logs
sudo journalctl -u swapintercam -f

# Last 100 lines
sudo journalctl -u swapintercam -n 100

# Logs since today
sudo journalctl -u swapintercam --since today
```

### Rollback:

```bash
cd /opt/swapintercam
sudo git log --oneline -10  # Find commit to rollback to
sudo git checkout <commit-hash>
sudo npm install --production
sudo systemctl restart swapintercam
```

---

## 🔒 Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (allow 80, 443, 22 only)
- [ ] SSH key-based authentication enabled
- [ ] Root login disabled
- [ ] Fail2ban installed for brute-force protection
- [ ] Regular security updates enabled
- [ ] Audit logs being monitored
- [ ] Backup strategy in place

### Firewall Setup:

```bash
# Install UFW
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📈 Performance Optimization

### Enable PM2 for Multi-Core:

```bash
# Install PM2
sudo npm install -g pm2

# Start with PM2
cd /opt/swapintercam
pm2 start server-unified.js --name swapintercam -i max

# Save PM2 config
pm2 save
pm2 startup
```

### Nginx Caching:

Already configured in `config/nginx.conf`:
- Static assets: 7 days
- HTML: 5 minutes
- API: No cache

### Node.js Optimization:

```bash
# Increase memory limit (if needed)
Environment=NODE_OPTIONS="--max-old-space-size=4096"
```

---

## 🐛 Troubleshooting

### Service Won't Start:

```bash
# Check service status
sudo systemctl status swapintercam

# View detailed logs
sudo journalctl -u swapintercam -xe

# Check for port conflicts
sudo netstat -tulpn | grep 3000
```

### Nginx Errors:

```bash
# Test configuration
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Issues:

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check certificate expiry
sudo certbot certificates
```

### Application Errors:

```bash
# Check application logs
tail -f /opt/swapintercam/logs/error.log

# Check Node.js errors
sudo journalctl -u swapintercam | grep -i error

# Restart service
sudo systemctl restart swapintercam
```

---

## 📚 Additional Resources

### Documentation:
- [DEPLOYMENT-ARCHITECTURE.md](./DEPLOYMENT-ARCHITECTURE.md) - Architecture details
- [README.md](./README.md) - Project overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines

### External Resources:
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Documentation](https://pm2.keymetrics.io/)

---

## ✅ Deployment Checklist

### Pre-Deployment:
- [ ] Code tested locally
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Backup of current production

### Deployment:
- [ ] Server prepared
- [ ] Application deployed
- [ ] SSL configured
- [ ] Services started
- [ ] Health checks passing

### Post-Deployment:
- [ ] Monitor logs for errors
- [ ] Test all major features
- [ ] Verify SSL certificate
- [ ] Check performance metrics
- [ ] Update DNS if needed
- [ ] Notify team of deployment

---

## 🎉 Success!

Your SwapInterCam.ox platform is now running in production with:

✅ Unified server architecture  
✅ SSL/HTTPS encryption  
✅ Nginx reverse proxy  
✅ Audit logging  
✅ Auto-recovery  
✅ Production-grade security  

**Access your platform at: https://www.swapintercam.ox**

---

**Need Help?**
- Email: contact@swapintercam.ox
- GitHub Issues: https://github.com/YOUR_USERNAME/www.SwapInterCam.Ox/issues
