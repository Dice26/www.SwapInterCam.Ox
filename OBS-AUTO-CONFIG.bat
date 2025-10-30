@echo off
echo ========================================
echo SwapInterCam.ox - OBS Auto Configuration
echo ========================================
echo.

echo 🔧 Fixing OBS configuration issues...
echo.

REM Create OBS config directory if it doesn't exist
set OBS_CONFIG_DIR=%APPDATA%\obs-studio\basic\profiles\Untitled\

if not exist "%OBS_CONFIG_DIR%" (
    echo Creating OBS config directory...
    mkdir "%OBS_CONFIG_DIR%"
)

echo 📹 Setting optimal video settings...

REM Create basic.ini with optimal settings for SwapInterCam
(
echo [Video]
echo BaseCX=640
echo BaseCY=480
echo OutputCX=640
echo OutputCY=480
echo FPSType=0
echo FPSCommon=30
echo ColorFormat=NV12
echo ColorSpace=709
echo ColorRange=1
echo.
echo [Output]
echo Mode=Simple
echo.
echo [SimpleOutput]
echo VBitrate=2500
echo StreamEncoder=x264
echo ABitrate=160
echo UseAdvanced=false
echo Preset=veryfast
echo.
echo [AdvOut]
echo TrackIndex=1
echo Encoder=obs_x264
echo.
echo [Audio]
echo SampleRate=44100
echo ChannelSetup=Stereo
) > "%OBS_CONFIG_DIR%basic.ini"

echo ✅ Video settings configured (640x480, 30fps, NV12)
echo.

echo 🎭 Creating SwapInterCam scene...

REM Create scene collection with SwapInterCam setup
set SCENE_FILE=%APPDATA%\obs-studio\basic\scenes\SwapInterCam.json

(
echo {
echo     "current_scene": "SwapInterCam.ox",
echo     "current_program_scene": "SwapInterCam.ox",
echo     "scene_order": [
echo         {
echo             "name": "SwapInterCam.ox"
echo         }
echo     ],
echo     "name": "SwapInterCam",
echo     "sources": [
echo         {
echo             "balance": 0.5,
echo             "deinterlace_field_order": 0,
echo             "deinterlace_mode": 0,
echo             "enabled": true,
echo             "flags": 0,
echo             "hotkeys": {},
echo             "id": "browser_source",
echo             "mixers": 255,
echo             "monitoring_type": 0,
echo             "muted": false,
echo             "name": "SwapInterCam Face Swap",
echo             "prev_ver": 469762048,
echo             "private_settings": {},
echo             "push-to-mute": false,
echo             "push-to-mute-delay": 0,
echo             "push-to-talk": false,
echo             "push-to-talk-delay": 0,
echo             "settings": {
echo                 "url": "https://www-swapintercam-ox.onrender.com/web-face-swap-production.html",
echo                 "width": 640,
echo                 "height": 480,
echo                 "fps": 30,
echo                 "shutdown": true,
echo                 "restart_when_active": true
echo             },
echo             "sync": 0,
echo             "versioned_id": "browser_source",
echo             "volume": 1.0
echo         }
echo     ],
echo     "scenes": [
echo         {
echo             "alignment": 5,
echo             "cx": 640.0,
echo             "cy": 480.0,
echo             "id": 1,
echo             "locked": false,
echo             "name": "SwapInterCam.ox",
echo             "rot": 0.0,
echo             "scale_x": 1.0,
echo             "scale_y": 1.0,
echo             "source_cx": 640,
echo             "source_cy": 480,
echo             "visible": true,
echo             "x": 0.0,
echo             "y": 0.0
echo         }
echo     ],
echo     "transitions": []
echo }
) > "%SCENE_FILE%"

echo ✅ SwapInterCam scene created with browser source
echo.

echo 🔧 Fixing graphics compatibility...

REM Create config to fix D3D11 issues
set GLOBAL_CONFIG=%APPDATA%\obs-studio\global.ini

(
echo [General]
echo FirstRun=false
echo.
echo [BasicWindow]
echo GeometryBase64=
echo.
echo [Video]
echo Renderer=Direct3D 11
echo Adapter=
echo ColorFormat=NV12
echo ColorSpace=709
echo ColorRange=1
echo.
echo [Audio]
echo DisableAudioDucking=true
) > "%GLOBAL_CONFIG%"

echo ✅ Graphics compatibility settings applied
echo.

echo 📱 Virtual Camera optimization...

REM Set virtual camera to optimal settings
(
echo [VirtualCam]
echo OutputType=0
echo OutputSelection=0
echo OutputResolution=0
echo InternalResolution=0
echo FPSType=0
echo FPSCommon=30
echo FPSInteger=30
echo FPSNumerator=30
echo FPSDenominator=1
) >> "%OBS_CONFIG_DIR%basic.ini"

echo ✅ Virtual camera optimized for WhatsApp
echo.

echo ========================================
echo ✅ OBS Auto-Configuration Complete!
echo ========================================
echo.
echo 🎯 What was fixed:
echo   • Resolution set to 640x480 (matches SwapInterCam)
echo   • Frame rate locked to 30fps
echo   • Video format set to NV12 (compatible)
echo   • D3D11 compatibility improved
echo   • SwapInterCam scene auto-created
echo   • Virtual camera optimized
echo.
echo 🚀 Next steps:
echo   1. Restart OBS Studio
echo   2. Select "SwapInterCam" scene collection
echo   3. Click "Start Virtual Camera"
echo   4. Use "OBS Virtual Camera" in WhatsApp
echo.
echo 📱 Your face swap should now work perfectly in WhatsApp!
echo.
pause