// Security Manager - Enhanced security policies and monitoring

class SecurityManager {
    constructor() {
        this.blockedDomains = new Set([
            'doubleclick.net',
            'googleadservices.com',
            'googlesyndication.com',
            'facebook.com/tr',
            'analytics.google.com',
            'google-analytics.com',
            'googletagmanager.com'
        ]);
        
        this.allowedProtocols = new Set(['https:', 'wss:']);
        this.securityEvents = [];
        this.maxSecurityEvents = 100;
        
        this.initialize();
    }

    initialize() {
        console.log('Initializing Security Manager...');
        
        // Setup Content Security Policy monitoring
        this.setupCSPMonitoring();
        
        // Setup navigation monitoring
        this.setupNavigationMonitoring();
        
        // Setup popup blocking
        this.setupPopupBlocking();
        
        // Setup telemetry blocking
        this.setupTelemetryBlocking();
        
        console.log('Security Manager initialized');
    }

    setupCSPMonitoring() {
        // Listen for CSP violations
        document.addEventListener('securitypolicyviolation', (event) => {
            this.logSecurityEvent('csp_violation', {
                violatedDirective: event.violatedDirective,
                blockedURI: event.blockedURI,
                documentURI: event.documentURI,
                originalPolicy: event.originalPolicy
            });
            
            console.warn('CSP Violation:', event);
        });
    }

    setupNavigationMonitoring() {
        // Monitor webview navigation attempts
        document.addEventListener('webview-navigation-attempt', (event) => {
            const { appName, url, allowed } = event.detail;
            
            if (!allowed) {
                this.logSecurityEvent('blocked_navigation', {
                    appName,
                    url,
                    reason: 'unauthorized_domain'
                });
                
                console.warn(`Blocked navigation attempt in ${appName} to: ${url}`);
            }
        });
    }

    setupPopupBlocking() {
        // Monitor popup attempts
        document.addEventListener('webview-popup-blocked', (event) => {
            const { appName, url } = event.detail;
            
            this.logSecurityEvent('blocked_popup', {
                appName,
                url
            });
            
            console.warn(`Blocked popup attempt in ${appName}: ${url}`);
        });
    }

    setupTelemetryBlocking() {
        // Block known telemetry and tracking requests
        document.addEventListener('webview-request-blocked', (event) => {
            const { appName, url, reason } = event.detail;
            
            this.logSecurityEvent('blocked_request', {
                appName,
                url,
                reason
            });
            
            console.log(`Blocked ${reason} request in ${appName}: ${url}`);
        });
    }

    validateURL(url, appName) {
        try {
            const urlObj = new URL(url);
            
            // Check protocol
            if (!this.allowedProtocols.has(urlObj.protocol)) {
                return {
                    allowed: false,
                    reason: 'invalid_protocol',
                    details: `Protocol ${urlObj.protocol} not allowed`
                };
            }
            
            // Check blocked domains
            if (this.blockedDomains.has(urlObj.hostname)) {
                return {
                    allowed: false,
                    reason: 'blocked_domain',
                    details: `Domain ${urlObj.hostname} is blocked`
                };
            }
            
            // Check app-specific allowed domains
            const allowedDomains = this.getAllowedDomainsForApp(appName);
            if (allowedDomains.length > 0 && !allowedDomains.includes(urlObj.hostname)) {
                return {
                    allowed: false,
                    reason: 'unauthorized_domain',
                    details: `Domain ${urlObj.hostname} not authorized for ${appName}`
                };
            }
            
            return {
                allowed: true,
                reason: 'authorized',
                details: 'URL is allowed'
            };
            
        } catch (error) {
            return {
                allowed: false,
                reason: 'invalid_url',
                details: 'Invalid URL format'
            };
        }
    }

    getAllowedDomainsForApp(appName) {
        const domainMap = {
            whatsapp: [
                'web.whatsapp.com',
                'whatsapp.com',
                'static.whatsapp.net',
                'mmg.whatsapp.net'
            ],
            messenger: [
                'www.messenger.com',
                'messenger.com',
                'facebook.com',
                'static.xx.fbcdn.net',
                'scontent.xx.fbcdn.net'
            ],
            line: [
                'line.me',
                'access.line.me',
                'obs.line-apps.com',
                'static.line-scdn.net'
            ]
        };
        
        return domainMap[appName] || [];
    }

