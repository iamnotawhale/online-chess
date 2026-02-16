#!/usr/bin/env node

/**
 * Generate PWA icons from logo.svg using Sharp
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

try {
  // Try to require sharp from frontend/node_modules first, then fall back
  let sharp;
  try {
    sharp = require('../frontend/node_modules/sharp');
  } catch (e) {
    sharp = require('sharp');
  }

  const publicDir = path.join(__dirname, '../public');
  const iconsDir = path.join(publicDir, 'icons');

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log(`✓ Created ${iconsDir}`);
  }

  const svgPath = path.join(publicDir, 'logo.svg');

  if (!fs.existsSync(svgPath)) {
    console.error(`✗ logo.svg not found at ${svgPath}`);
    process.exit(1);
  }

  // Icon configurations: [size, filename]
  const icons = [
    [16, 'favicon-16x16.png'],
    [32, 'favicon-32x32.png'],
    [192, 'favicon-192x192.png'],
    [192, 'favicon-192x192-maskable.png'], // Same size, different purpose
    [512, 'favicon-512x512.png'],
    [512, 'favicon-512x512-maskable.png'], // Same size, different purpose
    [180, 'apple-touch-icon-180x180.png'],
    [96, 'shortcut-play-96x96.png'],
    [96, 'shortcut-puzzle-96x96.png'],
  ];

  let generated = 0;
  let skipped = 0;

  icons.forEach(([size, filename]) => {
    const outputPath = path.join(iconsDir, filename);

    sharp(svgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toFile(outputPath, (err, info) => {
        if (err) {
          console.error(`✗ Failed to generate ${filename}:`, err.message);
        } else {
          console.log(
            `✓ Generated ${filename} (${size}x${size}, ${(info.size / 1024).toFixed(1)}KB)`
          );
          generated++;
        }
      });
  });

  // Show summary
  setTimeout(() => {
    console.log(`\n✓ Icon generation complete!`);
    console.log(`  Generated: ${generated} icons`);
    console.log(`  Location: ${iconsDir}`);
    console.log(`\nNext steps:`);
    console.log(`  1. npm run build`);
    console.log(`  2. npm run preview (or serve with HTTPS)`);
    console.log(`  3. Test PWA in browser DevTools`);
  }, 3000);
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error(
      '\n✗ Sharp is not installed. Please install it first:\n' +
      '  npm install --save-dev sharp\n'
    );
  } else {
    console.error('✗ Error:', error.message);
  }
  process.exit(1);
}
