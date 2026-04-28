#!/usr/bin/env node

/**
 * SwapInterCam Branding Update Utility
 * Updates all branding references to use the real SwapInterCam logo
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 SwapInterCam Branding Update Utility');
console.log('======================================');

const logoPath = path.join(__dirname, 'logos', 'swapintercam-logo.png');
const hasRealLogo = fs.existsSync(logoPath);

console.log(`📊 Real logo available: ${hasRealLogo ? '✅ Yes' : '❌ No'}`);

if (hasRealLogo) {
    const stats = fs.statSync(logoPath);
    console.log(`📏 Logo size: ${Math.round(stats.size / 1024)} KB`);
    console.log(`📅 Last modified: ${stats.mtime.toLocaleString()}`);
}

// Update admin dashboard CSS to include logo styling
function updateAdminDashboardCSS() {
    const cssPath = path.join(__dirname, '..', 'renderer', 'styles', 'admin-dashboard.css');
    
    if (!fs.existsSync(cssPath)) {
        console.log('⚠️  Admin dashboard CSS not found');
        return;
    }
    
    let content = fs.readFileSync(cssPath, 'utf8');
    
    // Add logo-specific styles if not already present
    if (!content.includes('.logo-image')) {
        const logoStyles = `

/* Real Logo Styles */
.logo-image {
    height: 48px;
    width: auto;
    max-width: 120px;
    object-fit: contain;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.1);
    padding: 4px;
}

.logo-image:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.02);
    transition: all 0.2s ease;
}

.header-logo {
    height: 40px;
    width: auto;
    max-width: 100px;
    object-fit: contain;
}

.watermark-logo {
    background-image: url('../assets/logos/swapintercam-logo.png');
    background-repeat: no-repeat;
    background-position: center;
    background-size: 200px;
    opacity: 0.03;
}`;
        
        content += logoStyles;
        fs.writeFileSync(cssPath, content);
        console.log('✅ Updated admin dashboard CSS with logo styles');
    } else {
        console.log('ℹ️  Admin dashboard CSS already has logo styles');
    }
}

// Update brand colors CSS
function updateBrandColorsCSS() {
    const cssPath = path.join(__dirname, 'branding', 'brand-colors.css');
    
    if (!fs.existsSync(cssPath)) {
        console.log('⚠️  Brand colors CSS not found');
        return;
    }
    
    let content = fs.readFileSync(cssPath, 'utf8');
    
    // Update watermark reference if not already updated
    if (!content.includes('swapintercam-watermark')) {
        const logoUtilities = `

/* SwapInterCam Real Logo Utilities */
.swapintercam-logo {
    background-image: url('../logos/swapintercam-logo.png');
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
}

.swapintercam-watermark {
    background-image: url('../logos/swapintercam-logo.png');
    background-repeat: no-repeat;
    background-position: center;
    background-size: 200px;
    opacity: 0.03;
}

.swapintercam-header-logo {
    background-image: url('../logos/swapintercam-logo.png');
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 120px;
    height: 48px;
}`;
        
        content += logoUtilities;
        fs.writeFileSync(cssPath, content);
        console.log('✅ Updated brand colors CSS with real logo utilities');
    } else {
        console.log('ℹ️  Brand colors CSS already has logo utilities');
    }
}

// Update package.json with logo reference
function updatePackageJson() {
    const packagePath = path.join(__dirname, '..', 'package.json');
    
    if (!fs.existsSync(packagePath)) {
        console.log('⚠️  Package.json not found');
        return;
    }
    
    try {
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        // Update build configuration to include logo
        if (packageData.build) {
            if (packageData.build.win && !packageData.build.win.icon.includes('swapintercam')) {
                packageData.build.win.icon = "assets/logos/swapintercam-logo.png";
            }
            if (packageData.build.mac && !packageData.build.mac.icon.includes('swapintercam')) {
                packageData.build.mac.icon = "assets/logos/swapintercam-logo.png";
            }
            if (packageData.build.linux && !packageData.build.linux.icon.includes('swapintercam')) {
                packageData.build.linux.icon = "assets/logos/swapintercam-logo.png";
            }
            
            fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
            console.log('✅ Updated package.json build configuration');
        }
    } catch (error) {
        console.log('⚠️  Failed to update package.json:', error.message);
    }
}

// Create logo variants for different uses
function createLogoVariants() {
    if (!hasRealLogo) {
        console.log('⚠️  Cannot create variants without real logo');
        return;
    }
    
    const variantsDir = path.join(__dirname, 'logos', 'variants');
    if (!fs.existsSync(variantsDir)) {
        fs.mkdirSync(variantsDir, { recursive: true });
        console.log('📁 Created logo variants directory');
    }
    
    // Copy original logo to variants with different names
    const variants = [
        'swapintercam-logo-header.png',
        'swapintercam-logo-watermark.png',
        'swapintercam-logo-icon.png'
    ];
    
    variants.forEach(variant => {
        const variantPath = path.join(variantsDir, variant);
        if (!fs.existsSync(variantPath)) {
            fs.copyFileSync(logoPath, variantPath);
            console.log(`✅ Created logo variant: ${variant}`);
        }
    });
}

// Generate logo info file
function generateLogoInfo() {
    if (!hasRealLogo) return;
    
    const stats = fs.statSync(logoPath);
    const logoInfo = {
        name: 'SwapInterCam Logo',
        path: 'assets/logos/swapintercam-logo.png',
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024),
        lastModified: stats.mtime.toISOString(),
        imported: new Date().toISOString(),
        variants: [
            'assets/logos/variants/swapintercam-logo-header.png',
            'assets/logos/variants/swapintercam-logo-watermark.png',
            'assets/logos/variants/swapintercam-logo-icon.png'
        ],
        usage: {
            adminDashboard: 'renderer/admin-dashboard.html',
            css: 'assets/branding/brand-colors.css',
            watermark: 'CSS background-image',
            icon: 'Application icon (via asset manager)'
        }
    };
    
    const infoPath = path.join(__dirname, 'logos', 'logo-info.json');
    fs.writeFileSync(infoPath, JSON.stringify(logoInfo, null, 2));
    console.log('✅ Generated logo information file');
}

// Run all updates
console.log('\n🔄 Starting branding updates...\n');

updateAdminDashboardCSS();
updateBrandColorsCSS();
updatePackageJson();
createLogoVariants();
generateLogoInfo();

console.log('\n🎨 Branding update completed successfully!');
console.log('\n📋 Summary:');
console.log(`   • Real logo: ${hasRealLogo ? 'Available' : 'Not available'}`);
console.log('   • Admin dashboard: Updated');
console.log('   • Brand colors CSS: Updated');
console.log('   • Package.json: Updated');
console.log('   • Logo variants: Created');
console.log('   • Logo info: Generated');

if (hasRealLogo) {
    console.log('\n✨ Your SwapInterCam branding is now fully integrated!');
} else {
    console.log('\n⚠️  To complete branding integration, place your logo at:');
    console.log('   C:\\Users\\caeser\\OneDrive\\Documents\\SwapInterCam Logo.png');
    console.log('   Then run: node assets/import-logo.js');
}