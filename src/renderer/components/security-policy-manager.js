/**
 * Security Policy Manager
 */
class SecurityPolicyManager {
    constructor() {
        this.blockedDomains = [
            'doubleclick.net',
            'googletagmanager.com',
            'facebook.com/tr',
            'analytics.google.com'
        ];
    }

    configureWebView(webview, appName) {
        webview.setAttribute('partition', 'persist:' + appName);
        webview.setAttribute('webpreferences', 'contextIsolation=true,nodeIntegration=false');
        webview.setAttribute('allowpopups', 'false');

        webview.addEventListener('dom-ready', () => {
            const jsCode = 'console.log("Security policies applied for ' + appName + '");';
            webview.executeJavaScript(jsCode);
        });

        return webview;
    }

    validateURL(url) {
        const allowedDomains = [
            'web.whatsapp.com',
            'www.messenger.com',
            'line.me'
        ];

        try {
            const urlObj = new URL(url);
            return allowedDomains.some(domain => urlObj.hostname.includes(domain));
        } catch {
            return false;
        }
    }
}

window.securityManager = new SecurityPolicyManager();