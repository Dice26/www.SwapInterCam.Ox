// Camera Access Control - Manages SWEP certification and camera permissions

class CameraAccessControl {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.certificationStatus = null;
        this.cameraPermissions = null;
        this.accessCheckInterval = null;
        this.checkIntervalMs = 60000; // Check every minute
        
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('Initializing Camera Access Control...');

        try {
            // Check initial authentication status
            await this.checkAuthenticationStatus();
            
            // Start periodic access validation
            this.startPeriodicAccessCheck();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('Camera Access Control initialized successfully');
        } catch (error) {
            this.log('Failed to initialize Camera Access Control:', error);
            throw error;
        }
    }

    async checkAuthenticationStatus() {
        try {
            console.log('Checking SWEP authentication status...');
            
            const authResult = await window.electronAPI.swep.authenticate();
            
            if (authResult.success) {
                this.currentUser = authResult.user;
                this.certificationStatus = authResult.certification;
                
                console.log('User authenticated:', this.currentUser);
                console.log('Certification status:', this.certificationStatus);
                
                // Validate camera access
                await this.validateCameraAccess();
                
                // Update UI
                this.updateAuthenticationUI(true);
                
                return true;
            } else {
                this.log('Authentication failed:', authResult.error);
                this.updateAuthenticationUI(false);
                return false;
            }
        } catch (error) {
            this.log('Authentication check failed:', error);
            this.updateAuthenticationUI(false);
            return false;
        }
    }

    async validateCameraAccess() {
        if (!this.currentUser) {
            this.log('Cannot validate camera access: No authenticated user');
            return false;
        }

        try {
            console.log('Validating camera access for user:', this.currentUser.id);
            
            const validationResult = await window.electronAPI.swep.validateCameraAccess(this.currentUser.id);
            
            if (validationResult.success) {
                this.cameraPermissions = {
                    granted: validationResult.granted,
                    reason: validationResult.reason,
                    expiresAt: validationResult.expiresAt,
                    lastChecked: new Date().toISOString()
                }
                console.log('Camera access validation result:', this.cameraPermissions);
                
                // Update UI
                this.updateCameraAccessUI(validationResult.granted);
                
                // Emit event
                this.emitAccessEvent('camera-access-validated', {
                    granted: validationResult.granted,
                    reason: validationResult.reason,
                    user: this.currentUser
                });
                
                return validationResult.granted;
            } else {
                this.log('Camera access validation failed:', validationResult.error);
                this.updateCameraAccessUI(false);
                return false;
            }
        } catch (error) {
            this.log('Camera access validation error:', error);
            this.updateCameraAccessUI(false);
            return false;
        }
    }

    async requestCameraAccess() {
        console.log('Requesting camera access...');
        
        if (!this.currentUser) {
            this.log('Cannot request camera access: No authenticated user');
            this.showAccessDeniedDialog('Please authenticate first');
            return false;
        }

        if (!this.certificationStatus?.certified) {
            this.log('Cannot request camera access: User not certified');
            this.showCertificationRequiredDialog();
            return false;
        }

        // Validate current access
        const hasAccess = await this.validateCameraAccess();
        
        if (hasAccess) {
            console.log('Camera access already granted');
            return true;
        } else {
            console.log('Camera access denied');
            this.showAccessDeniedDialog(this.cameraPermissions?.reason || 'Access denied');
            return false;
        }
    }

    async checkCertificationExpiry() {
        if (!this.certificationStatus) return;

        const expiresAt = new Date(this.certificationStatus.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // Warn if expiring within 7 days
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (timeUntilExpiry <= 0) {
            this.log('Certification has expired');
            this.showCertificationExpiredDialog();
            this.updateCameraAccessUI(false);
            return false;
        } else if (timeUntilExpiry <= sevenDays) {
            this.log('Certification expiring soon');
            this.showCertificationExpiringDialog(Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000)));
        }
        
        return true;
    }

    startPeriodicAccessCheck() {
        if (this.accessCheckInterval) {
            clearInterval(this.accessCheckInterval);
        }
        
        this.accessCheckInterval = setInterval(async () => {
            try {
                console.log('Performing periodic access check...');
                
                // Check certification expiry
                const certValid = await this.checkCertificationExpiry();
                
                if (certValid) {
                    // Revalidate camera access
                    await this.validateCameraAccess();
                }
            } catch (error) {
                this.log('Periodic access check failed:', error);
            }
        }, this.checkIntervalMs);
        
        console.log(`Started periodic access check (${this.checkIntervalMs}ms interval)`);
    }

    stopPeriodicAccessCheck() {
        if (this.accessCheckInterval) {
            clearInterval(this.accessCheckInterval);
            this.accessCheckInterval = null;
            console.log('Stopped periodic access check');
        }
    }

    setupEventListeners() {
        // Listen for webview camera requests
        document.addEventListener('webview-camera-requested', async (event) => {
            const { appName } = event.detail;
            console.log(`Camera requested by ${appName}`);
            
            const hasAccess = await this.requestCameraAccess();
            
            if (hasAccess) {
                // Log camera usage
                await this.logCameraUsage(appName, 'camera_requested');
                
                // Allow camera access
                this.emitAccessEvent('camera-access-granted', { appName });
            } else {
                // Deny camera access
                this.emitAccessEvent('camera-access-denied', { appName });
            }
        });

        // Listen for authentication events
        document.addEventListener('user-authentication-changed', async (event) => {
            const { authenticated } = event.detail;
            
            if (authenticated) {
                await this.checkAuthenticationStatus();
            } else {
                this.currentUser = null;
                this.certificationStatus = null;
                this.cameraPermissions = null;
                this.updateAuthenticationUI(false);
                this.updateCameraAccessUI(false);
            }
        });
    }

    updateAuthenticationUI(authenticated) {
        const statusElement = (document.getElementById('certification-status') || {});
        if (statusElement) {
            if (authenticated && this.certificationStatus?.certified) {
                statusElement.textContent = '🔒 Certified';
                statusElement.style.color = '#27ae60';
                statusElement.title = `Certified until ${new Date(this.certificationStatus.expiresAt).toLocaleDateString()}`;
            } else if (authenticated) {
                statusElement.textContent = '🔓 Not Certified';
                statusElement.style.color = '#e74c3c';
                statusElement.title = 'User authenticated but not certified for camera access';
            } else {
                statusElement.textContent = '❌ Not Authenticated';
                statusElement.style.color = '#e74c3c';
                statusElement.title = 'User not authenticated';
            }
        }
    }

    updateCameraAccessUI(hasAccess) {
        const cameraStatus = (document.getElementById('camera-status') || {});
        if (cameraStatus) {
            if (hasAccess) {
                cameraStatus.textContent = 'SwapInterCam Enhanced';
                cameraStatus.style.color = '#27ae60';
            } else {
                cameraStatus.textContent = 'Access Denied';
                cameraStatus.style.color = '#e74c3c';
            }
        }

        // Enable/disable camera controls
        const cameraControlsToggle = (document.getElementById('camera-controls-toggle') || {});
        if (cameraControlsToggle) {
            cameraControlsToggle.disabled = !hasAccess;
            cameraControlsToggle.title = hasAccess ? 
                'Camera Controls' : 
                'Camera access required';
        }
    }

    showCertificationRequiredDialog() {
        this.showDialog(
            'Certification Required',
            'You need to be certified to access camera features. Please contact your administrator to request certification.',
            [
                { text: 'OK', action: 'dismiss' },
                { text: 'Request Certification', action: 'request-cert' }
            ]
        );
    }

    showAccessDeniedDialog(reason) {
        this.showDialog(
            'Camera Access Denied',
            `Camera access is not available: ${reason}`,
            [
                { text: 'OK', action: 'dismiss' },
                { text: 'Retry', action: 'retry-access' }
            ]
        );
    }

    showCertificationExpiredDialog() {
        this.showDialog(
            'Certification Expired',
            'Your certification has expired. Camera access is no longer available. Please renew your certification.',
            [
                { text: 'OK', action: 'dismiss' },
                { text: 'Renew Certification', action: 'renew-cert' }
            ]
        );
    }

    showCertificationExpiringDialog(daysLeft) {
        this.showDialog(
            'Certification Expiring Soon',
            `Your certification will expire in ${daysLeft} day(s). Please renew it to maintain camera access.`,
            [
                { text: 'Remind Later', action: 'dismiss' },
                { text: 'Renew Now', action: 'renew-cert' }
            ]
        );
    }

    showDialog(title, message, buttons) {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'access-control-modal';
        modal./* WARNING: innerHTML usage - potential XSS risk */ innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    ${buttons.map(btn => `
                        <button class="modal-button" data-action="${btn.action}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelectorAll('.modal-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                
                switch (action) {
                    case 'retry-access':
                        await this.requestCameraAccess();
                        break;
                    case 'request-cert':
                    case 'renew-cert':
                        this.openCertificationRequest();
                        break;
                    case 'dismiss':
                    default:
                        break;
                }
                
                modal.remove();
            });
        });

        // Add to page
        document.body.appendChild(modal);

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 30000);
    }

    openCertificationRequest() {
        // Open certification request in default browser
        const certUrl = 'http://localhost:8000/request-certification';
        
        if (window.electronAPI && window.electronAPI.shell) {
            window.electronAPI.shell.openExternal(certUrl);
        } else {
            console.log('Please visit:', certUrl);
        }
    }

    async logCameraUsage(appName, action) {
        try {
            await window.electronAPI.swep.logActivity({
                action: action,
                data: {
                    appName: appName,
                    userId: this.currentUser?.id,
                    timestamp: new Date().toISOString(),
                    cameraPermissions: this.cameraPermissions
                }
            });
        } catch (error) {
            this.log('Failed to log camera usage:', error);
        }
    }

    emitAccessEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    // Public API
    isUserAuthenticated() {
        return this.currentUser !== null;
    }

    isUserCertified() {
        return this.certificationStatus?.certified === true;
    }

    hasCameraAccess() {
        return this.cameraPermissions?.granted === true;
    }

    getUserInfo() {
        return {
            user: this.currentUser,
            certification: this.certificationStatus,
            cameraPermissions: this.cameraPermissions
        }
    }

    async refreshAccess() {
        console.log('Refreshing access status...');
        await this.checkAuthenticationStatus();
    }

    destroy() {
        console.log('Destroying Camera Access Control...');
        
        this.stopPeriodicAccessCheck();
        this.currentUser = null;
        this.certificationStatus = null;
        this.cameraPermissions = null;
        this.isInitialized = false;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] camera-access-control ${level}: ${message}`;
        
        if (level === 'ERROR') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}

// Export for use in main scripts
window.CameraAccessControl = CameraAccessControl;