
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// Create simple logger fallback if logger module doesn't exist
let logger;
try {
    logger = require('./src/main/utils/logger');
} catch (error) {
    // Fallback logger
    logger = {
        secureInfo: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
        secureWarn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
        secureError: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
        obsActivity: (activity, data) => console.log(`[OBS] ${activity}`, data || '')
    };
}

// Try to load other modules with fallbacks
let OBSController, OBSSceneManager, SwapInterCamIntegration, CameraDetector, getFaceSwapManager;

try {
    OBSController = require('./src/main/modules/obs/obs-controller');
} catch (error) {
    console.log('OBS Controller not found, using fallback');
    OBSController = class { constructor() {} connect() { return { success: false }; } };
}

try {
    OBSSceneManager = require('./src/main/modules/obs/scene-manager');
} catch (error) {
    console.log('OBS Scene Manager not found, using fallback');
    OBSSceneManager = class { constructor() {} };
}

try {
    SwapInterCamIntegration = require('./src/main/swapintercam-integration');
} catch (error) {
    console.log('SwapInterCam Integration not found, using fallback');
    SwapInterCamIntegration = class { constructor() {} };
}

try {
    CameraDetector = require('./src/main/camera-detector');
} catch (error) {
    console.log('Camera Detector not found, using fallback');
    CameraDetector = class { constructor() {} getAllCameras() { return []; } };
}

try {
    const faceSwapModule = require('./src/main/modules/face-swap/face-swap-manager');
    getFaceSwapManager = faceSwapModule.getFaceSwapManager || (() => ({}));
} catch (error) {
    console.log('Face Swap Manager not found, using fallback');
    getFaceSwapManager = () => ({});
}
require('dotenv').config();

// Security: Disable node integration and enable context isolation
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

class SwapInterCamChatApp {
  constructor() {
    this.mainWindow = null;
    this.isQuitting = false;
    this.obsController = new OBSController();
    this.obsSceneManager = new OBSSceneManager(this.obsController);
    this.swepIntegration = new SwapInterCamIntegration();
    this.cameraDetector = new CameraDetector();
    this.faceSwapManager = getFaceSwapManager();
    
    logger.secureInfo('SwapInterCam Chat Desktop UI initializing', {
      version: process.env.APP_VERSION || '1.0.0',
      nodeEnv: process.env.NODE_ENV || 'production'
    });
  }

  createWindowSafely(options) {
    try {
      return new BrowserWindow(options);
    } catch (error) {
      console.warn('Failed to create window:', error.message);
      return null;
    }
  }

