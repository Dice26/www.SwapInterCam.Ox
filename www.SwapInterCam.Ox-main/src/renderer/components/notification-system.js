/**
 * Enhanced Notification System for SwapInterCam Chat Desktop UI
 * Handles unified notifications across WhatsApp, Messenger, and LINE
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.soundEnabled = true;
        this.doNotDisturb = false;
        this.chatAppNotifications = {
            whatsapp: { count: 0, lastMessage: null, icon: '💬' },
            messenger: { count: 0, lastMessage: null, icon: '📘' },
            line: { count: 0, lastMessage: null, icon: '💚' }
        };
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        this.badgeElement = null;
        
        this.initialize();
    }

    initialize() {
        console.log('Enhanced Notification System initialized');
        this.createContainer();
        this.createBadge();
        this.setupWebviewListeners();
        this.loadSettings();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
        this.container = container;
    }

    createBadge() {
        const badge = document.createElement('div');
        badge.id = 'notification-badge';
        badge.className = 'notification-badge hidden';
        badge.innerHTML = '<span class="badge-count">0</span>';
        document.body.appendChild(badge);
        this.badgeElement = badge;
        
        // Click to show notification center
        badge.addEventListener('click', () => {
            this.showNotificationCenter();
        });
    }

    setupWebviewListeners() {
        // Listen for webview notifications
        document.addEventListener('webview-notification', (event) => {
            this.handleWebviewNotification(event.detail);
        });
        
        // Listen for tab changes to update badge
        document.addEventListener('tab-changed', (event) => {
            this.updateBadgeForTab(event.detail.activeTab);
        });
    }

    handleWebviewNotification(data) {
        const { appName, title, body, icon, tag } = data;
        
        if (this.doNotDisturb) {
            console.log('Notification blocked by Do Not Disturb mode');
            return;
        }
        
        // Update chat app notification count
        if (this.chatAppNotifications[appName]) {
            this.chatAppNotifications[appName].count++;
            this.chatAppNotifications[appName].lastMessage = {
                title,
                body,
                timestamp: Date.now()
            };
        }
        
        // Show desktop notification
        this.showChatNotification(appName, title, body, icon);
        
        // Update badge
        this.updateBadge();
        
        // Play sound if enabled
        if (this.soundEnabled) {
            this.playNotificationSound(appName);
        }
    }

    showChatNotification(appName, title, body, icon) {
        const appInfo = this.chatAppNotifications[appName];
        const appIcon = appInfo ? appInfo.icon : '💬';
        
        const notification = {
            id: Date.now().toString(),
            appName,
            title,
            body,
            icon: icon || appIcon,
            timestamp: Date.now(),
            type: 'chat'
        };
        
        this.queueNotification(notification);
    }

    show(message, type = 'info', duration = 5000, options = {}) {
        const notification = {
            id: Date.now().toString(),
            message,
            type,
            duration,
            timestamp: Date.now(),
            ...options
        };
        
        this.queueNotification(notification);
        return notification.id;
    }

    queueNotification(notification) {
        this.notificationQueue.push(notification);
        
        if (!this.isProcessingQueue) {
            this.processNotificationQueue();
        }
    }

    async processNotificationQueue() {
        this.isProcessingQueue = true;
        
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            await this.displayNotification(notification);
            
            // Small delay between notifications
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        this.isProcessingQueue = false;
    }

    async displayNotification(notification) {
        // Remove oldest notification if at max capacity
        if (this.notifications.length >= this.maxNotifications) {
            const oldest = this.notifications.shift();
            this.removeNotificationElement(oldest.id);
        }
        
        this.notifications.push(notification);
        
        const element = this.createNotificationElement(notification);
        this.container.appendChild(element);
        
        // Animate in
        requestAnimationFrame(() => {
            element.classList.add('show');
        });
        
        // Auto-remove after duration
        if (notification.duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, notification.duration);
        }
        
        // Show desktop notification for chat messages
        if (notification.type === 'chat') {
            this.showDesktopNotification(notification);
        }
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.setAttribute('data-id', notification.id);
        
        if (notification.type === 'chat') {
            element.innerHTML = `
                <div class="notification-header">
                    <span class="notification-icon">${notification.icon}</span>
                    <span class="notification-app">${notification.appName.toUpperCase()}</span>
                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                    <button class="notification-close">×</button>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-body">${notification.body}</div>
                </div>
            `;
        } else {
            element.innerHTML = `
                <div class="notification-content">
                    <span class="notification-message">${notification.message}</span>
                    <button class="notification-close">×</button>
                </div>
            `;
        }
        
        // Add close button functionality
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.removeNotification(notification.id);
            });
        }
        
        // Add click handler for chat notifications
        if (notification.type === 'chat') {
            element.addEventListener('click', () => {
                this.handleNotificationClick(notification);
            });
        }
        
        return element;
    }

    handleNotificationClick(notification) {
        // Switch to the app tab
        const event = new CustomEvent('switch-to-tab', {
            detail: { tab: notification.appName }
        });
        document.dispatchEvent(event);
        
        // Remove the notification
        this.removeNotification(notification.id);
        
        // Clear count for this app
        if (this.chatAppNotifications[notification.appName]) {
            this.chatAppNotifications[notification.appName].count = 0;
            this.updateBadge();
        }
    }

    removeNotification(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.removeNotificationElement(id);
        }
    }

    removeNotificationElement(id) {
        const element = this.container.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.classList.add('hide');
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
    }

    updateBadge() {
        const totalCount = Object.values(this.chatAppNotifications)
            .reduce((sum, app) => sum + app.count, 0);
        
        const badgeCount = this.badgeElement.querySelector('.badge-count');
        if (badgeCount) {
            badgeCount.textContent = totalCount;
        }
        
        if (totalCount > 0) {
            this.badgeElement.classList.remove('hidden');
        } else {
            this.badgeElement.classList.add('hidden');
        }
        
        // Update document title
        if (totalCount > 0) {
            document.title = `(${totalCount}) SwapInterCam Chat`;
        } else {
            document.title = 'SwapInterCam Chat';
        }
    }

    updateBadgeForTab(activeTab) {
        // Clear notifications for the active tab
        if (this.chatAppNotifications[activeTab]) {
            this.chatAppNotifications[activeTab].count = 0;
            this.updateBadge();
        }
    }

    async showDesktopNotification(notification) {
        if (!('Notification' in window)) {
            console.warn('Desktop notifications not supported');
            return;
        }
        
        if (Notification.permission === 'granted') {
            const desktopNotification = new Notification(notification.title, {
                body: notification.body,
                icon: '/assets/icons/app-icon.png',
                tag: notification.appName,
                requireInteraction: false
            });
            
            desktopNotification.onclick = () => {
                window.focus();
                this.handleNotificationClick(notification);
                desktopNotification.close();
            };
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                desktopNotification.close();
            }, 5000);
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showDesktopNotification(notification);
            }
        }
    }

    playNotificationSound(appName) {
        try {
            const audio = new Audio();
            
            // Different sounds for different apps
            const sounds = {
                whatsapp: '/assets/sounds/whatsapp.mp3',
                messenger: '/assets/sounds/messenger.mp3',
                line: '/assets/sounds/line.mp3',
                default: '/assets/sounds/notification.mp3'
            };
            
            audio.src = sounds[appName] || sounds.default;
            audio.volume = 0.5;
            audio.play().catch(error => {
                console.warn('Failed to play notification sound:', error);
            });
        } catch (error) {
            console.warn('Notification sound error:', error);
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Convenience methods
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    // Settings management
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.saveSettings();
        return this.soundEnabled;
    }

    toggleDoNotDisturb() {
        this.doNotDisturb = !this.doNotDisturb;
        this.saveSettings();
        return this.doNotDisturb;
    }

    clearAllNotifications() {
        this.notifications.forEach(notification => {
            this.removeNotificationElement(notification.id);
        });
        this.notifications = [];
        
        // Clear chat app counts
        Object.keys(this.chatAppNotifications).forEach(app => {
            this.chatAppNotifications[app].count = 0;
        });
        
        this.updateBadge();
    }

    saveSettings() {
        const settings = {
            soundEnabled: this.soundEnabled,
            doNotDisturb: this.doNotDisturb
        };
        
        localStorage.setItem('swapintercam-notification-settings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('swapintercam-notification-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.soundEnabled = settings.soundEnabled !== false;
                this.doNotDisturb = settings.doNotDisturb || false;
            }
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        }
    }

    getStatus() {
        return {
            soundEnabled: this.soundEnabled,
            doNotDisturb: this.doNotDisturb,
            totalNotifications: this.notifications.length,
            chatAppCounts: { ...this.chatAppNotifications }
        };
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
} else if (typeof window !== 'undefined') {
    window.NotificationSystem = NotificationSystem;
    window.notificationSystem = new NotificationSystem();
}