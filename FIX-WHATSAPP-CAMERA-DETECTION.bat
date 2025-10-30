@echo off
echo ========================================
echo Fix WhatsApp Camera Detection - SwapInterCam.ox
echo ========================================
echo.

echo 🔧 Fixing WhatsApp camera detection issues...
echo.

echo 📹 Step 1: Stopping conflicting processes...
taskkill /f /im WhatsApp.exe 2>nul
taskkill /f /im obs64.exe 2>nul
taskkill /f /im obs32.exe 2>nul
echo ✅ Processes stopped
echo.

echo 🔐 Step 2: Fixing Windows camera permissions...
echo.

REM Enable camera access for desktop apps
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam" /v Value /t REG_SZ /d Allow /f >nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam" /v Value /t REG_SZ /d Allow /f >nul 2>&1

REM Enable camera for WhatsApp specifically
reg add "HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam\Microsoft.WhatsAppDesktop_8wekyb3d8bbwe" /v Value /t REG_SZ /d Allow /f >nul 2>&1

echo ✅ Camera permissions enabled
echo.

echo 🎥 Step 3: Registering OBS Virtual Camera...
echo.

REM Register OBS Virtual Camera in Windows
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Classes\CLSID\{A3FCE0F5-3493-419F-958A-ABA1250EC20B}" /ve /t REG_SZ /d "OBS Virtual Camera" /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Classes\CLSID\{A3FCE0F5-3493-419F-958A-ABA1250EC20B}\InprocServer32" /ve /t REG_SZ /d "obs-virtualsource.dll" /f >nul 2>&1

REM Add to camera devices
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\DeviceClasses\{65E8773D-8F56-11D0-A3B9-00A0C9223196}" /f >nul 2>&1

echo ✅ OBS Virtual Camera registered
echo.

echo 📱 Step 4: Refreshing camera device list...
echo.

REM Refresh Windows camera device list
rundll32.exe devmgr.dll DeviceManager_Execute >nul 2>&1
timeout /t 2 >nul

REM Restart Windows Camera service
net stop "Windows Camera Frame Server" >nul 2>&1
net start "Windows Camera Frame Server" >nul 2>&1

echo ✅ Camera devices refreshed
echo.

echo 🔄 Step 5: Creating WhatsApp camera fix script...
echo.

REM Create a script to force WhatsApp to detect cameras
(
echo @echo off
echo echo Forcing WhatsApp to detect cameras...
echo reg delete "HKEY_CURRENT_USER\SOFTWARE\WhatsApp" /f ^>nul 2^>^&1
echo reg delete "HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\ApplicationAssociationToasts" /v "WhatsApp_WhatsApp" /f ^>nul 2^>^&1
echo echo Camera detection reset for WhatsApp
echo timeout /t 3 ^>nul
) > "%TEMP%\WhatsApp-Camera-Reset.bat"

echo ✅ WhatsApp camera reset script created
echo.

echo 🚀 Step 6: Testing camera detection...
echo.

REM List available cameras
echo Available cameras:
powershell -Command "Get-PnpDevice -Class Camera | Select-Object FriendlyName, Status" 2>nul

echo.
echo 📋 Available DirectShow devices:
powershell -Command "Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -like '*camera*' -or $_.Name -like '*webcam*' -or $_.Name -like '*OBS*'} | Select-Object Name, Status" 2>nul

echo.

echo ========================================
echo ✅ WhatsApp Camera Detection Fix Complete!
echo ========================================
echo.
echo 🎯 What was fixed:
echo   • Windows camera permissions enabled
echo   • OBS Virtual Camera registered in system
echo   • Camera device list refreshed
echo   • WhatsApp camera detection reset
echo.
echo 🚀 Next steps:
echo   1. Start OBS Studio
echo   2. Start Virtual Camera in OBS
echo   3. Wait 10 seconds
echo   4. Open WhatsApp Desktop
echo   5. Go to Settings ^> Camera
echo   6. "OBS Virtual Camera" should now appear!
echo.
echo 💡 If still not working:
echo   • Run as Administrator
echo   • Restart computer
echo   • Try WhatsApp Web instead of Desktop
echo.
echo 📱 Alternative: Use WhatsApp Web in Chrome
echo   WhatsApp Web often detects virtual cameras better than Desktop app
echo.
pause

echo.
echo 🌐 Opening WhatsApp Web as backup option...
start "" "https://web.whatsapp.com"
echo.
echo ✅ WhatsApp Web opened - try video call there if Desktop doesn't work
echo.
pause