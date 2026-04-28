/**
 * OBS WebSocket Controller
 */
class OBSWebSocketController {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.config = {
            host: 'localhost',
            port: 4444,
            password: null
        };
        this.sceneMap = {
            whatsapp: 'WhatsAppCam',
            messenger: 'MessengerCam',
            line: 'LINECam'
        };
    }

    async connect() {
        if (typeof WebSocket === 'undefined') {
            console.log('WebSocket not available in this environment');
            return;
        }
        
        try {
            this.ws = new WebSocket('ws://' + this.config.host + ':' + this.config.port);
            
            this.ws.onopen = () => {
                console.log('OBS WebSocket connected');
                this.connected = true;
            };

            this.ws.onclose = () => {
                console.log('OBS WebSocket disconnected');
                this.connected = false;
            };

        } catch (error) {
            console.error('Failed to connect to OBS:', error);
        }
    }

    async switchScene(appName) {
        const sceneName = this.sceneMap[appName];
        if (!sceneName || !this.connected) {
            return;
        }

        console.log('Switching to scene:', sceneName);
    }

    isConnected() {
        return this.connected;
    }
}

window.obsController = new OBSWebSocketController();