#!/bin/bash

# Bundle the Signals Chrome Extension for Chrome Web Store submission
# This creates a production-ready version with:
# - Localhost URLs removed
# - Icons properly configured
# - Store-ready manifest

echo "🏪 Bundling Signals Extension for Chrome Web Store..."
echo ""

# Get version from manifest.json
VERSION=$(grep '"version"' extension/manifest.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo "📌 Version: $VERSION"

# Check for required PNG icons
echo ""
echo "🔍 Checking for required PNG icons..."
ICONS_MISSING=false

if [ ! -f "extension/icons/icon-16.png" ]; then
  echo "  ⚠️  Missing: icon-16.png"
  ICONS_MISSING=true
fi

if [ ! -f "extension/icons/icon-48.png" ]; then
  echo "  ⚠️  Missing: icon-48.png"
  ICONS_MISSING=true
fi

if [ ! -f "extension/icons/icon-128.png" ]; then
  echo "  ⚠️  Missing: icon-128.png"
  ICONS_MISSING=true
fi

if [ "$ICONS_MISSING" = true ]; then
  echo ""
  echo "❌ ERROR: Missing required PNG icons!"
  echo ""
  echo "Chrome Web Store requires PNG icons in these sizes:"
  echo "  - 16x16 pixels"
  echo "  - 48x48 pixels"
  echo "  - 128x128 pixels"
  echo ""
  echo "Please create these icons and place them in extension/icons/"
  echo "You can convert your SVG using:"
  echo "  - ImageMagick: convert icon.svg -resize 128x128 icon-128.png"
  echo "  - Online tool: https://cloudconvert.com/svg-to-png"
  echo ""
  exit 1
fi

echo "  ✅ All required PNG icons found"

# Create a temp directory for the bundle
TEMP_DIR="signals-extension-store-bundle"
STORE_MANIFEST="$TEMP_DIR/manifest.json"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
mkdir -p "$TEMP_DIR/icons"

# Copy all extension files
echo ""
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
cp extension/README.md "$TEMP_DIR/"

# Copy PNG icons
echo "🎨 Copying icons..."
cp extension/icons/icon-16.png "$TEMP_DIR/icons/"
cp extension/icons/icon-48.png "$TEMP_DIR/icons/"
cp extension/icons/icon-128.png "$TEMP_DIR/icons/"

# Copy SVG too (for compatibility)
if [ -f "extension/icons/icon.svg" ]; then
  cp extension/icons/icon.svg "$TEMP_DIR/icons/"
fi

# Create production manifest.json
echo "⚙️  Creating production manifest..."
cat > "$STORE_MANIFEST" << 'EOF'
{
  "manifest_version": 3,
  "name": "Signals - Trading Signal Tracker",
  "version": "VERSION_PLACEHOLDER",
  "description": "Track bullish and bearish trading signals on X.com with Ethos Network accountability",
  "homepage_url": "https://signals.ethos.network",
  
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  
  "permissions": [
    "activeTab",
    "storage",
    "alarms",
    "scripting"
  ],
  
  "host_permissions": [
    "https://x.com/*",
    "https://twitter.com/*",
    "https://signals.deno.dev/*"
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["https://x.com/*", "https://twitter.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://signals.deno.dev/extension-auth*"],
      "js": ["auth-bridge.js"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "Signals",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  
  "web_accessible_resources": [
    {
      "resources": ["popup.html", "content.css", "wallet-connect.js", "onboarding.html"],
      "matches": ["https://x.com/*", "https://twitter.com/*", "<all_urls>"]
    }
  ]
}
EOF

# Replace version placeholder
sed -i.bak "s/VERSION_PLACEHOLDER/$VERSION/g" "$STORE_MANIFEST"
rm "${STORE_MANIFEST}.bak"

# Create zip file with version number
ZIP_NAME="signals-extension-STORE-v${VERSION}.zip"
rm -f "$ZIP_NAME"

echo "🗜️  Creating zip archive for Chrome Web Store..."
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store" -x "__MACOSX/*" -x "*.bak"
cd ..

# Calculate file size
FILE_SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Chrome Web Store bundle created successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Output: $ZIP_NAME"
echo "💾 Size: $FILE_SIZE"
echo ""
echo "🎯 Production Changes Applied:"
echo "  ✅ Removed localhost URLs from manifest"
echo "  ✅ Added PNG icons configuration"
echo "  ✅ Added homepage_url"
echo "  ✅ Cleaned up host_permissions for production"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Upload to Chrome Web Store Developer Dashboard"
echo "   👉 https://chrome.google.com/webstore/devconsole/"
echo ""
echo "2. Required Assets (prepare these):"
echo "   • Screenshots (1280x800 or 640x400)"
echo "   • Small promotional tile (440x280)"
echo "   • Privacy policy URL: https://signals.ethos.network/privacy"
echo ""
echo "3. Store Listing Info:"
echo "   • Category: Productivity"
echo "   • Language: English"
echo "   • See CHROME_WEB_STORE_SUBMISSION.md for details"
echo ""
echo "4. Review typically takes 1-3 business days"
echo ""
echo "📚 Full submission guide: CHROME_WEB_STORE_SUBMISSION.md"
echo ""

