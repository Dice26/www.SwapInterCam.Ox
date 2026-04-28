#!/usr/bin/env node

/**
 * SwapInterCam Logo Import Utility
 * Imports and processes the official SwapInterCam logo
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 SwapInterCam Logo Import Utility');
console.log('===================================');

const logoSourcePath = 'C:\\Users\\caeser\\OneDrive\\Documents\\SwapInterCam Logo.png';
const logoDestPath = path.join(__dirname, 'logos', 'swapintercam-logo.png');
const logoOriginalPath = path.join(__dirname, 'logos', 'swapintercam-logo-original.png');

// Ensure logos directory exists
const logosDir = path.dirname(logoDestPath);
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
    console.log('📁 Created logos directory');
}

try {
    // Check if source logo exists
    if (fs.existsSync(logoSourcePath)) {
        // Copy original logo
        fs.copyFileSync(logoSourcePath, logoOriginalPath);
        console.log('✅ Original logo backed up to: swapintercam-logo-original.png');
        
        // Copy working logo
        fs.copyFileSync(logoSourcePath, logoDestPath);
        console.log('✅ Logo imported to: swapintercam-logo.png');
        
        // Get logo info
        const stats = fs.statSync(logoDestPath);
        console.log(`📊 Logo size: ${Math.round(stats.size / 1024)} KB`);
        console.log(`📅 Last modified: ${stats.mtime.toLocaleString()}`);
        
    } else if (fs.existsSync(logoDestPath)) {
        console.log('ℹ️  Logo already exists in assets directory');
        
        const stats = fs.statSync(logoDestPath);
        console.log(`📊 Current logo size: ${Math.round(stats.size / 1024)} KB`);
        
    } else {
        console.log('⚠️  Logo not found at source path');
        console.log('Creating placeholder logo...');
        
        // Create a placeholder notice
        const placeholderNotice = `SwapInterCam Logo
=================

The official SwapInterCam logo should be placed here.
Expected path: ${logoDestPath}
Source path: ${logoSourcePath}

To import the logo, run: node assets/import-logo.js`;
        
        fs.writeFileSync(path.join(logosDir, 'logo-placeholder.txt'), placeholderNotice);
        console.log('📝 Created placeholder notice');
    }
    
    // Update asset references
    updateAssetReferences();
    
} catch (error) {
    console.error('❌ Error importing logo:', error.message);
}

function updateAssetReferences() {
    console.log('🔄 Updating asset references...');
    
    // Update admin dashboard HTML to use real logo
    const adminDashboardPath = path.join(__dirname, '..', 'renderer', 'admin-dashboard.html');
    if (fs.existsSync(adminDashboardPath)) {
        let content = fs.readFileSync(adminDashboardPath, 'utf8');
        
        // Update logo placeholder with real logo reference
        content = content.replace(
            '<div class="logo-placeholder">🎛️</div>',
            '<img src="../assets/logos/swapintercam-logo.png" alt="SwapInterCam Logo" class="logo-image" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';"><div class="logo-placeholder" style="display:none;">🎛️</div>'
        );
        
        // Add CSS for logo image
        content = content.replace(
            '.logo-placeholder {',
            `.logo-image {
    height: 48px;
    width: auto;
    max-width: 120px;
    object-fit: contain;
}

.logo-placeholder {`
        );
        
        fs.writeFileSync(adminDashboardPath, content);
        console.log('✅ Updated admin dashboard to use real logo');
    }
    
    // Update CSS files to reference real logo
    const brandColorsPath = path.join(__dirname, 'branding', 'brand-colors.css');
    if (fs.existsSync(brandColorsPath)) {
        let content = fs.readFileSync(brandColorsPath, 'utf8');
        
        // Add logo background utilities
        const logoUtilities = `

/* SwapInterCam Logo Utilities */
.swapintercam-logo-bg {
  background-image: url('../logos/swapintercam-logo.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.swapintercam-watermark {
  background-image: url('../logos/swapintercam-logo.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: 240px;
  opacity: 0.04;
}`;
        
        content += logoUtilities;
        fs.writeFileSync(brandColorsPath, content);
        console.log('✅ Updated brand colors CSS with logo utilities');
    }
    
    console.log('🎨 Logo import completed successfully!');
}

// Run the import
console.log('Starting logo import process...');