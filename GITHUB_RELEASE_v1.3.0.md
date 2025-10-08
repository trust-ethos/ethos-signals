# 🎉 Signals Chrome Extension v1.3.0

## Major Update: Wallet Authentication & Security

This release introduces a complete wallet-based authentication system, making signal tracking more secure and accountable than ever.

---

## ⚡ What's New

### 🔐 Wallet Authentication
- **Sign in with your crypto wallet** - no passwords needed
- **Multi-wallet support**: MetaMask, Rabby, Coinbase Wallet, Rainbow, Brave, Frame
- **Secure 256-bit tokens** with 90-day expiration
- **Cryptographic verification** of wallet ownership

### 👤 Signal Attribution
- See **who saved each signal** with profile pictures
- Track your reputation with blockchain-verified accountability
- "Saved by" indicators on all signal cards
- Complete audit trail

### 🛡️ Security & Rate Limiting
- **50 signals per hour** limit to prevent spam
- Token-based authentication required for all actions
- Revoke access anytime from the extension popup
- No private keys ever collected

### 🎨 UI Improvements
- Beautiful dark mode onboarding experience
- Enhanced extension popup with auth status
- Profile pictures from Ethos Network
- Better error messages and loading states

---

## 📥 Installation Instructions

### Step 1: Download
Click on **`signals-extension-v1.3.0.zip`** below under "Assets" to download

### Step 2: Extract
Unzip the downloaded file to any folder on your computer

### Step 3: Install in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Turn ON **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the folder where you extracted the extension
5. Done! The Signals icon appears in your toolbar

### Step 4: Connect Your Wallet
1. Click the Signals extension icon
2. Click **"Connect Wallet"**
3. Sign the authentication message with your wallet
4. Start tracking signals on Twitter/X!

---

## 🚀 Quick Start Guide

Once installed:

1. **Go to Twitter/X** (x.com)
2. **Find a crypto tweet** (e.g., "BTC to the moon!")
3. **Hover over the tweet** - see "Save Signal" button
4. **Click it** and choose Bullish 📈 or Bearish 📉
5. **View your signals** at https://signals.ethos.network

---

## ✅ Requirements