    sanitizeHTML(html) {
        // Basic HTML sanitization
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    sanitizeURL(url) {
        try {
            const urlObj = new URL(url);
            
            // Remove tracking parameters
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'fbclid', 'gclid', 'msclkid', '_ga', '_gl'
            ];
            
            trackingParams.forEach(param => {
                urlObj.searchParams.delete(param);
            });
            
            return urlObj.toString();
        } catch (error) {
            return url; // Return original if parsing fails
        }
    }

    logSecurityEvent(type, details) {
        const event = {
            type,
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        this.securityEvents.push(event);
        
        // Limit event history
        if (this.securityEvents.length > this.maxSecurityEvents) {
            this.securityEvents.shift();
        }
        
        // Emit security event
        const customEvent = new CustomEvent('security-event', {
            detail: event
        });
        document.dispatchEvent(customEvent);
    }

    getSecurityEvents(type = null, limit = 50) {
        let events = this.securityEvents;
        
        if (type) {
            events = events.filter(event => event.type === type);
        }
        
        return events.slice(-limit);
    }

    getSecurityStats() {
        const stats = {
            totalEvents: this.securityEvents.length,
            eventTypes: {},
            recentEvents: this.securityEvents.slice(-10)
        };
        
        // Count events by type
        this.securityEvents.forEach(event => {
            stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
        });
        
        return stats;
    }

    clearSecurityEvents() {
        this.securityEvents = [];
        console.log('Security events cleared');
    }

    // Security policy enforcement
    enforceSecurityPolicy(webview, appName) {
        if (!webview) return;

        // Set up request filtering
        webview.addEventListener('will-navigate', (event) => {
            const validation = this.validateURL(event.url, appName);
            
            if (!validation.allowed) {
                event.preventDefault();
                
                // Emit blocked navigation event
                const blockedEvent = new CustomEvent('webview-navigation-attempt', {
                    detail: {
                        appName,
                        url: event.url,
                        allowed: false,
                        reason: validation.reason
                    }
                });
                document.dispatchEvent(blockedEvent);
            }
        });

        // Block new windows/popups
        webview.addEventListener('new-window', (event) => {
            event.preventDefault();
            
            // Emit blocked popup event
            const popupEvent = new CustomEvent('webview-popup-blocked', {
                detail: {
                    appName,
                    url: event.url
                }
            });
            document.dispatchEvent(popupEvent);
        });

        // Monitor console messages for security issues
        webview.addEventListener('console-message', (event) => {
            if (event.level === 0 && event.message.includes('security')) {
                this.logSecurityEvent('console_security_warning', {
                    appName,
                    message: event.message,
                    line: event.line,
                    sourceId: event.sourceId
                });
            }
        });
    }

    // Generate security report
    generateSecurityReport() {
        const stats = this.getSecurityStats();
        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalSecurityEvents: stats.totalEvents,
                eventBreakdown: stats.eventTypes,
                blockedDomains: Array.from(this.blockedDomains),
                allowedProtocols: Array.from(this.allowedProtocols)
            },
            recentEvents: stats.recentEvents,
            recommendations: this.generateSecurityRecommendations(stats)
        };
        
        return report;
    }

    generateSecurityRecommendations(stats) {
        const recommendations = [];
        
        if (stats.eventTypes.blocked_navigation > 10) {
            recommendations.push({
                type: 'warning',
                message: 'High number of blocked navigation attempts detected. Consider reviewing allowed domains.'
            });
        }
        
        if (stats.eventTypes.blocked_popup > 5) {
            recommendations.push({
                type: 'info',
                message: 'Multiple popup attempts blocked. This is normal behavior for enhanced security.'
            });
        }
        
        if (stats.eventTypes.csp_violation > 0) {
            recommendations.push({
                type: 'warning',
                message: 'Content Security Policy violations detected. Review CSP configuration.'
            });
        }
        
        return recommendations;
    }
}

// Export for use in main scripts
window.SecurityManager = SecurityManager;