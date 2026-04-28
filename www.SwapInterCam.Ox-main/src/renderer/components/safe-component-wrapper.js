
// Safe Component Wrapper
// Provides error handling and safety features for all components

class SafeComponentWrapper {
    constructor(componentName) {
        this.componentName = componentName;
        this.errors = [];
        this.warnings = [];
    }

    safeExecute(operation, context = 'unknown') {
        try {
            return operation();
        } catch (error) {
            this.handleError(context, error);
            return null;
        }
    }

    async safeExecuteAsync(operation, context = 'unknown') {
        try {
            return await operation();
        } catch (error) {
            this.handleError(context, error);
            return null;
        }
    }

    handleError(context, error) {
        const errorInfo = {
            component: this.componentName,
            context: context,
            message: error.message,
            timestamp: new Date().toISOString()
        };
        
        this.errors.push(errorInfo);
        console.warn(`[${this.componentName}] Error in ${context}: ${error.message}`);
        
        // Emit error event for global handling
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('component-error', {
                detail: errorInfo
            }));
        }
    }

    safeGetElement(selector) {
        return this.safeExecute(() => {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error(`Element not found: ${selector}`);
            }
            return element;
        }, `getElement(${selector})`);
    }

    safeAddEventListener(element, event, handler) {
        return this.safeExecute(() => {
            if (!element) {
                throw new Error('Element is null or undefined');
            }
            element.addEventListener(event, (e) => {
                this.safeExecute(() => handler(e), `eventHandler(${event})`);
            });
        }, `addEventListener(${event})`);
    }

    getErrorSummary() {
        return {
            component: this.componentName,
            errorCount: this.errors.length,
            warningCount: this.warnings.length,
            errors: this.errors.slice(-5) // Last 5 errors
        };
    }
}

// Export for use in other components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeComponentWrapper;
} else {
    window.SafeComponentWrapper = SafeComponentWrapper;
}
