#!/bin/bash

# Bundle the Signals Chrome Extension for distribution

echo "📦 Bundling Signals Chrome Extension..."

# Get version from manifest.json
VERSION=$(grep '"version"' extension/manifest.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo "📌 Version: $VERSION"

# Create a temp directory for the bundle
TEMP_DIR="signals-extension-bundle"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy all extension files
echo "📄 Copying extension files..."
cp extension/content.js "$TEMP_DIR/"
cp extension/content.css "$TEMP_DIR/"
cp extension/popup.html "$TEMP_DIR/"
cp extension/popup.js "$TEMP_DIR/"
cp extension/background.js "$TEMP_DIR/"
cp extension/onboarding.html "$TEMP_DIR/"
cp extension/onboarding.js "$TEMP_DIR/"
cp extension/wallet-connect.js "$TEMP_DIR/"
cp extension/auth-bridge.js "$TEMP_DIR/"
cp extension/manifest.json "$TEMP_DIR/"
cp extension/README.md "$TEMP_DIR/"

# Copy icons directory
echo "🎨 Copying icons..."
cp -r extension/icons "$TEMP_DIR/"

# Create zip file with version number
ZIP_NAME="signals-extension-v${VERSION}.zip"
rm -f "$ZIP_NAME"
echo "🗜️  Creating zip archive..."
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store" -x "__MACOSX/*"
cd ..

# Calculate file size
FILE_SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Extension bundled successfully!"
echo "📁 Output: $ZIP_NAME"
echo "💾 Size: $FILE_SIZE"
echo ""
echo "📋 Installation Instructions for Users:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option 1: Load Unpacked (Development/Testing)"
echo "  1. Download and extract $ZIP_NAME"
echo "  2. Open Chrome and go to chrome://extensions/"
echo "  3. Enable 'Developer mode' (top right toggle)"
echo "  4. Click 'Load unpacked'"
echo "  5. Select the extracted extension folder"
echo "  6. The Signals extension icon should appear in your toolbar"
echo ""
echo "Option 2: Chrome Web Store (Coming Soon)"
echo "  • Submit this package to Chrome Web Store for official distribution"
echo "  • Users can install with one click"
echo "  • Automatic updates"
echo ""
echo "🔗 Extension requires:"
echo "  • Web3 wallet (MetaMask, Rabby, Coinbase Wallet, etc.)"
echo "  • Account at https://signals.ethos.network"
echo ""
