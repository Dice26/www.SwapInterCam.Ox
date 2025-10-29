# 🆓 Free Deployment Tools

## 📁 What's in This Folder

This folder contains everything you need to deploy and monitor SwapInterCam.ox on **free hosting platforms**.

### Files:

1. **deploy-local.ps1** - Test locally before deploying
2. **test-deployment.ps1** - Test live deployment
3. **monitor-free-tier.ps1** - Monitor usage and limits
4. **README.md** - This file

---

## 🚀 Quick Start

### Step 1: Test Locally

```powershell
cd free-deployment
.\deploy-local.ps1
```

This will:
- Install dependencies
- Start server on http://localhost:3000
- Test all endpoints

### Step 2: Deploy to Render & GitHub Pages

1. **Push to GitHub** (if not done yet)
   - Use GitHub Desktop or command line
   - Push all files including `render.yaml`

2. **Deploy Backend to Render**
   - Go to [render.com](https://render.com)
   - Sign up (free)
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Render auto-detects `render.yaml`
   - Click "Create Web Service"
   - Wait 2-3 minutes

3. **Enable GitHub Pages**
   - Go to your GitHub repo
   - Settings → Pages
   - Source: `main` branch, `/frontend` folder
   - Save
   - Wait 1-2 minutes

### Step 3: Test Deployment

```powershell
.\test-deployment.ps1 -BackendUrl "https://YOUR-APP.onrender.com" -FrontendUrl "https://YOUR-USERNAME.github.io/www.SwapInterCam.Ox"
```

### Step 4: Monitor Usage

```powershell
.\monitor-free-tier.ps1 -BackendUrl "https://YOUR-APP.onrender.com"
```

---

## 📊 What Gets Deployed

### Frontend (GitHub Pages):
```
frontend/
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
└── js/
    ├── config.js       # API configuration
    └── app.js          # Application logic
```

### Backend (Render.com):
```
server-unified.js       # Main server
src/                    # Backend code
package.json            # Dependencies
render.yaml             # Render configuration
```

---

## 🎯 Testing Checklist

After deployment, verify:

- [ ] Frontend loads at GitHub Pages URL
- [ ] Backend health check passes
- [ ] MCP API responds
- [ ] SWEP API responds
- [ ] Frontend connects to backend
- [ ] No CORS errors in browser console

---

## 💰 Free Tier Limits

### GitHub Pages:
- ✅ 1GB storage
- ✅ 100GB bandwidth/month
- ✅ Unlimited sites
- ✅ HTTPS included

### Render.com:
- ✅ 750 hours/month (24/7 for 1 service)
- ✅ 512MB RAM
- ✅ Shared CPU
- ⚠️ Auto-sleeps after 15 min inactivity
- ✅ HTTPS included

---

## 🔧 Configuration

### Update Backend URL

After deploying to Render, update `frontend/js/config.js`:

```javascript
production: {
    baseUrl: 'https://YOUR-APP.onrender.com',
    apiBase: '/api'
}
```

Then commit and push to update GitHub Pages.

---

## 📈 Performance Tips

### Keep Backend Awake:
Use a free uptime monitor like [UptimeRobot](https://uptimerobot.com):
- Ping your backend every 5 minutes
- Prevents auto-sleep during peak hours

### Optimize Frontend:
- Minimize CSS/JS files
- Compress images
- Use browser caching

### Monitor Usage:
- Check Render dashboard weekly
- Monitor GitHub Pages traffic
- Watch for bandwidth limits

---

## 🆘 Troubleshooting

### Backend Won't Start:
```powershell
# Check Render logs in dashboard
# Verify render.yaml is correct
# Ensure package.json has all dependencies
```

### Frontend Can't Connect:
```powershell
# Check browser console for CORS errors
# Verify backend URL in config.js
# Test backend health endpoint directly
```

### Slow Performance:
```powershell
# First request after sleep is slow (normal)
# Use uptime monitor to keep awake
# Consider upgrading to paid tier
```

---

## 🎓 Learning Resources

### Render.com:
- [Render Docs](https://render.com/docs)
- [Free Tier Details](https://render.com/docs/free)
- [Node.js Deployment](https://render.com/docs/deploy-node-express-app)

### GitHub Pages:
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Custom Domain Setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

## ✅ Success Indicators

Your deployment is working when:

1. ✅ Frontend loads without errors
2. ✅ Backend health check returns 200 OK
3. ✅ API test button works
4. ✅ Status shows "Backend is ONLINE"
5. ✅ No CORS errors in console

---

## 🚀 Next Steps

After successful free deployment:

1. **Monitor for 1-2 weeks**
   - Track performance
   - Gather user feedback
   - Identify bottlenecks

2. **Optimize Based on Data**
   - Fix slow endpoints
   - Reduce asset sizes
   - Improve user experience

3. **Plan Upgrade Path**
   - Estimate traffic needs
   - Budget for paid hosting
   - Choose professional infrastructure

4. **Migrate When Ready**
   - Use production deployment guide
   - Set up custom domain
   - Configure CDN
   - Enable monitoring

---

## 💡 Tips

- **Commit often**: Both platforms auto-deploy on push
- **Test locally first**: Use `deploy-local.ps1`
- **Monitor logs**: Check Render dashboard regularly
- **Keep it simple**: Don't over-optimize for free tier
- **Plan ahead**: Know when to upgrade

---

**Your SwapInterCam.ox platform is ready for free deployment!** 🎉

Run `.\deploy-local.ps1` to get started.
