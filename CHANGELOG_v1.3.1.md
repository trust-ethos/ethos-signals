# Release Notes: v1.3.1 - Production Release

**Release Date**: October 8, 2025  
**Type**: Production Cleanup  
**Status**: Ready for Chrome Web Store

---

## 🎯 Summary

This is a production-focused release that removes all development/localhost features from the Chrome extension, making it ready for public distribution and Chrome Web Store submission.

---

## 🔧 Changes

### Removed Development Features
- ❌ **Removed "Local Dev Mode" toggle** from extension popup
- ❌ **Removed localhost permissions** from manifest.json
- ❌ **Removed localhost URL handling** from all extension code
- ❌ **Removed environment indicator badges** (LOCAL/PROD)
- ❌ **Hardcoded production URL** throughout extension

### Updated Files
- `extension/manifest.json` - Version bumped to 1.3.1, localhost removed
- `extension/popup.html` - Local Dev Mode UI removed
- `extension/popup.js` - Simplified, production-only code
- `extension/content.js` - Hardcoded production API URL

---

## 📦 What's in This Release

**File**: `signals-extension-v1.3.1.zip`  
**Size**: 28 KB  
**Manifest Version**: 3  
**Chrome Extension Version**: 1.3.1

---

## ✅ Production Ready

This version is:
- ✅ **Chrome Web Store ready** - No development features
- ✅ **Simplified** - Single production endpoint
- ✅ **Secure** - No localhost permissions
- ✅ **Clean** - Removed all dev mode UI/code
- ✅ **Tested** - Maintains all authentication and signal tracking features

---

## 🔄 Upgrade from v1.3.0

### What Changed
- Local Dev Mode toggle removed
- Extension now only connects to `https://signals.deno.dev`
- No more environment switching

### What Stayed the Same
- ✅ Wallet authentication
- ✅ Signal saving
- ✅ All core features
- ✅ Security and rate limiting
- ✅ "Saved by" attribution

### Migration Notes
Users on v1.3.0 with local dev mode enabled:
1. Uninstall v1.3.0
2. Install v1.3.1
3. Extension will automatically use production URL
4. No data loss - signals remain on server

---

## 🚀 Installation

### For Users

1. **Download**: `signals-extension-v1.3.1.zip`
2. **Extract** the ZIP file
3. **Open Chrome**: Navigate to `chrome://extensions/`
4. **Enable Developer Mode**: Toggle in top right
5. **Load Unpacked**: Click and select extracted folder
6. **Connect Wallet**: Click extension icon and authenticate

### For Chrome Web Store Submission

This version is ready for submission:
- ✅ No development features
- ✅ Production URLs only
- ✅ Clean permissions
- ✅ Proper versioning
- ✅ All documentation ready

---

## 📊 Version Comparison

| Feature | v1.3.0 | v1.3.1 |
|---------|--------|--------|
| Wallet Auth | ✅ | ✅ |
| Signal Tracking | ✅ | ✅ |
| "Saved By" Attribution | ✅ | ✅ |
| Rate Limiting | ✅ | ✅ |
| **Local Dev Mode** | ✅ | ❌ Removed |
| **Localhost Permissions** | ✅ | ❌ Removed |
| **Environment Toggle** | ✅ | ❌ Removed |
| Production Ready | ⚠️ | ✅ |

---

## 🛡️ Security

### Permissions (Unchanged)
- `activeTab` - Inject UI on Twitter/X
- `storage` - Store auth tokens
- `alarms` - Token cleanup
- `scripting` - Content script injection

### Host Permissions (Updated)
**Before (v1.3.0)**:
- `https://x.com/*`
- `https://twitter.com/*`
- `https://signals.deno.dev/*`
- ~~`http://localhost:8000/*`~~ ❌ REMOVED

**After (v1.3.1)**:
- `https://x.com/*`
- `https://twitter.com/*`
- `https://signals.deno.dev/*`

---

## 🐛 Bug Fixes

- Fixed: Users can no longer accidentally switch to localhost mode
- Fixed: Cleaner, simpler UI without dev mode confusion
- Fixed: Reduced permission surface area

---

## 📚 Documentation

All documentation remains current:
- [Installation Guide](docs/guides/INSTALL_EXTENSION.md)
- [Chrome Web Store Submission](docs/guides/CHROME_WEB_STORE_SUBMISSION.md)
- [Security Analysis](docs/security/SECURITY_ANALYSIS.md)
- [Privacy Policy](docs/security/PRIVACY_POLICY.md)

---

## 🎯 Next Steps

### For Users
- Download and install v1.3.1
- Connect wallet
- Start tracking signals

### For Developers
- v1.3.1 is production release
- For local development, use v1.3.0 or modify code locally
- Do not distribute development builds

### For Chrome Web Store
- v1.3.1 ready for submission
- Create PNG icons (16x16, 48x48, 128x128)
- Take screenshots
- Submit to Chrome Web Store

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/trust-ethos/ethos-signals/issues)
- **Website**: [signals.ethos.network](https://signals.ethos.network)
- **Email**: support@ethos.network

---

## 📝 Full Changelog

**v1.3.1** (October 8, 2025)
- Remove Local Dev Mode toggle from popup
- Remove localhost permissions from manifest
- Hardcode production API URL
- Simplify extension code for production
- Clean up dev mode UI elements

**v1.3.0** (October 6, 2025)
- Wallet authentication system
- "Saved by" attribution
- Rate limiting
- Security improvements

**v1.0.0** (October 1, 2025)
- Initial release
- Basic signal tracking

---

**Download**: `signals-extension-v1.3.1.zip` (28 KB)  
**Ready for**: Public distribution & Chrome Web Store submission

