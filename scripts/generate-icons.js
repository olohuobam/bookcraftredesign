#!/usr/bin/env node

/**
 * Icon Generator Script
 * Generates PWA, iOS, and Android icons in various sizes from SVG source
 *
 * Usage:
 *   node scripts/generate-icons.js
 *   npm run generate:icons
 */

const fs = require('fs');
const path = require('path');

// Icon sizes for different platforms
const ICON_SIZES = {
  pwa: [72, 96, 128, 144, 152, 192, 384, 512],
  ios: [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024],
  android: [36, 48, 72, 96, 144, 192, 512]
};

const ICONS_DIR = path.join(__dirname, '../public/icons');
const RESOURCES_DIR = path.join(__dirname, '../resources');
const SVG_SOURCE = path.join(ICONS_DIR, 'icon.svg');

console.log('🎨 Bookcraft Icon Generator\n');
console.log('📁 Icons directory:', ICONS_DIR);
console.log('📁 Resources directory:', RESOURCES_DIR);
console.log('📄 SVG source:', SVG_SOURCE);

// Ensure directories exist
[ICONS_DIR, RESOURCES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created ${dir}`);
  }
});

// Check if SVG exists
if (!fs.existsSync(SVG_SOURCE)) {
  console.error('❌ Error: icon.svg not found!');
  process.exit(1);
}

async function generateIcons() {
  let sharp;

  // Try to load sharp
  try {
    sharp = require('sharp');
  } catch (error) {
    console.log('\n⚠️  Sharp not installed. Showing manual instructions...\n');
    showManualInstructions();
    return;
  }

  console.log('\n🔧 Generating icons with Sharp...\n');

  // Combine all unique sizes
  const allSizes = [...new Set([
    ...ICON_SIZES.pwa,
    ...ICON_SIZES.ios,
    ...ICON_SIZES.android
  ])].sort((a, b) => a - b);

  let generated = 0;

  for (const size of allSizes) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);

    try {
      await sharp(SVG_SOURCE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${size}×${size}`);
      generated++;
    } catch (error) {
      console.error(`❌ Failed ${size}×${size}:`, error.message);
    }
  }

  // Generate special icons
  await generateSpecialIcons(sharp);

  console.log(`\n🎉 Generated ${generated} icons!`);
  console.log(`📁 Saved to: ${ICONS_DIR}\n`);

  console.log('📱 Next steps:');
  console.log('  1. Run: npx @capacitor/assets generate');
  console.log('  2. Or run: npx cap copy');
  console.log('  3. Build apps: npm run build:mobile\n');
}

async function generateSpecialIcons(sharp) {
  // Apple Touch Icon (180×180)
  try {
    await sharp(SVG_SOURCE)
      .resize(180, 180)
      .png()
      .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
    console.log('✅ Generated apple-touch-icon.png');
  } catch (error) {
    console.error('❌ Failed apple-touch-icon:', error.message);
  }

  // Favicon (32×32)
  try {
    await sharp(SVG_SOURCE)
      .resize(32, 32)
      .png()
      .toFile(path.join(ICONS_DIR, 'favicon-32x32.png'));
    console.log('✅ Generated favicon-32x32.png');
  } catch (error) {
    console.error('❌ Failed favicon:', error.message);
  }
}

function showManualInstructions() {
  console.log('Option 1 - Install Sharp (Recommended):');
  console.log('  npm install --save-dev sharp');
  console.log('  node scripts/generate-icons.js\n');

  console.log('Option 2 - Online Generator:');
  console.log('  1. Visit https://realfavicongenerator.net/');
  console.log('  2. Upload public/icons/icon.svg');
  console.log('  3. Download and place in public/icons/\n');

  console.log('Option 3 - Capacitor Assets CLI:');
  console.log('  npx @capacitor/assets generate\n');
}

// Run if called directly
if (require.main === module) {
  generateIcons().catch(console.error);
}
