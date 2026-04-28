/**
 * WebView Diagnostic and Fix
 * Diagnoses and fixes webview loading issues
 */

class WebViewDiagnostic {
    constructor() {
        this.issues = [];
    }

    async diagnose() {
        console.log('🔍 Diagnosing WebView Issues...');
        
        // Check if webview containers exist
        const apps = ['whatsapp', 'messenger', 'line'];
        
        for (const app of apps) {
            const container = document.getElementById(`webview-${app}`);
            if (!container) {
                this.issues.push(`Missing container for ${app}`);
                continue;
            }
            
            const webview = container.querySelector('webview');
            if (!webview) {
                this.issues.push(`No webview element in ${app} container`);
                continue;
            }
            
            // Check webview attributes
            if (!webview.src) {
                this.issues.push(`Missing src attribute for ${app} webview`);
            }
            
            if (!webview.partition) {
                this.issues.push(`Missing partition for ${app} webview`);
            }
        }
        
        return this.issues;
    }

    async fixWebViews() {
        console.log('🔧 Fixing WebView Issues...');
        
        const webviewManager = window.webviewManager;
        if (!webviewManager) {
            console.error('WebView Manager not found');
            return;
        }
        
        // Reinitialize webviews
        try {
            await webviewManager.initialize();
            console.log('✅ WebViews reinitialized');
        } catch (error) {
            console.error('❌ Failed to reinitialize webviews:', error);
        }
    }

    async testWebViewLoading() {
        console.log('🧪 Testing WebView Loading...');
        
        const apps = ['whatsapp', 'messenger', 'line'];
        const results = {};
        
        for (const app of apps) {
            const container = document.getElementById(`webview-${app}`);
            const webview = container?.querySelector('webview');
            
            if (webview) {
                results[app] = {
                    exists: true,
                    src: webview.src,
                    partition: webview.partition,
                    loaded: webview.src !== 'about:blank'
                };
            } else {
                results[app] = {
                    exists: false,
                    error: 'WebView element not found'
                };
            }
        }
        
        console.log('WebView Test Results:', results);
        return results;
    }
}

// Auto-run diagnostic
document.addEventListener('DOMContentLoaded', async () => {
    const diagnostic = new WebViewDiagnostic();
    
    // Wait a bit for webviews to initialize
    setTimeout(async () => {
        const issues = await diagnostic.diagnose();
        
        if (issues.length > 0) {
            console.warn('WebView Issues Found:', issues);
            await diagnostic.fixWebViews();
        }
        
        await diagnostic.testWebViewLoading();
    }, 2000);
});