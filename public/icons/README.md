# Bookcraft PWA Icons

## Current Status
This directory contains the SVG source icon for the Bookcraft PWA.

## Generating PNG Icons

### Method 1: Online Generator (Easiest)
1. Visit [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload `icon.svg`
3. Configure settings for PWA
4. Download and extract all icons to this directory

### Method 2: PWA Builder
1. Visit [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload `icon.svg`
3. Download generated icons
4. Extract to this directory

### Method 3: Sharp CLI (Advanced)
```bash
npm install -g sharp-cli

# Generate all required sizes
sharp -i icon.svg -o icon-72x72.png resize 72 72
sharp -i icon.svg -o icon-96x96.png resize 96 96
sharp -i icon.svg -o icon-128x128.png resize 128 128
sharp -i icon.svg -o icon-144x144.png resize 144 144
sharp -i icon.svg -o icon-152x152.png resize 152 152
sharp -i icon.svg -o icon-192x192.png resize 192 192
sharp -i icon.svg -o icon-384x384.png resize 384 384
sharp -i icon.svg -o icon-512x512.png resize 512 512
```

## Required Icon Sizes
- 72x72px
- 96x96px
- 128x128px
- 144x144px
- 152x152px
- 192x192px
- 384x384px
- 512x512px

## iOS Specific Icons
For optimal iOS support, also create:
- apple-touch-icon.png (180x180px)
- apple-touch-icon-precomposed.png (180x180px)

## Android Maskable Icons
The current manifest uses "maskable" icons which have safe zones.
Ensure important content is within the safe zone (80% of the icon).
