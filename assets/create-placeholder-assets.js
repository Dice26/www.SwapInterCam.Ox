#!/usr/bin/env node

/**
 * SwapInterCam Asset Creator
 * Creates placeholder assets for branding system
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Creating SwapInterCam Placeholder Assets');
console.log('==========================================');

// Create directories
const assetsDir = path.join(__dirname);
const iconsDir = path.join(assetsDir, 'icons');
const logosDir = path.join(assetsDir, 'logos');
const brandingDir = path.join(assetsDir, 'branding');

[iconsDir, logosDir, brandingDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${path.relative(assetsDir, dir)}`);
    }
});

// Create a simple HTML file that can serve as a placeholder icon
const placeholderIconHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; padding: 0; width: 64px; height: 64px; }
        .icon { 
            width: 64px; 
            height: 64px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 24px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="icon">SI</div>
</body>
</html>`;

fs.writeFileSync(path.join(iconsDir, 'icon-placeholder.html'), placeholderIconHTML);
console.log('✅ Created icon placeholder: icons/icon-placeholder.html');

// Create logo SVG
const logoSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Logo background -->
  <rect x="0" y="0" width="200" height="60" rx="8" fill="url(#logoGradient)"/>
  
  <!-- Logo text -->
  <text x="100" y="38" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#ffffff">SwapInterCam</text>
</svg>`;

fs.writeFileSync(path.join(logosDir, 'swapintercam-logo.svg'), logoSVG);
console.log('✅ Created logo SVG: logos/swapintercam-logo.svg');

// Create brand colors CSS
const brandColorsCSS = `:root {
  /* Primary Brand Colors */
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  
  /* Background Colors */
  --background-dark: #1a1a1a;
  --background-medium: #2d2d2d;
  --background-light: #f9f9f9;
  
  /* Text Colors */
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --text-muted: #999999;
  --text-dark: #333333;
  
  /* Accent Colors */
  --accent-color: #667eea;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --error-color: #e74c3c;
  
  /* Border and Shadow */
  --border-color: #444444;
  --border-light: #e0e0e0;
  --shadow-color: rgba(0, 0, 0, 0.2);
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

/* SwapInterCam Brand Classes */
.swapintercam-gradient {
  background: var(--primary-gradient);
}

.swapintercam-primary {
  color: var(--primary-color);
}

.swapintercam-secondary {
  color: var(--secondary-color);
}`;

fs.writeFileSync(path.join(brandingDir, 'brand-colors.css'), brandColorsCSS);
console.log('✅ Created brand colors: branding/brand-colors.css');

console.log('🎨 Asset creation completed!');
console.log('📝 Note: These are placeholder assets. For production, use proper image formats.');