/**
 * SwapInterCam Theme Manager Component
 * Handles theme switching and appearance settings
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.currentColorScheme = 'swapintercam';
        this.availableThemes = {
            'light': 'Light Theme',
            'dark': 'Dark Theme',
            'auto': 'Auto (System)'
        };
        this.colorSchemes = {
            'swapintercam': 'SwapInterCam',
            'blue': 'Blue',
            'green': 'Green',
            'purple': 'Purple'
        };
        
        this.init();
    }

    /**
     * Initialize theme manager
     */
    init() {
        this.loadPreferences();
        this.applyTheme();
        this.setupEventListeners();
        console.log('Theme Manager initialized');
    }

    /**
     * Load theme preferences
     */
    loadPreferences() {
        try {
            const savedTheme = localStorage.getItem('swapintercam-theme');
            const savedColorScheme = localStorage.getItem('swapintercam-color-scheme');
            
            if (savedTheme && this.availableThemes[savedTheme]) {
                this.currentTheme = savedTheme;
            }
            
            if (savedColorScheme && this.colorSchemes[savedColorScheme]) {
                this.currentColorScheme = savedColorScheme;
            }
            
            console.log('Theme preferences loaded');
        } catch (error) {
            console.error('Failed to load theme preferences:', error);
        }
    }

    /**
     * Save theme preferences
     */
    savePreferences() {
        try {
            localStorage.setItem('swapintercam-theme', this.currentTheme);
            localStorage.setItem('swapintercam-color-scheme', this.currentColorScheme);
            console.log('Theme preferences saved');
        } catch (error) {
            console.error('Failed to save theme preferences:', error);
        }
    }

    /**
     * Apply current theme
     */
    applyTheme() {
        const html = document.documentElement;
        
        // Remove existing theme classes
        Object.keys(this.availableThemes).forEach(theme => {
            html.classList.remove(`theme-${theme}`);
        });
        
        Object.keys(this.colorSchemes).forEach(scheme => {
            html.classList.remove(`color-${scheme}`);
        });
        
        // Apply current theme
        let effectiveTheme = this.currentTheme;
        if (this.currentTheme === 'auto') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        html.classList.add(`theme-${effectiveTheme}`);
        html.classList.add(`color-${this.currentColorScheme}`);
        
        // Set data attribute for CSS
        html.setAttribute('data-theme', effectiveTheme);
        html.setAttribute('data-color-scheme', this.currentColorScheme);
        
        console.log(`Theme applied: ${effectiveTheme} with ${this.currentColorScheme} color scheme`);
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        if (!this.availableThemes[theme]) {
            console.error(`Invalid theme: ${theme}`);
            return;
        }
        
        this.currentTheme = theme;
        this.applyTheme();
        this.savePreferences();
        
        // Dispatch theme change event
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme, colorScheme: this.currentColorScheme }
        }));
    }

    /**
     * Set color scheme
     */
    setColorScheme(scheme) {
        if (!this.colorSchemes[scheme]) {
            console.error(`Invalid color scheme: ${scheme}`);
            return;
        }
        
        this.currentColorScheme = scheme;
        this.applyTheme();
        this.savePreferences();
        
        // Dispatch color scheme change event
        document.dispatchEvent(new CustomEvent('colorSchemeChanged', {
            detail: { theme: this.currentTheme, colorScheme: this.currentColorScheme }
        }));
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for system theme changes
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', () => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme();
                }
            });
        }
        
        // Keyboard shortcut for theme toggle
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    /**
     * Get current theme info
     */
    getThemeInfo() {
        return {
            currentTheme: this.currentTheme,
            currentColorScheme: this.currentColorScheme,
            availableThemes: this.availableThemes,
            colorSchemes: this.colorSchemes
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('Theme Manager cleaned up');
    }
}

// Export for use in main scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} else {
    window.ThemeManager = ThemeManager;
}