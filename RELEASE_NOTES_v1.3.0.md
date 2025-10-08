# Signals Chrome Extension v1.3.0

## 🎉 Major Update: Wallet Authentication & Security

This release introduces a complete wallet-based authentication system with enhanced security and accountability features.

---

## 🔐 New Features

### Wallet Authentication
- **Cryptographic signature authentication** using Web3 wallets
- Support for multiple wallets: MetaMask, Rabby, Coinbase Wallet, Rainbow, Brave, Frame
- **No passwords required** - your wallet is your identity
- Secure 256-bit authentication tokens with 90-day expiration

### Signal Attribution
- **"Saved by" indicators** show who saved each signal
- Displays Ethos username and profile picture
- Complete audit trail of all signal creators
- On-chain metadata includes saver identity

### Security Improvements
- **Rate limiting**: 50 signals per hour per wallet
- **Token management**: Revoke access anytime
- **Authentication required** for all signal creation
- Prevents spam and abuse

### Enhanced UI
- Web-based wallet connection page with dark mode design
- Improved extension popup showing auth status
- Better error handling for auth/rate limit errors
- Profile pictures in signal displays

---

## 🎨 UI/UX Improvements

- Dark mode Apple liquid design for onboarding
- Case-insensitive Ethos user lookup
- "Saved by" badges on signal cards
- Real-time authentication status in popup
- Smooth wallet connection flow

---

## 🔧 Technical Improvements

### Database
- New `extension_auth_tokens` table for wallet verification
- New `rate_limit_tracking` table for abuse prevention
- Added `auth_token` column to signals table
- Includes saved-by fields in all queries

### Backend
- Authentication middleware with rate limiting
- Token validation and expiration handling
- API endpoints: `/api/auth/connect`, `/api/auth/verify`, `/api/auth/revoke`
- Secure signature verification using ethers.js

### Extension Architecture
- Background service worker for messaging
- Enhanced content script with auth token management
- Web-accessible onboarding resources
- Multi-wallet detection and support

---

## 📊 What's Included

- `signals-extension-v1.3.0.zip` - Ready to install
- Size: 29KB
- Manifest v3 compliant
- Works on Chrome, Brave, Edge

---

## 📥 Installation

### For Users

1. **Download** the `signals-extension-v1.3.0.zip` file below
2. **Extract** the ZIP file to a folder
3. **Open Chrome** and navigate to `chrome://extensions/`
4. **Enable** "Developer mode" (toggle in top right)
5. **Click** "Load unpacked"
6. **Select** the extracted folder
7. **Done!** The Signals extension icon appears in your toolbar

### First-Time Setup

1. Click the Signals extension icon
2. Click "Connect Wallet"
3. Sign the authentication message with your wallet
4. Start saving signals on Twitter/X!

---

## 🔒 Security & Privacy

- **No private keys collected** - signatures only verify wallet ownership
- **Local storage only** for auth tokens
- **90-day token expiration** for security
- **Can revoke** access anytime
- **Rate limited** to prevent abuse
- See full [Privacy Policy](https://github.com/trust-ethos/ethos-signals/blob/main/PRIVACY_POLICY.md)

---

## 📋 Requirements

- Chrome, Brave, or Edge browser (Manifest v3 support)
- A Web3 wallet extension (MetaMask, Rabby, etc.)
- Ethos Network account (sign up at [ethos.network](https://ethos.network))

---

## 🐛 Known Issues

- Extension currently only works on x.com/twitter.com
- Desktop only (mobile not yet supported)
- Rate limited to 50 signals per hour

---

## 🔄 Upgrading from v1.0.0

If you have v1.0.0 installed:

1. Remove the old version from `chrome://extensions/`
2. Install v1.3.0 following the instructions above
3. Connect your wallet for authentication
4. Your old signals remain accessible at [signals.ethos.network](https://signals.ethos.network)

---

## 📚 Documentation

- [Installation Guide](https://github.com/trust-ethos/ethos-signals/blob/main/INSTALL_EXTENSION.md)
- [Authentication System](https://github.com/trust-ethos/ethos-signals/blob/main/EXTENSION_AUTH.md)
- [Security Analysis](https://github.com/trust-ethos/ethos-signals/blob/main/SECURITY_ANALYSIS.md)
- [Privacy Policy](https://github.com/trust-ethos/ethos-signals/blob/main/PRIVACY_POLICY.md)

---

## 🚀 Coming Soon

- Chrome Web Store listing (automatic updates)
- Performance analytics in popup
- Batch signal saving
- Keyboard shortcuts
- Export signals data

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/trust-ethos/ethos-signals/issues)
- **Website**: [signals.ethos.network](https://signals.ethos.network)
- **Twitter**: [@ethosnetwork](https://twitter.com/ethosnetwork)

---

## 🙏 Acknowledgments

Built with:
- Ethos Network reputation infrastructure
- Base blockchain for on-chain attestations
- Fresh framework for the web application
- ethers.js for wallet interactions

---

## 📊 Version History

### v1.3.0 (October 6, 2025) - Current
- ✅ Wallet authentication system
- ✅ Signal attribution and "Saved by" indicators
- ✅ Rate limiting and security improvements
- ✅ Enhanced UI/UX

### v1.0.0 (October 1, 2025)
- Initial release
- Basic signal saving from Twitter
- Manual authentication

---

**Full Changelog**: [v1.0.0...v1.3.0](https://github.com/trust-ethos/ethos-signals/compare/v1.0.0...v1.3.0)

---

## ⚡ Quick Start

```bash
# After downloading and extracting:
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension folder
5. Connect your wallet and start tracking signals!
```

---

**Download the extension below ⬇️**

