const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, data) => {
        // Whitelist channels
        const validChannels = [
            'app:getVersion',
            'app:getPlatform',
            'app:health',
            'camera:getDevices',
            'camera:scanDevices',
            'camera:checkOBSVirtualCamera',
            'camera:getPreferred',
            'obs:connect',
            'obs:disconnect',
            'obs:switchScene',
            'obs:getCurrentScene',
            'obs:isConnected',
            'obs:getScenes',
            'swep:authenticate',
            'swep:validateCameraAccess',
            'swep:getCertificationStatus',
            'swep:logActivity',
            'swep:getConnectionStatus',
            'ui:switchTheme',
            'ui:getTheme',
            'ui:showNotification',
            'ui:getUIState',
            'ui:openFaceSwapInterface',
            'ui:openChatIntegration',
            'config:get',
            'config:set',
            'config:load',
            'config:save'
        ];
        
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    },
    
    on: (channel, callback) => {
        const validChannels = [
            'ui-update',
            'theme-changed',
            'notification-sent',
            'camera-status-changed',
            'obs-status-changed'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    },
    
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

console.log('🔗 Preload script loaded - IPC bridge ready');