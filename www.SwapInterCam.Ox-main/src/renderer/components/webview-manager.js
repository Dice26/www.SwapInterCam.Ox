// WebView Manager - Handles creation and management of chat application webviews

class WebViewManager {
    constructor() {
        this.webviews = new Map();
        this.currentApp = 'whatsapp';
        this.isInitialized = false;
        
        // Chat application configurations
        this.chatApps = {
            whatsapp: {
                name: 'WhatsApp',
                url: 'https://web.whatsapp.com',
                partition: 'persist:whatsapp',
                icon: '📱',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            messenger: {
                name: 'Messenger',
                url: 'https://www.messenger.com',
                partition: 'persist:messenger',
                icon: '💬',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            line: {
                name: 'LINE',
                url: 'https://line.me/en/',
                partition: 'persist:line',
                icon: '💚',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('Initializing WebView Manager...');

        try {
            // Create webviews for all chat applications
            for (const [appName, config] of Object.entries(this.chatApps)) {
                await this.createWebView(appName, config);
            }

            this.isInitialized = true;
            console.log('WebView Manager initialized successfully');
        } catch (error) {
            this.log('Failed to initialize WebView Manager:', error);
            throw error;
        }
    }

    async createWebView(appName, config) {
        const container = (document.getElementById(`webview-${appName}`) || {});
        
        if (!container) {
            throw new Error(`Container not found for ${appName}`);
        }

        // Remove any existing webview
        container./* WARNING: innerHTML usage - potential XSS risk */ innerHTML = '';

        // Create webview element
        const webview = document.createElement('webview');
        
        // Set webview attributes
        webview.src = config.url;
        webview.partition = config.partition;
        webview.useragent = config.userAgent;
        webview.webpreferences = 'contextIsolation=true,nodeIntegration=false,webSecurity=true';
        webview.allowpopups = false;
        webview.disablewebsecurity = false;
        
        // Set styles
        webview.style.width = '100%';
        webview.style.height = '100%';
        webview.style.border = 'none';

        // Setup event listeners
        this.setupWebViewEventListeners(webview, appName, config);

        // Add webview to container
        container.appendChild(webview);
        
        // Store webview reference
        this.webviews.set(appName, {
            element: webview,
            config: config,
            isLoaded: false,
            hasError: false
        });

        console.log(`Created webview for ${config.name}`);
        return webview;
    }

    setupWebViewEventListeners(webview, appName, config) {
        // DOM ready event
        webview.addEventListener('dom-ready', () => {
            console.log(`${config.name} webview DOM ready`);
            
            const webviewData = this.webviews.get(appName);
            if (webviewData) {
                webviewData.isLoaded = true;
                webviewData.hasError = false;
            }

            // Inject custom CSS for better integration
            this.injectCustomStyles(webview, appName);
            
            // Update connection status
            this.updateConnectionStatus(appName, true);
            
            // Emit custom event
            this.emitEvent('webview-ready', { appName, config });
        });

        // Loading events
        webview.addEventListener('did-start-loading', () => {
            console.log(`${config.name} started loading`);
            this.emitEvent('webview-loading-start', { appName, config });
        });

        webview.addEventListener('did-stop-loading', () => {
            console.log(`${config.name} finished loading`);
            this.emitEvent('webview-loading-stop', { appName, config });
        });

        // Error handling
        webview.addEventListener('did-fail-load', (event) => {
            this.log(`Failed to load ${config.name}:`, event);
            
            const webviewData = this.webviews.get(appName);
            if (webviewData) {
                webviewData.hasError = true;
                webviewData.isLoaded = false;
            }

            this.updateConnectionStatus(appName, false);
            this.emitEvent('webview-error', { appName, config, error: event });
        });

        // Navigation events
        webview.addEventListener('will-navigate', (event) => {
            console.log(`${config.name} navigating to:`, event.url);
            
            // Allow navigation within the same domain
            const allowedDomains = this.getAllowedDomains(appName);
            const url = new URL(event.url);
            
            if (!allowedDomains.includes(url.hostname)) {
                this.log(`Blocked navigation to unauthorized domain: ${url.hostname}`);
                event.preventDefault();
            }
        });

        // New window handling (security)
        webview.addEventListener('new-window', (event) => {
            console.log(`${config.name} attempted to open new window:`, event.url);
            event.preventDefault(); // Block all popups for security
        });

        // Console message handling
        webview.addEventListener('console-message', (event) => {
            if (event.level === 0) { // Error level
                this.log(`${config.name} console error:`, event.message);
            }
        });

        // Page title updates
        webview.addEventListener('page-title-updated', (event) => {
            this.emitEvent('webview-title-updated', {
                appName, 
                title: event.title,
                config 
            });
        });
    }

    injectCustomStyles(webview, appName) {
        // Inject custom CSS to improve integration
        const customCSS = `
            /* Hide unnecessary elements and improve appearance */
            [data-testid="intro-md-beta-logo-dark"],
            [data-testid="intro-md-beta-logo-light"] {
                display: none !important;
            }
            
            /* Improve scrollbar appearance */
            ::-webkit-scrollbar {
                width: 8px;
            }
            
            ::-webkit-scrollbar-track {
                background: #f1f1f1;
            }
            
            ::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
        `;

        webview.insertCSS(customCSS).catch(err => {
            this.log(`Failed to inject CSS for ${appName}:`, err);
        });
    }

    getAllowedDomains(appName) {
        const domainMap = {
            whatsapp: ['web.whatsapp.com', 'whatsapp.com'],
            messenger: ['www.messenger.com', 'messenger.com', 'facebook.com'],
            line: ['line.me', 'access.line.me']
        }
        return domainMap[appName] || [];
    }

    switchToApp(appName) {
        if (!this.chatApps[appName]) {
            this.handleError('Unknown app: ${appName}', new Error('Unknown app: ${appName}'));
            return false;
        }

        if (this.currentApp === appName) {
            return true; // Already active
        }

        console.log(`Switching from ${this.currentApp} to ${appName}`);

        // Hide current webview container
        const currentContainer = (document.getElementById(`webview-${this.currentApp}`) || {});
        if (currentContainer) {
            currentContainer.classList.remove('active');
        }

        // Show new webview container
        const newContainer = (document.getElementById(`webview-${appName}`) || {});
        if (newContainer) {
            newContainer.classList.add('active');
        }

        // Update current app
        const previousApp = this.currentApp;
        this.currentApp = appName;

        // Emit switch event
        this.emitEvent('app-switched', {
            from: previousApp, 
            to: appName,
            config: this.chatApps[appName]
        });

        return true;
    }

    getWebView(appName) {
        const webviewData = this.webviews.get(appName);
        return webviewData ? webviewData.element : null;
    }

    getWebViewData(appName) {
        return this.webviews.get(appName);
    }

    isWebViewLoaded(appName) {
        const webviewData = this.webviews.get(appName);
        return webviewData ? webviewData.isLoaded : false;
    }

    hasWebViewError(appName) {
        const webviewData = this.webviews.get(appName);
        return webviewData ? webviewData.hasError : false;
    }

    reloadWebView(appName) {
        const webview = this.getWebView(appName);
        if (webview) {
            console.log(`Reloading ${appName} webview`);
            webview.reload();
            return true;
        }
        return false;
    }

    clearWebViewData(appName) {
        const webview = this.getWebView(appName);
        if (webview) {
            console.log(`Clearing data for ${appName} webview`);
            webview.clearHistory();
            // Note: clearStorageData requires additional permissions
            return true;
        }
        return false;
    }

    updateConnectionStatus(appName, connected) {
        // Update UI connection status
        const statusElement = (document.getElementById('connection-status') || {});
        if (statusElement && appName === this.currentApp) {
            if (connected) {
                statusElement.textContent = '🟢 Connected';
                statusElement.style.color = '#27ae60';
            } else {
                statusElement.textContent = '🔴 Disconnected';
                statusElement.style.color = '#e74c3c';
            }
        }
    }

    emitEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    destroy() {
        console.log('Destroying WebView Manager...');
        
        // Remove all webviews
        for (const [appName, webviewData] of this.webviews) {
            if (webviewData.element && webviewData.element.parentNode) {
                webviewData.element.parentNode.removeChild(webviewData.element);
            }
        }
        
        this.webviews.clear();
        this.isInitialized = false;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] webview-manager ${level}: ${message}`;
        
        if (level === 'ERROR') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}

// Export for use in main scripts
window.WebViewManager = WebViewManager;