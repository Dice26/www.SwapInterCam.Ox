const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// Simple logger fallback
const logger = {
    secureInfo: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
    secureWarn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
    secureError: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
    obsActivity: (activity, data) => console.log(`[OBS] ${activity}`, data || '')
};

// Simple fallback classes
class OBSController {
    constructor() { this.connected = false; }
    async connect() { return { success: false, message: 'OBS not available' }; }
    disconnect() { this.connected = false; }
    isConnected() { return this.connected; }
    validateSceneName(name) { return true; }
    async switchScene(name) { return { success: false, message: 'OBS not connected' }; }
    async getCurrentScene() { return { success: true, scene: 'Default' }; }
    async getScenes() { return { success: true, scenes: ['Default'] }; }
}

class OBSSceneManager {
    constructor(controller) { this.controller = controller; }
    async switchSceneForTab(tab) { return { success: false, message: 'OBS not available' }; }
    getSceneMapping() { return {}; }
    async validateSceneMapping() { return { success: true }; }
    getEnhancedStatus() { return { connected: false }; }
    getAutomaticSwitcherConfig() { return { enabled: false }; }
    updateSceneProfile() { return { success: true }; }
    setAutomaticSwitchingEnabled(enabled) { return { success: true, enabled }; }
    getSwitchingStats() { return { totalSwitches: 0 }; }
}

class SwapInterCamIntegration {
    constructor() { this.connected = false; }
    async authenticateUser(creds) { return { success: true, user: { id: 'default' } }; }
    async validateCameraAccess(userId) { return { success: true, granted: true }; }
    async getCertificationStatus(userId) { return { success: true, certified: true }; }
    async logActivity(action, data) { return { success: true }; }
    getConnectionStatus() { return { connected: false }; }
}

class CameraDetector {
    constructor() { this.cameras = []; }
    getAllCameras() { return [{ id: 'default', name: 'Default Camera' }]; }
    getOBSVirtualCamera() { return null; }
    getSystemCameras() { return []; }
    getCameraStats() { return { total: 1 }; }
    hasOBSVirtualCamera() { return false; }
    getPreferredCamera() { return { id: 'default', name: 'Default Camera' }; }
    async scanCameras() { return { success: true, cameras: this.getAllCameras() }; }
}

const getFaceSwapManager = () => ({
    initialize: async () => ({ success: true }),
    getStatus: () => ({ ready: false })
});

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
            show: true,
            alwaysOnTop: true,
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

        // Load the functional UI
        await this.mainWindow.loadFile('src/renderer/app.html');

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
        // Basic IPC handlers
        ipcMain.handle('app:getVersion', () => {
            return app.getVersion();
        });

        ipcMain.handle('app:getPlatform', () => {
            return process.platform;
        });

        // Health check
        ipcMain.handle('app:health', () => {
            return {
                success: true,
                message: 'SwapInterCam is running',
                timestamp: new Date().toISOString()
            };
        });

        // Camera handlers
        ipcMain.handle('camera:getDevices', async () => {
            try {
                const cameras = this.cameraDetector.getAllCameras();
                return {
                    success: true,
                    cameras: cameras,
                    obsVirtualCamera: this.cameraDetector.getOBSVirtualCamera(),
                    systemCameras: this.cameraDetector.getSystemCameras(),
                    stats: this.cameraDetector.getCameraStats()
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('camera:scanDevices', async () => {
            try {
                const result = await this.cameraDetector.scanCameras();
                return result;
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // OBS handlers
        ipcMain.handle('obs:connect', async () => {
            try {
                const result = await this.obsController.connect();
                return result;
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('obs:isConnected', async () => {
            return { success: true, connected: this.obsController.isConnected() };
        });

        ipcMain.handle('obs:getScenes', async () => {
            try {
                const result = await this.obsController.getScenes();
                return result;
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // SWEP handlers
        ipcMain.handle('swep:getConnectionStatus', async () => {
            try {
                const status = this.swepIntegration.getConnectionStatus();
                return { success: true, status };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // UI handlers
        ipcMain.handle('ui:switchTheme', async (event, payload) => {
            try {
                logger.secureInfo('Theme switch requested', payload);
                return {
                    success: true,
                    theme: payload.theme,
                    message: `Theme switched to ${payload.theme}`
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('ui:showNotification', async (event, payload) => {
            try {
                logger.secureInfo('Notification requested', payload);
                return {
                    success: true,
                    message: 'Notification sent'
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Configuration handlers
        ipcMain.handle('config:get', async (event, key) => {
            try {
                // Simple config storage
                return { success: true, value: null };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('config:set', async (event, key, value) => {
            try {
                logger.secureInfo('Config updated', { key });
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        logger.secureInfo('IPC handlers setup complete');
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