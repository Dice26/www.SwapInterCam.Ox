@echo off
echo ========================================
echo SwapInterCam.ox - GitHub Pages Setup
echo ========================================
echo.

echo This script will help you push to GitHub
echo.

echo STEP 1: Make sure you have:
echo   - Created a GitHub repository
echo   - Updated frontend/js/config.js with your Render URL
echo.
pause

echo.
echo STEP 2: Initializing Git...
git init
if errorlevel 1 (
    echo ERROR: Git not found! Please install Git first.
    pause
    exit /b 1
)

echo.
echo STEP 3: Adding all files...
git add .

echo.
echo STEP 4: Creating first commit...
git commit -m "Initial commit - SwapInterCam.ox"

echo.
echo ========================================
echo STEP 5: Add your GitHub repository URL
echo ========================================
echo.
echo Example: https://github.com/yourusername/SwapInterCam-Web.git
echo.
set /p REPO_URL="Enter your GitHub repository URL: "

echo.
echo Adding remote repository...
git remote add origin %REPO_URL%

echo.
echo STEP 6: Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ========================================
echo SUCCESS! Code pushed to GitHub
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Go to your GitHub repository
echo 2. Click Settings ^> Pages
echo 3. Set Source to: main branch, /frontend folder
echo 4. Save and wait 1-2 minutes
echo 5. Your site will be live!
echo.
echo See GITHUB-PAGES-SETUP.md for detailed instructions
echo.
pause
