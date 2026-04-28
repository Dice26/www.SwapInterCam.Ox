// Production Error Handler - Clean, Professional Error Management

class ProductionErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.errorCounts = new Map();
        this.suppressedErrors = new Set();
        
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError('Global Error', event.error || event.message);
            event.preventDefault();
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled Promise', event.reason);
            event.preventDefault();
        });

        // Component errors
        document.addEventListener('component-error', (event) => {
            this.handleError('Component Error', event.detail);
        });
    }

    handleError(context, error) {
        const errorKey = `${context}:${error?.message || error}`;
        
        // Prevent spam
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);
        
        if (count > 5) {
            if (!this.suppressedErrors.has(errorKey)) {
                console.warn(`Suppressing repeated error: ${errorKey}`);
                this.suppressedErrors.add(errorKey);
            }
            return;
        }

        // Log error professionally
        const errorInfo = {
            context,
            message: error?.message || error?.toString() || 'Unknown error',
            timestamp: new Date().toISOString(),
            stack: error?.stack
        };

        this.errors.push(errorInfo);
        
        // Keep only recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }

        // Professional logging
        console.warn(`[${errorInfo.timestamp}] ${context}: ${errorInfo.message}`);
    }

    getErrorSummary() {
        return {
            totalErrors: this.errors.length,
            recentErrors: this.errors.slice(-10),
            errorCounts: Object.fromEntries(this.errorCounts),
            suppressedCount: this.suppressedErrors.size
        };
    }

    clearErrors() {
        this.errors = [];
        this.errorCounts.clear();
        this.suppressedErrors.clear();
    }
}

// Initialize global error handler
window.productionErrorHandler = new ProductionErrorHandler();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductionErrorHandler;
}