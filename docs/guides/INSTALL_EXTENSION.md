# How to Install Signals Chrome Extension

## 📦 Download

Download the latest extension bundle:
- **File**: `signals-extension-v1.3.0.zip`
- **Size**: 29KB
- **Version**: 1.3.0

---

## 🚀 Installation Steps

### Step 1: Download and Extract

1. Download `signals-extension-v1.3.0.zip`
2. Extract the ZIP file to a folder on your computer
3. Remember where you saved this folder - you'll need it in Step 3

### Step 2: Open Chrome Extensions

1. Open Google Chrome
2. Navigate to `chrome://extensions/` (copy and paste this into your address bar)
3. Or: Click the three dots menu → More Tools → Extensions

### Step 3: Enable Developer Mode

In the top-right corner of the Extensions page:
1. Find the **"Developer mode"** toggle
2. Turn it **ON** (it should turn blue)

### Step 4: Load the Extension

1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. Navigate to the folder where you extracted the extension files
3. Select the folder and click **"Select Folder"** or **"Open"**

### Step 5: Verify Installation

You should see:
- ✅ The Signals extension appears in your extensions list
- ✅ The Signals icon appears in your Chrome toolbar
- ✅ No error messages

---

## 🔐 First-Time Setup

### Connect Your Wallet

After installation, you need to authenticate:

1. **Click the Signals extension icon** in your toolbar
2. Click **"Connect Wallet"**
3. You'll be taken to a web page to connect your Web3 wallet
4. **Sign the authentication message** with your wallet
5. Your wallet and Ethos profile will be linked

### Supported Wallets

- ✅ MetaMask
- ✅ Rabby
- ✅ Coinbase Wallet
- ✅ Rainbow
- ✅ Brave Wallet
- ✅ Frame
- ✅ Any Web3-compatible wallet

---

## 💡 How to Use

### Saving Signals from Twitter/X

1. **Navigate to x.com (Twitter)**
2. **Find a tweet** about a crypto project (e.g., someone posting "BTC to the moon!")
3. **Hover over the tweet** - you'll see a "Save Signal" button appear
4. **Click "Save Signal"**
5. **Select sentiment**: Bullish 📈 or Bearish 📉
6. **Confirm** - the signal is saved!

### Viewing Your Signals

1. Visit **https://signals.ethos.network**
2. Your saved signals appear on your profile
3. Track performance of the calls you saved
4. See who else is tracking the same projects

### Extension Popup

Click the extension icon to:
- ✅ See your authentication status
- ✅ View recent signals you've saved
- ✅ Quick access to Signals website
- ✅ Check your rate limits

---

## ⚙️ Configuration

### API URL (for developers)

The extension connects to:
- **Production**: `https://signals.ethos.network`
- **Local Development**: `http://localhost:8000`

To change the API URL:
1. Open the extension popup
2. Right-click → Inspect
3. In console, run: `chrome.storage.sync.set({ apiBaseUrl: 'YOUR_URL' })`

---

## 🔒 Security & Privacy

### What Data is Collected?

- ✅ Your wallet address (for authentication)
- ✅ Your Ethos username and profile
- ✅ Signals you save (tweet URLs, sentiment, project)
- ✅ Authentication tokens (stored locally, 90-day expiry)

### What Data is NOT Collected?

- ❌ Your private keys (never leaves your wallet)
- ❌ Your browsing history
- ❌ Personal information beyond your public Ethos profile
- ❌ Tweets you don't explicitly save as signals

### Authentication

- **Cryptographic signatures**: Uses wallet signatures to verify identity
- **Auth tokens**: 256-bit secure random tokens with 90-day expiration
- **Rate limiting**: 50 signals per hour to prevent abuse
- **Can revoke**: Disconnect wallet anytime from the popup

---

## 🐛 Troubleshooting

### Extension Not Appearing

**Problem**: Extension installed but icon not visible

**Solution**:
1. Click the puzzle piece icon (Extensions) in Chrome toolbar
2. Find "Signals" in the list
3. Click the pin icon to pin it to your toolbar

### "Authentication Required" Error

**Problem**: Can't save signals, getting auth errors

**Solution**:
1. Click the Signals extension icon
2. Click "Connect Wallet"
3. Sign the authentication message
4. Try saving a signal again

### "No Wallet Detected" Error

**Problem**: Extension says no wallet found

**Solution**:
1. Make sure you have a Web3 wallet extension installed (MetaMask, Rabby, etc.)
2. Make sure your wallet extension is enabled
3. Refresh the page
4. Try connecting again

### "Rate Limit Exceeded" Error

**Problem**: Can't save more signals

**Solution**:
- You've hit the 50 signals/hour limit (anti-spam protection)
- Wait for the rate limit to reset (shown in error message)
- This is normal security behavior

### Signals Not Showing Up

**Problem**: Saved a signal but don't see it on the website

**Solution**:
1. Refresh the Signals website
2. Check your profile page directly: `https://signals.ethos.network/profile/YOUR_USERNAME`
3. Signal may take a few seconds to appear
4. Check browser console (F12) for any errors

### Extension Stopped Working After Update

**Problem**: Extension was working, now it's broken

**Solution**:
1. Go to `chrome://extensions/`
2. Find Signals extension
3. Click the refresh icon 🔄
4. If that doesn't work, remove and reinstall the extension

---

## 📊 Rate Limits

To prevent spam and abuse, the extension has rate limits:

| Action | Limit | Window |
|--------|-------|--------|
| Save signals | 50 | Per hour |
| List signals | 100 | Per hour |
| General API | 200 | Per hour |

These limits are per authenticated wallet address.

---

## 🔗 Resources

- **Signals Website**: https://signals.ethos.network
- **Ethos Network**: https://ethos.network
- **GitHub**: https://github.com/trust-ethos/ethos-signals
- **Support**: [GitHub Issues](https://github.com/trust-ethos/ethos-signals/issues)

---

## 🚀 Chrome Web Store (Coming Soon)

Once published to the Chrome Web Store, installation will be even easier:
1. Visit the Chrome Web Store listing
2. Click "Add to Chrome"
3. Done! Automatic updates enabled

---

## 📝 Version History

### v1.3.0 (Current)
- ✅ Wallet-based authentication system
- ✅ Support for multiple Web3 wallets
- ✅ "Saved by" attribution on signals
- ✅ Rate limiting and security improvements
- ✅ Enhanced UI with dark mode

### v1.0.0 (Initial)
- Basic signal saving from Twitter
- Manual authentication

---

## ⚠️ Known Limitations

- **Twitter/X only**: Currently only works on x.com (twitter.com)
- **Desktop Chrome only**: Not yet available for mobile or other browsers
- **Rate limited**: 50 signals per hour per wallet
- **Requires wallet**: Must have Web3 wallet to use

---

## 🎯 Future Features

Coming soon:
- 🔜 Chrome Web Store listing
- 🔜 Automatic updates
- 🔜 Performance analytics in popup
- 🔜 Keyboard shortcuts
- 🔜 Batch signal saving
- 🔜 Export signals data

---

## 📞 Support

Need help?
1. Check this guide first
2. Check the [README](extension/README.md)
3. Open an issue on [GitHub](https://github.com/trust-ethos/ethos-signals/issues)
4. Contact Ethos support

---

**Happy signal tracking! 📈📉**