- **Browser**: Chrome, Brave, or Edge (Chromium-based)
- **Wallet**: MetaMask, Rabby, Coinbase Wallet, or any Web3 wallet
- **Account**: Ethos Network profile (free at https://ethos.network)

---

## 🔧 Technical Details

**Version**: 1.3.0  
**Size**: 29 KB  
**Manifest**: v3  
**Permissions**: activeTab, storage, alarms, scripting  
**Host Access**: x.com, twitter.com, signals.deno.dev

### What's Included
- Content script for Twitter/X integration
- Background service worker for auth messaging
- Wallet connection with multi-wallet support
- Rate limiting and security features
- "Saved by" attribution system

---

## 🔒 Privacy & Security

**What we collect:**
- Your wallet address (public)
- Your Ethos username and profile
- Signals you save (tweets, sentiment, projects)

**What we DON'T collect:**
- ❌ Private keys or seed phrases
- ❌ Browsing history
- ❌ Tweets you don't save
- ❌ Personal information

**Security features:**
- Cryptographic signature authentication
- 256-bit secure random tokens
- 90-day automatic expiration
- Revocable access
- Rate limiting (50/hour)

📄 Full [Privacy Policy](https://github.com/trust-ethos/ethos-signals/blob/main/PRIVACY_POLICY.md)

---

## 🐛 Troubleshooting

### Extension not appearing?
- Click the puzzle piece icon (Extensions) in Chrome
- Find "Signals" and pin it to your toolbar

### Can't connect wallet?
- Make sure your wallet extension is installed and enabled
- Refresh the page and try again
- Check that you're using a supported wallet

### "Rate limit exceeded" error?
- You've saved 50 signals in the last hour (anti-spam protection)
- Wait for the rate limit to reset (shown in error message)

### Signals not showing up?
- Refresh https://signals.ethos.network
- Check your profile page directly
- Make sure you're logged in with the correct wallet

📖 Full troubleshooting guide: [INSTALL_EXTENSION.md](https://github.com/trust-ethos/ethos-signals/blob/main/INSTALL_EXTENSION.md)

---

## 📚 Documentation

- **[Installation Guide](https://github.com/trust-ethos/ethos-signals/blob/main/INSTALL_EXTENSION.md)** - Complete setup instructions
- **[Authentication System](https://github.com/trust-ethos/ethos-signals/blob/main/EXTENSION_AUTH.md)** - How auth works
- **[Security Analysis](https://github.com/trust-ethos/ethos-signals/blob/main/SECURITY_ANALYSIS.md)** - Security model
- **[Privacy Policy](https://github.com/trust-ethos/ethos-signals/blob/main/PRIVACY_POLICY.md)** - Data practices

---

## 🆕 What Changed from v1.0.0

### Added ✅
- Wallet-based authentication system
- Background service worker
- Rate limiting (50 signals/hour)
- "Saved by" attribution
- Multi-wallet support
- Enhanced security
- Token management
- Better error handling

### Improved 📈
- UI/UX with dark mode design
- Extension popup with auth status
- Profile pictures from Ethos Network
- Database with auth tracking
- API with authentication middleware

### Security 🔒
- All signals now require authentication
- Cryptographic wallet verification
- Complete audit trail
- Token expiration and revocation
- Spam prevention

---

## 🚧 Known Limitations

- **Twitter/X only** - Currently works only on x.com
- **Desktop only** - Not yet available for mobile browsers
- **Rate limited** - 50 signals per hour per wallet
- **Chrome store pending** - Manual installation required (for now)

---

## 🔮 Coming Soon

- **Chrome Web Store** listing (automatic updates)
- **Performance analytics** in popup
- **Batch saving** of multiple signals
- **Keyboard shortcuts**
- **Data export** functionality
- **Mobile support**

---

## 💬 Support & Community

**Have questions or issues?**
- 🐛 [Report bugs](https://github.com/trust-ethos/ethos-signals/issues)
- 💡 [Request features](https://github.com/trust-ethos/ethos-signals/issues/new)
- 🌐 [Visit website](https://signals.ethos.network)
- 🐦 [Follow on Twitter](https://twitter.com/ethosnetwork)

**Email**: support@ethos.network

---

## 🙏 Credits

Built by the Ethos Network team with:
- **Ethos Network** - Reputation infrastructure
- **Base** - Blockchain for on-chain attestations  
- **Fresh** - Web framework
- **Deno** - Runtime environment
- **ethers.js** - Web3 wallet interactions

---

## 📊 Changelog

### v1.3.0 (October 6, 2025)
- ✅ Wallet authentication with cryptographic signatures
- ✅ Multi-wallet support (MetaMask, Rabby, etc.)
- ✅ "Saved by" attribution on signals
- ✅ Rate limiting and security improvements
- ✅ Enhanced UI/UX with dark mode
- ✅ Database migration for auth system
- ✅ Background service worker
- ✅ Token management and revocation

### v1.0.0 (October 1, 2025)
- Initial release
- Basic signal saving from Twitter/X
- Manual authentication

**Full comparison**: [v1.0.0...v1.3.0](https://github.com/trust-ethos/ethos-signals/compare/v1.0.0...v1.3.0)

---

## ⬇️ Download

Click on **`signals-extension-v1.3.0.zip`** below to download the extension!

After downloading, follow the installation instructions above.

---

## 🌟 Enjoying Signals?

- ⭐ Star this repository
- 🐦 Share on Twitter
- 📣 Tell your crypto trading friends
- 💬 Leave feedback in the issues

---

**Track signals. Build reputation. Stay accountable.** 📈📉