  async createMainWindow() {
    // Configure session security
    const ses = session.defaultSession;
    
    // Set Content Security Policy
    ses.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' https:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
            "style-src 'self' 'unsafe-inline' https:; " +
            "img-src 'self' data: https:; " +
            "media-src 'self' https:; " +
            "connect-src 'self' https: wss:; " +
            "frame-src https:;"
          ]
        }
      });
    });

    // Create the main window with forced visibility
    this.mainWindow = this.createWindowSafely({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      show: true, // Force show immediately
      alwaysOnTop: true, // Force always on top initially
      skipTaskbar: false,
      icon: path.join(__dirname, 'assets/icons/icon.png'),
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        webviewTag: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Load the main UI
    await this.mainWindow.loadFile('src/renderer/index.html');

    // Show window when ready with forced visibility
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
      this.mainWindow.moveTop();
      this.mainWindow.flashFrame(true);
      logger.secureInfo('Main window ready and shown with forced visibility');
      
      // Remove always on top after 5 seconds
      setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.setAlwaysOnTop(false);
        }
      }, 5000);
      
      if (isDev && process.env.ENABLE_DEV_TOOLS !== 'false') {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle window close attempt
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // Security: Prevent new window creation
    this.mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    // Security: Prevent navigation to external URLs
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      if (parsedUrl.origin !== 'file://') {
        event.preventDefault();
      }
    });
  }

  setupIPC() {
    // IPC handlers for secure communication
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getPlatform', () => {
      return process.platform;
    });

    // SwapInterCam SWEP integration
    ipcMain.handle('swep:authenticate', async (event, credentials) => {
      try {
        logger.secureInfo('SWEP authentication requested');
        const result = await this.swepIntegration.authenticateUser(credentials);
        
        if (result.success) {
          logger.secureInfo('SWEP authentication successful', { userId: result.user.id });
        } else {
          logger.secureWarn('SWEP authentication failed', { error: result.error });
        }
        
        return result;
      } catch (error) {
        logger.secureError('SWEP authentication error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('swep:validateCameraAccess', async (event, userId) => {
      try {
        logger.secureInfo('SWEP camera access validation requested', { userId });
        const result = await this.swepIntegration.validateCameraAccess(userId);
        
        if (result.success && result.granted) {
          logger.secureInfo('SWEP camera access granted', { userId });
        } else {
          logger.secureWarn('SWEP camera access denied', { userId, reason: result.reason });
        }
        
        return result;
      } catch (error) {
        logger.secureError('SWEP camera validation error', { error: error.message });
        return { success: false, granted: false, error: error.message };
      }
    });

    ipcMain.handle('swep:getCertificationStatus', async (event, userId) => {
      try {
        logger.secureInfo('SWEP certification status requested', { userId });
        const result = await this.swepIntegration.getCertificationStatus(userId);
        
        return result;
      } catch (error) {
        logger.secureError('SWEP certification status error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('swep:logActivity', async (event, activity) => {
      try {
        const result = await this.swepIntegration.logActivity(activity.action, activity.data);
        return result;
      } catch (error) {
        logger.secureError('SWEP activity logging error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('swep:getConnectionStatus', async () => {
      try {
        const status = this.swepIntegration.getConnectionStatus();
        return { success: true, status };
      } catch (error) {
        logger.secureError('SWEP connection status error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // OBS integration
    ipcMain.handle('obs:connect', async () => {
      try {
        logger.secureInfo('OBS connection requested');
        const result = await this.obsController.connect();
        
        if (result.success) {
          logger.obsActivity('connection_successful');
        } else {
          logger.secureWarn('OBS connection failed', { error: result.error });
        }
        
        return result;
      } catch (error) {
        logger.secureError('OBS connection error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:disconnect', async () => {
      try {
        this.obsController.disconnect();
        logger.obsActivity('disconnected_manually');
        return { success: true };
      } catch (error) {
        logger.secureError('OBS disconnect error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:switchScene', async (event, sceneName) => {
      try {
        logger.obsActivity('scene_switch_requested', { scene: sceneName });
        
        // Validate scene name for security
        if (!this.obsController.validateSceneName(sceneName)) {
          logger.secureWarn('Invalid OBS scene name', { scene: sceneName });
          return { success: false, error: 'Invalid scene name' };
        }
        
        const result = await this.obsController.switchScene(sceneName);
        return result;
      } catch (error) {
        logger.secureError('OBS scene switch error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:getCurrentScene', async () => {
      try {
        const result = await this.obsController.getCurrentScene();
        return result;
      } catch (error) {
        logger.secureError('OBS get current scene error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:isConnected', async () => {
      try {
        const connected = this.obsController.isConnected();
        return { success: true, connected };
      } catch (error) {
        logger.secureError('OBS connection status error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:getScenes', async () => {
      try {
        const result = await this.obsController.getScenes();
        return result;
      } catch (error) {
        logger.secureError('OBS get scenes error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // OBS Scene Manager integration
    ipcMain.handle('obs:switchSceneForTab', async (event, tabName) => {
      try {
        logger.obsActivity('scene_switch_for_tab_requested', { tab: tabName });
        const result = await this.obsSceneManager.switchSceneForTab(tabName);
        return result;
      } catch (error) {
        logger.secureError('Failed to switch scene for tab', { tab: tabName, error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:getSceneMapping', async () => {
      try {
        const mapping = this.obsSceneManager.getSceneMapping();
        return { success: true, mapping };
      } catch (error) {
        logger.secureError('Failed to get scene mapping', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:validateSceneMapping', async () => {
      try {
        const result = await this.obsSceneManager.validateSceneMapping();
        return result;
      } catch (error) {
        logger.secureError('Failed to validate scene mapping', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:getSceneManagerStatus', async () => {
      try {
        const status = this.obsSceneManager.getEnhancedStatus();
        return { success: true, status };
      } catch (error) {
        logger.secureError('Failed to get scene manager status', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:getAutomaticSwitcherConfig', async () => {
      try {
        const config = this.obsSceneManager.getAutomaticSwitcherConfig();
        return { success: true, config };
      } catch (error) {
        logger.secureError('Failed to get automatic switcher config', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:updateSceneProfile', async (event, tabName, profileUpdates) => {
      try {
        const result = this.obsSceneManager.updateSceneProfile(tabName, profileUpdates);
        return result;
      } catch (error) {
        logger.secureError('Failed to update scene profile', { 
          tab: tabName, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:setAutomaticSwitchingEnabled', async (event, enabled) => {
      try {
        const result = this.obsSceneManager.setAutomaticSwitchingEnabled(enabled);
        logger.obsActivity('automatic_switching_toggled_via_ipc', { enabled });
        return result;
      } catch (error) {
        logger.secureError('Failed to toggle automatic switching', { 
          enabled, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('obs:getSwitchingStats', async () => {
      try {
        const stats = this.obsSceneManager.getSwitchingStats();
        return { success: true, stats };
      } catch (error) {
        logger.secureError('Failed to get switching stats', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // Camera detection and management
    ipcMain.handle('camera:getDevices', async () => {
      try {
        logger.secureInfo('Camera devices requested');
        const cameras = this.cameraDetector.getAllCameras();
        
        return {
          success: true,
          cameras: cameras,
          obsVirtualCamera: this.cameraDetector.getOBSVirtualCamera(),
          systemCameras: this.cameraDetector.getSystemCameras(),
          stats: this.cameraDetector.getCameraStats()
        };
      } catch (error) {
        logger.secureError('Camera devices error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('camera:checkOBSVirtualCamera', async () => {
      try {
        const hasOBS = this.cameraDetector.hasOBSVirtualCamera();
        const obsCamera = this.cameraDetector.getOBSVirtualCamera();
        
        logger.secureInfo('OBS Virtual Camera check', { available: hasOBS });
        
        return {
          success: true,
          available: hasOBS,
          camera: obsCamera
        };
      } catch (error) {
        logger.secureError('OBS Virtual Camera check error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('camera:scanDevices', async () => {
      try {
        logger.secureInfo('Camera scan requested');
        const result = await this.cameraDetector.scanCameras();
        
        return result;
      } catch (error) {
        logger.secureError('Camera scan error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('camera:getPreferred', async () => {
      try {
        const preferredCamera = this.cameraDetector.getPreferredCamera();
        
        return {
          success: true,
          camera: preferredCamera
        };
      } catch (error) {
        logger.secureError('Get preferred camera error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // UI Window Management
    ipcMain.handle('ui:openFaceSwapInterface', async () => {
      try {
        const faceSwapWindow = new BrowserWindow({
          width: 1200,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
          },
          icon: path.join(__dirname, 'assets/logos/swapintercam-logo.png'),
          title: 'SwapInterCam - Face Swap Studio',
          show: false
        });

        await faceSwapWindow.loadFile('src/renderer/face-swap-interface.html');
        
        faceSwapWindow.once('ready-to-show', () => {
          faceSwapWindow.show();
        });

        logger.secureInfo('Face Swap Studio opened');
        return { success: true };
      } catch (error) {
        logger.secureError('Failed to open Face Swap Studio', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('ui:openChatIntegration', async () => {
      try {
        const chatWindow = new BrowserWindow({
          width: 1400,
          height: 900,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false // Allow loading external chat platforms
          },
          icon: path.join(__dirname, 'assets/logos/swapintercam-logo.png'),
          title: 'SwapInterCam - Chat Integration Hub',
          show: false
        });

        await chatWindow.loadFile('src/renderer/chat-integration.html');
        
        chatWindow.once('ready-to-show', () => {
          chatWindow.show();
        });

        logger.secureInfo('Chat Integration Hub opened');
        return { success: true };
      } catch (error) {
        logger.secureError('Failed to open Chat Integration Hub', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // Configuration management
    ipcMain.handle('config:get', async (event, key) => {
      try {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        const fs = require('fs').promises;
        
        try {
          const data = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(data);
          return { success: true, value: config[key] };
        } catch (error) {
          // Config file doesn't exist or key not found
          return { success: true, value: null };
        }
      } catch (error) {
        logger.secureError('Config get error', { key, error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('config:set', async (event, key, value) => {
      try {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        const fs = require('fs').promises;
        
        let config = {};
        try {
          const data = await fs.readFile(configPath, 'utf8');
          config = JSON.parse(data);
        } catch (error) {
          // Config file doesn't exist, start with empty config
        }
        
        config[key] = value;
        
        // Ensure config directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        
        // Save config
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        logger.secureInfo('Config updated', { key });
        return { success: true };
      } catch (error) {
        logger.secureError('Config set error', { key, error: error.message });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('config:load', async () => {
      try {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        const fs = require('fs').promises;
        
        const data = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(data);
        return { success: true, config };
      } catch (error) {
        return { success: true, config: {} };
      }
    });

    ipcMain.handle('config:save', async (event, config) => {
      try {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        const fs = require('fs').promises;
        
        // Ensure config directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        
        // Save config
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        logger.secureInfo('Config saved');
        return { success: true };
      } catch (error) {
        logger.secureError('Config save error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // Session management
    ipcMain.handle('session:save', async (event, appName, sessionData) => {
      try {
        // Store session data securely
        const sessionPath = path.join(app.getPath('userData'), 'sessions', `${appName}.json`);
        const fs = require('fs').promises;
        
        // Ensure sessions directory exists
        await fs.mkdir(path.dirname(sessionPath), { recursive: true });
        
        // Save session data
        await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
        
        console.log(`Session saved for ${appName}`);
        return { success: true };
      } catch (error) {
        console.warn(`Failed to save session for ${appName}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('session:load', async (event, appName) => {
      try {
        const sessionPath = path.join(app.getPath('userData'), 'sessions', `${appName}.json`);
        const fs = require('fs').promises;
        
        const data = await fs.readFile(sessionPath, 'utf8');
        const sessionData = JSON.parse(data);
        
        console.log(`Session loaded for ${appName}`);
        return { success: true, data: sessionData };
      } catch (error) {
        // File doesn't exist or other error - return empty session
        console.log(`No session found for ${appName}`);
        return { success: true, data: null };
      }
    });

    ipcMain.handle('session:clear', async (event, appName) => {
      try {
        const sessionPath = path.join(app.getPath('userData'), 'sessions', `${appName}.json`);
        const fs = require('fs').promises;
        
        await fs.unlink(sessionPath);
        console.log(`Session cleared for ${appName}`);
        return { success: true };
      } catch (error) {
        console.log(`No session to clear for ${appName}`);
        return { success: true };
      }
    });

    ipcMain.handle('session:getPartition', async (event, appName) => {
      return { success: true, partition: `persist:${appName}` };
    });

    // Chat UI Session handlers
    ipcMain.handle('chat:loadSession', async () => {
      try {
        const { getSessionManager } = require('./src/main/services/session-manager');
        const sessionManager = getSessionManager();
        await sessionManager.initialize();
        const session = await sessionManager.getCurrentSession();
        return session;
      } catch (error) {
        logger.secureError('Failed to load chat session', { error: error.message });
        return null;
      }
    });

    ipcMain.handle('chat:createSession', async () => {
      try {
        const { getSessionManager } = require('./src/main/services/session-manager');
        const sessionManager = getSessionManager();
        await sessionManager.initialize();
        const session = await sessionManager.createSession();
        logger.secureInfo('Chat session created', { sessionId: session.id });
        return session;
      } catch (error) {
        logger.secureError('Failed to create chat session', { error: error.message });
        throw error;
      }
    });

    ipcMain.handle('chat:sendMessage', async (event, { sessionId, message }) => {
      try {
        const { getSessionManager } = require('./src/main/services/session-manager');
        const sessionManager = getSessionManager();
        
        const messageObj = {
          id: Date.now(),
          type: 'user',
          content: message,
          timestamp: new Date().toISOString()
        };
        
        await sessionManager.addMessage(sessionId, messageObj);
        
        // Generate system response
        const response = {
          message: 'Message received. SwapInterCam is processing your request.',
          timestamp: new Date().toISOString()
        };
        
        const responseObj = {
          id: Date.now() + 1,
          type: 'system',
          content: response.message,
          timestamp: response.timestamp
        };
        
        await sessionManager.addMessage(sessionId, responseObj);
        
        return response;
      } catch (error) {
        logger.secureError('Failed to send chat message', { error: error.message });
        throw error;
      }
    });

    ipcMain.handle('chat:saveMessage', async (event, { sessionId, message }) => {
      try {
        const { getSessionManager } = require('./src/main/services/session-manager');
        const sessionManager = getSessionManager();
        await sessionManager.addMessage(sessionId, message);
        return { success: true };
      } catch (error) {
        logger.secureError('Failed to save chat message', { error: error.message });
        throw error;
      }
    });

    ipcMain.handle('chat:syncMessages', async (event, { messages }) => {
      try {
        const { getSessionManager } = require('./src/main/services/session-manager');
        const sessionManager = getSessionManager();
        const session = await sessionManager.getCurrentSession();
        
        for (const message of messages) {
          await sessionManager.addMessage(session.id, message);
        }
        
        return { success: true, synced: messages.length };
      } catch (error) {
        logger.secureError('Failed to sync chat messages', { error: error.message });
        throw error;
      }
    });
  }

  async initialize() {
    // Wait for app to be ready
    await app.whenReady();

    // Setup IPC handlers
    this.setupIPC();

    // Create main window
    await this.createMainWindow();

    // Handle app activation (macOS)
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createMainWindow();
      } else if (this.mainWindow) {
        this.mainWindow.show();
      }
    });

    // Handle all windows closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle before quit
    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    console.log('SwapInterCam Chat Desktop UI started successfully');
  }
}

// Security: Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Initialize the application
  const chatApp = new SwapInterCamChatApp();
  chatApp.initialize().catch(console.error);

  // Handle second instance
  app.on('second-instance', () => {
    if (chatApp.mainWindow) {
      if (chatApp.mainWindow.isMinimized()) {
        chatApp.mainWindow.restore();
      }
      chatApp.mainWindow.focus();
    }
  });
}

// Security: Disable web security warnings in development
if (isDev) {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}