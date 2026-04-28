/**
 * SwapInterCam Startup Diagnostic
 * Runs comprehensive checks on startup
 */

class StartupDiagnostic {
    constructor() {
        this.results = {
            camera: false,
            webviews: false,
            components: false
        };
    }

    async runDiagnostic() {
        console.log('🔍 Running SwapInterCam Startup Diagnostic...');
        
        // Test camera access
        await this.testCamera();
        
        // Test webview loading
        await this.testWebViews();
        
        // Test component loading
        await this.testComponents();
        
        // Show results
        this.showResults();
    }

    async testCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            this.results.camera = true;
            console.log('✅ Camera access: OK');
        } catch (error) {
            console.error('❌ Camera access: FAILED -', error.message);
            this.results.camera = false;
        }
    }

    async testWebViews() {
        const apps = ['whatsapp', 'messenger', 'line'];
        let working = 0;
        
        for (const app of apps) {
            const container = document.getElementById(`webview-${app}`);
            if (container && container.querySelector('webview')) {
                working++;
            }
        }
        
        this.results.webviews = working === apps.length;
        console.log(`${this.results.webviews ? '✅' : '❌'} WebViews: ${working}/${apps.length} loaded`);
    }

    async testComponents() {
        const components = [
            'WebViewManager',
            'TabManager', 
            'SessionManager',
            'CameraPreview'
        ];
        
        let loaded = 0;
        for (const component of components) {
            if (window[component] || window[component.toLowerCase()]) {
                loaded++;
            }
        }
        
        this.results.components = loaded >= components.length / 2;
        console.log(`${this.results.components ? '✅' : '❌'} Components: ${loaded}/${components.length} loaded`);
    }

    showResults() {
        const allGood = Object.values(this.results).every(result => result);
        
        console.log(`\n${allGood ? '🎉' : '⚠️'} Diagnostic Complete:`);
        console.log(`  Camera: ${this.results.camera ? '✅' : '❌'}`);
        console.log(`  WebViews: ${this.results.webviews ? '✅' : '❌'}`);
        console.log(`  Components: ${this.results.components ? '✅' : '❌'}`);
        
        if (!allGood) {
            console.log('\n🔧 Issues detected. Check console for details.');
        }
    }
}

// Run diagnostic after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        const diagnostic = new StartupDiagnostic();
        diagnostic.runDiagnostic();
    }, 3000);
});