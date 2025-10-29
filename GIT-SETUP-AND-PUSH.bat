@echo off
echo ========================================
echo SwapInterCam.ox - Git Setup and Push
echo ========================================
echo.

REM Set Git path
set GIT_PATH="C:\Program Files\Git\bin\git.exe"

echo 🔧 Setting up Git repository...
%GIT_PATH% init
echo.

echo 📝 Configuring Git (if not already configured)...
%GIT_PATH% config user.name "SwapInterCam Developer" 2>nul
%GIT_PATH% config user.email "developer@swapintercam.ox" 2>nul
echo.

echo 🔗 Adding remote repository...
%GIT_PATH% remote add origin https://github.com/Dice26/www.SwapInterCam.Ox.git 2>nul
echo.

echo 📦 Adding all files...
%GIT_PATH% add .
echo.

echo 💾 Committing changes...
%GIT_PATH% commit -m "Fix: Resolve 404 error - Update static directory path and enhance frontend interface"
echo.

echo 🚀 Pushing to GitHub...
%GIT_PATH% push -u origin main
echo.

echo ========================================
echo ✅ Deployment initiated!
echo ========================================
echo.
echo Your changes have been pushed to GitHub.
echo Render will automatically detect and deploy the changes.
echo.
echo Expected timeline:
echo - Render detects changes: ~30 seconds
echo - Build and deploy: ~3-5 minutes
echo - Site functional: ~5 minutes total
echo.
echo Check your site: https://www-swapintercam-ox.onrender.com/
echo.
pause