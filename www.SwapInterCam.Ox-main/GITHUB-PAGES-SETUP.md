# 🚀 GitHub Pages Frontend Deployment - Step by Step

## ✅ Prerequisites
- [x] Backend deployed on Render (DONE!)
- [ ] GitHub account
- [ ] Git installed on your computer
- [ ] GitHub Desktop (optional, easier for beginners)

---

## 📋 Step-by-Step Guide

### **Step 1: Update Frontend Config with Your Render URL**

1. Open `frontend/js/config.js`
2. Update the production URL with YOUR actual Render backend URL:

```javascript
production: {
    baseUrl: 'https://YOUR-APP-NAME.onrender.com',  // ← Change this!
    apiBase: '/api'
}
```

**Example:** If your Render URL is `https://swapintercam-abc123.onrender.com`, use that.

---

### **Step 2: Create GitHub Repository**

#### Option A: Using GitHub Website (Easiest)

1. Go to [github.com](https://github.com)
2. Click the **+** icon (top right) → **New repository**
3. Fill in:
   - **Repository name**: `SwapInterCam-Web` (or any name you like)
   - **Description**: "SwapInterCam.ox - AI Face Swap Platform"
   - **Public** or **Private**: Choose Public for GitHub Pages free
   - **DO NOT** check "Add README" (we already have files)
4. Click **Create repository**
5. **COPY** the repository URL shown (looks like: `https://github.com/yourusername/SwapInterCam-Web.git`)

#### Option B: Using GitHub Desktop (Recommended for Beginners)

1. Download [GitHub Desktop](https://desktop.github.com/)
2. Install and sign in with your GitHub account
3. Click **File** → **Add Local Repository**
4. Browse to: `SwapInterCam-OX-Web-Deploy\www.SwapInterCam.Ox`
5. Click **Create Repository** if prompted
6. Click **Publish repository** button
7. Name it `SwapInterCam-Web`
8. Uncheck "Keep this code private" (for free GitHub Pages)
9. Click **Publish repository**

---

### **Step 3: Initialize Git and Push Code**

#### If Using GitHub Desktop:
**Skip to Step 4** - GitHub Desktop handles this automatically!

#### If Using Command Line:

Open PowerShell in your project folder and run:

```powershell
# Navigate to your project
cd "C:\Users\caeser\OneDrive\Desktop\SwapInterCam-Desktop\SwapInterCam-OX-Web-Deploy\www.SwapInterCam.Ox"

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - SwapInterCam.ox frontend and backend"

# Add your GitHub repository (replace with YOUR URL from Step 2)
git remote add origin https://github.com/YOUR-USERNAME/SwapInterCam-Web.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

### **Step 4: Enable GitHub Pages**

1. Go to your GitHub repository page
2. Click **Settings** (top menu)
3. Scroll down and click **Pages** (left sidebar)
4. Under **Source**:
   - **Branch**: Select `main`
   - **Folder**: Select `/frontend` ← **IMPORTANT!**
5. Click **Save**
6. Wait 1-2 minutes
7. Refresh the page - you'll see a green box with your URL:
   ```
   Your site is live at https://YOUR-USERNAME.github.io/SwapInterCam-Web/
   ```

---

### **Step 5: Test Your Deployment**

1. **Visit your frontend URL:**
   ```
   https://YOUR-USERNAME.github.io/SwapInterCam-Web/
   ```

2. **Open browser console** (F12) and check for:
   - ✅ No errors
   - ✅ "API Configuration" log showing production mode
   - ✅ Backend connection successful

3. **Click "Test Backend Connection"** button on the page

4. **Check these endpoints work:**
   - Health: `https://YOUR-RENDER-URL.onrender.com/health`
   - MCP: `https://YOUR-RENDER-URL.onrender.com/api/mcp/version`
   - SWEP: `https://YOUR-RENDER-URL.onrender.com/api/swep/status`

---

### **Step 6: Fix CORS Issues (If Any)**

If you see CORS errors in the browser console:

1. Your backend `server-unified.js` should already have CORS enabled
2. If not, add this to your Render environment variables:
   - Key: `ALLOWED_ORIGINS`
   - Value: `https://YOUR-USERNAME.github.io`

---

## 🎯 Quick Reference

### Your URLs After Deployment:

| Service | URL |
|---------|-----|
| **Frontend** | `https://YOUR-USERNAME.github.io/SwapInterCam-Web/` |
| **Backend** | `https://YOUR-APP.onrender.com` |
| **Health Check** | `https://YOUR-APP.onrender.com/health` |
| **API Base** | `https://YOUR-APP.onrender.com/api` |

---

## 🔄 How to Update Your Site

### Using GitHub Desktop:
1. Make changes to your files
2. Open GitHub Desktop
3. You'll see changed files listed
4. Add a commit message (e.g., "Updated styling")
5. Click **Commit to main**
6. Click **Push origin**
7. Wait 1-2 minutes for GitHub Pages to rebuild

### Using Command Line:
```powershell
git add .
git commit -m "Your update message"
git push
```

GitHub Pages automatically rebuilds in 1-2 minutes!

---

## ✅ Deployment Checklist

- [ ] Updated `frontend/js/config.js` with Render URL
- [ ] Created GitHub repository
- [ ] Pushed code to GitHub
- [ ] Enabled GitHub Pages (branch: main, folder: /frontend)
- [ ] Frontend URL is live
- [ ] Backend connection works
- [ ] No CORS errors
- [ ] Test button works
- [ ] All API endpoints respond

---

## 🆘 Troubleshooting

### "404 - Page Not Found"
- Make sure you selected `/frontend` folder in GitHub Pages settings
- Wait 2-3 minutes after enabling Pages
- Check the Pages URL is correct

### "Cannot connect to backend"
- Check your Render backend is awake (visit health endpoint)
- Verify the URL in `config.js` matches your Render URL
- Check browser console for CORS errors

### "CORS Error"
- Add your GitHub Pages URL to Render environment variables
- Restart your Render service

### "Changes not showing"
- GitHub Pages can take 1-2 minutes to update
- Clear browser cache (Ctrl+F5)
- Check you pushed to the correct branch

---

## 🎉 Success!

Once everything works, you have:
- ✅ Frontend hosted on GitHub Pages (FREE)
- ✅ Backend hosted on Render (FREE)
- ✅ Full-stack app running at $0 cost
- ✅ HTTPS enabled on both
- ✅ Automatic deployments on git push

**Your SwapInterCam.ox is now live!** 🚀

---

## 📞 Need Help?

If you get stuck:
1. Check the browser console (F12) for errors
2. Check Render logs for backend issues
3. Verify all URLs are correct
4. Make sure both services are awake

