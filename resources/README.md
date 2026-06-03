# Capacitor App Resources

This directory contains app icons and splash screens for iOS and Android.

## Quick Start

### Option 1: Auto-generate from SVG (Recommended)

```bash
# Install @capacitor/assets
npm install -D @capacitor/assets

# Convert SVG to PNG first
# Use an online tool like https://svgtopng.com/ or
# Use ImageMagick: convert public/icons/icon.svg -resize 1024x1024 resources/icon.png

# Generate all app icons and splash screens
npx @capacitor/assets generate \
  --iconBackgroundColor '#2563eb' \
  --iconBackgroundColorDark '#1e40af' \
  --splashBackgroundColor '#2563eb' \
  --splashBackgroundColorDark '#1e40af'
```

### Option 2: Manual Icon Setup

1. Create `icon.png` (1024x1024px) in this directory
2. Create `splash.png` (2732x2732px) in this directory
3. Run: `npx @capacitor/assets generate`

### Option 3: Use Online Tool

1. Visit https://www.appicon.co/
2. Upload `public/icons/icon.svg` or a 1024x1024 PNG
3. Download iOS and Android packages
4. Extract to respective directories:
   - iOS: `ios/App/App/Assets.xcassets/`
   - Android: `android/app/src/main/res/`

## File Requirements

### App Icon (`icon.png`)
- Size: 1024x1024px
- Format: PNG with transparency
- Safe zone: Keep important content in center 80%
- Background: Solid color (for Android adaptive icons)

### Splash Screen (`splash.png`)
- Size: 2732x2732px (iPad Pro 12.9" size)
- Format: PNG
- Logo: Centered, max 1200x1200px
- Background: Should match theme color

## After Generating

Run `npx cap sync` to copy assets to native projects:

```bash
npx cap sync
```

## Testing

- **iOS**: Open in Xcode with `npx cap open ios`
- **Android**: Open in Android Studio with `npx cap open android`

## Current Status

⚠️ Icons are not yet generated. Please follow one of the options above to create app icons.

For now, default Capacitor icons will be used.
