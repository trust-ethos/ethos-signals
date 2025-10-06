# Signals Chrome Extension

A Chrome extension that allows users to save and track trading signals (bullish/bearish calls) on X.com (Twitter) with wallet-based authentication and Ethos Network integration.

## Features

- 🔐 **Multi-Wallet Support**: Works with Rabby, MetaMask, Rainbow, Coinbase Wallet, and any Web3 wallet
- 📊 **Signal Tracking**: Save bullish/bearish signals directly from tweets
- ✨ **Ethos Integration**: Automatically links to your Ethos Network profile
- 🎨 **Beautiful Onboarding**: Full-page onboarding experience for wallet connection
- 🚀 **Auto-Launch**: Opens onboarding page automatically on first install
- ⚡ **Rate Limiting**: Built-in API protection (50 signals/hour)
- 🔒 **Secure**: Signature-based authentication with 90-day token expiry

## Installation

### For Development

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `/extension/` directory
6. The extension will install and automatically open the onboarding page

### For Users

The extension will be available on the Chrome Web Store soon.

## Usage

### First Time Setup

1. **Install the Extension**
   - The onboarding page opens automatically
   - You'll see a welcome screen with extension features

2. **Connect Your Wallet**
   - Click "Connect Wallet"
   - Approve the connection in your wallet (Rabby, MetaMask, etc.)
   - Sign the authentication message
   - If your wallet is linked to an Ethos profile, it will be automatically detected

3. **Start Saving Signals**
   - Go to X.com (Twitter)
   - Browse tweets
   - Look for the save button on tweets (💾 icon)
   - Click to save a signal
   - Select bullish/bearish and choose a project
   - Your signal is saved and attributed to your wallet!

### Managing Authentication

**From the Extension Popup:**
- Click the extension icon in your toolbar
- View your connection status
- See your wallet address and Ethos username
- Disconnect your wallet if needed
- Toggle between local dev and production mode

**Reconnecting:**
- If your session expires (after 90 days), you'll be prompted to reconnect
- Click "Connect Wallet" in the popup
- The onboarding page will open for re-authentication

## Supported Wallets

The extension works with any Web3 wallet that injects `window.ethereum`:

- 🦊 **Rabby** (detected automatically)
- 🦊 **MetaMask** (detected automatically)
- 🌈 **Rainbow** (detected automatically)
- 💰 **Coinbase Wallet** (detected automatically)
- 🦁 **Brave Wallet** (detected automatically)
- 🖼️ **Frame** (detected automatically)
- 🔓 **Any other Web3 wallet** (generic support)

## Files

### Core Files
- `manifest.json` - Extension configuration
- `background.js` - Service worker for auth management
- `content.js` - Injects save buttons on X.com
- `content.css` - Styles for injected elements
- `wallet-connect.js` - Multi-wallet connection handler

### UI Files
- `onboarding.html` - Full-page onboarding experience
- `onboarding.js` - Onboarding logic
- `popup.html` - Extension toolbar popup
- `popup.js` - Popup logic

## Development

### Local Development Mode

1. Click the extension icon
2. Toggle "Local Dev Mode" to ON
3. The extension will now use `http://localhost:8000` instead of production
4. Reload X.com to apply changes

### Testing Wallet Connection

1. Make sure you have a Web3 wallet installed (Rabby, MetaMask, etc.)
2. Open the extension popup
3. Click "Connect Wallet"
4. The onboarding page opens in a new tab
5. Click "Connect Wallet" on the onboarding page
6. Approve connection and sign message
7. You should see success state with your wallet address

### Debugging

**Console Logs:**
- Open DevTools on X.com: Check content script logs
- Inspect extension popup: Right-click popup → "Inspect"
- View service worker logs: Go to `chrome://extensions/` → Click "service worker"

**Check Storage:**
```javascript
// In extension popup console:
chrome.storage.local.get(null, console.log);
chrome.storage.sync.get(null, console.log);
```

### Building for Production

1. Update version in `manifest.json`
2. Test thoroughly in dev mode
3. Create a ZIP of the extension directory:
   ```bash
   cd extension/
   zip -r signals-extension.zip * -x "*.DS_Store"
   ```
4. Upload to Chrome Web Store

## API Endpoints

The extension communicates with the Signals backend:

### Authentication
- `POST /api/auth/connect` - Create auth token with wallet signature
- `GET /api/auth/verify` - Verify current token
- `POST /api/auth/revoke` - Logout/revoke token

### Signals
- `POST /api/signals/{username}` - Save a signal (requires auth)
- `GET /api/signals/{username}` - List user's signals
- `DELETE /api/signals/{username}?id={id}` - Delete a signal (requires auth)

### Projects
- `GET /api/verified` - List verified projects

## Rate Limits

- **Signal Creation**: 50 per hour
- **Signal List**: 100 per hour
- **General API**: 200 per hour

When rate limited, users receive a clear error message with retry time.

## Security

- **Signature Verification**: All authentication uses wallet signatures
- **Token Expiry**: Auth tokens expire after 90 days
- **Secure Storage**: Tokens stored in Chrome's encrypted storage
- **No Private Keys**: Extension never accesses private keys
- **HTTPS Only**: All API communication over HTTPS in production

## Troubleshooting

### "No Web3 wallet detected"
- Make sure you have a wallet extension installed
- Try reloading the page
- Check that your wallet is unlocked

### "Authentication expired"
- Your 90-day session has expired
- Click "Connect Wallet" to re-authenticate
- You'll need to sign a new message

### "Rate limit exceeded"
- You've hit the hourly rate limit
- Wait for the time specified in the error
- Rate limits reset every hour

### Save button not appearing
- Make sure you're on X.com (not twitter.com)
- Reload the page
- Check browser console for errors
- Make sure the extension is enabled

### Signals not saving
- Check that you're authenticated (click extension icon)
- Look for error messages in the save dialog
- Check browser console for API errors
- Verify your internet connection

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review extension console logs
3. Check backend logs if you have access
4. Open an issue on GitHub (if applicable)

## Version History

### v1.2.0 (Current)
- ✨ Multi-wallet support (Rabby, Rainbow, Coinbase, etc.)
- 🎨 Beautiful full-page onboarding experience
- 🚀 Auto-launch onboarding on first install
- 🔧 Improved wallet detection

### v1.1.0
- 🔐 Wallet-based authentication
- 📈 Rate limiting protection
- ✨ Ethos profile integration
- 🔒 90-day secure sessions

### v1.0.0
- 📊 Initial release
- 💾 Save signals from tweets
- 📱 Basic popup UI

## License

Copyright © 2024 Signals. All rights reserved.
