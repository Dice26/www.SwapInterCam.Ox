# 🎥 Virtual Camera Setup for WhatsApp Face Swap

## Method 1: OBS Virtual Camera (Recommended)

### Step 1: Install OBS Studio
1. Download OBS Studio from: https://obsproject.com/
2. Install and launch OBS Studio

### Step 2: Set up Browser Source
1. In OBS, click "+" in Sources panel
2. Select "Browser Source"
3. Name it "SwapInterCam Face Swap"
4. Set URL to: `https://www-swapintercam-ox.onrender.com/web-face-swap-production.html`
5. Set Width: 640, Height: 480
6. Check "Shutdown source when not visible" and "Refresh browser when scene becomes active"

### Step 3: Start Virtual Camera
1. In OBS, click "Start Virtual Camera" button
2. Choose "OBS Virtual Camera" as camera name
3. Click "Start"

### Step 4: Use in WhatsApp
1. Open WhatsApp Desktop or WhatsApp Web
2. Start a video call
3. Click camera settings/options
4. Select "OBS Virtual Camera" as your camera source
5. Your face-swapped video will appear in WhatsApp!

---

## Method 2: Browser Extension (Chrome/Edge)

### Step 1: Install Virtual Camera Extension
1. Install "Virtual Camera" or "Fake Webcam" extension from Chrome Web Store
2. Grant necessary permissions

### Step 2: Configure Extension
1. Open the extension
2. Set source to your SwapInterCam tab
3. Enable virtual camera

### Step 3: Use in WhatsApp Web
1. Open WhatsApp Web in same browser
2. Start video call
3. Select the virtual camera from camera options

---

## Method 3: Desktop Capture (Alternative)

### Using OBS with Display Capture
1. In OBS, add "Display Capture" or "Window Capture"
2. Select your browser window with SwapInterCam
3. Crop to show only the face swap output canvas
4. Start Virtual Camera
5. Use "OBS Virtual Camera" in WhatsApp

---

## 🔧 Troubleshooting

### If Virtual Camera Not Showing in WhatsApp:
1. Restart WhatsApp after starting OBS Virtual Camera
2. Check Windows Camera Privacy Settings
3. Ensure OBS Virtual Camera is running
4. Try refreshing WhatsApp Web

### For Better Quality:
1. Set OBS output resolution to 720p or 1080p
2. Adjust browser source size accordingly
3. Enable hardware acceleration in browser

---

## 📱 Mobile WhatsApp Integration

For mobile WhatsApp, you'll need:
1. Screen mirroring software (like Vysor for Android)
2. Virtual camera software on PC
3. Mirror phone screen to PC, then use virtual camera

---

## ⚡ Quick Setup Commands

### Windows PowerShell (Download OBS):
```powershell
# Download OBS Studio installer
Invoke-WebRequest -Uri "https://cdn-fastly.obsproject.com/downloads/OBS-Studio-30.0.2-Full-Installer-x64.exe" -OutFile "OBS-Installer.exe"
# Run installer
Start-Process "OBS-Installer.exe"
```

### Browser Bookmarklet (Quick Access):
```javascript
javascript:(function(){window.open('https://www-swapintercam-ox.onrender.com/web-face-swap-production.html','SwapInterCam','width=640,height=480');})();
```

---

## 🎯 Best Practices

1. **Test First**: Always test virtual camera before important calls
2. **Stable Internet**: Ensure good connection for smooth face swapping
3. **Good Lighting**: Better lighting improves face detection accuracy
4. **Target Face Quality**: Use high-quality target face images
5. **Performance**: Close unnecessary browser tabs for better performance

---

## 🔄 Real-Time Integration Workflow

1. **Start SwapInterCam** → Upload target face → Start camera → Start face swap
2. **Launch OBS** → Add browser source → Start virtual camera
3. **Open WhatsApp** → Start video call → Select OBS Virtual Camera
4. **Enjoy** → Real-time face swapping in WhatsApp calls!

---

**Status**: Ready for real-time WhatsApp integration! 🎭📱