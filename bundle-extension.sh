#!/bin/bash

# Bundle the Signals Chrome Extension for distribution

echo "📦 Bundling Signals Chrome Extension..."

# Create a temp directory for the bundle
TEMP_DIR="signals-extension-bundle"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy extension files (excluding unnecessary files)
cp -r extension/content.js "$TEMP_DIR/"
cp -r extension/content.css "$TEMP_DIR/"
cp -r extension/popup.html "$TEMP_DIR/"
cp -r extension/popup.js "$TEMP_DIR/"
cp -r extension/manifest.json "$TEMP_DIR/"
cp -r extension/icons "$TEMP_DIR/"
cp extension/README.md "$TEMP_DIR/"

# Create zip file
ZIP_NAME="signals-extension-v1.0.0.zip"
rm -f "$ZIP_NAME"
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" .
cd ..

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Extension bundled successfully!"
echo "📁 Output: $ZIP_NAME"
echo ""
echo "📋 To distribute:"
echo "1. Share the $ZIP_NAME file with users"
echo "2. Users should extract it and load unpacked in Chrome"
echo "3. Or submit to Chrome Web Store for official distribution"
