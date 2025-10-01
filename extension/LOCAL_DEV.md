# Local Development with Chrome Extension

## Quick Setup

The Chrome extension can be configured to point at your local development server instead of production.

### 1. Start Your Local Server

```bash
deno task start
# Server will run on http://localhost:8000
```

### 2. Switch Extension to Local Mode

Open any X.com page in Chrome, then open the browser console (F12) and run:

```javascript
// Switch to local development
chrome.storage.sync.set({ apiBaseUrl: 'http://localhost:8000' }, () => {
  console.log('✅ Extension now pointing to LOCAL server');
  console.log('🔄 Reload the page to apply changes');
});
```

### 3. Reload the X.com Page

Refresh the page and your extension will now save signals to your local server!

---

## Switch Back to Production

To point the extension back at production:

```javascript
// Switch back to production
chrome.storage.sync.remove('apiBaseUrl', () => {
  console.log('✅ Extension now pointing to PRODUCTION server');
  console.log('🔄 Reload the page to apply changes');
});
```

---

## Verify Current Configuration

Check which API the extension is using:

```javascript
chrome.storage.sync.get(['apiBaseUrl'], (result) => {
  if (result.apiBaseUrl) {
    console.log('🔧 Custom API:', result.apiBaseUrl);
  } else {
    console.log('🌐 Using production: https://signals.deno.dev');
  }
});
```

---

## Development Workflow

1. **Make code changes** in your editor
2. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the reload icon on "Signals - Trading Signal Tracker"
3. **Refresh X.com** to see changes
4. **Check console logs** for debugging (they'll show which API is being used)

---

## Debugging Tips

### Check API Calls
Open DevTools Network tab (F12 → Network) and filter by "signals" to see API requests.

### Enable Extension Logs
The extension logs to the console:
- `🔧 Using custom API URL:` - Confirms local mode
- Check for any API errors in red

### Test a Signal Save
1. Find any tweet on X.com
2. Click the Bull/Bear buttons
3. Check your terminal for the POST request to `/api/signals/[username]`
4. Check your local database for the new signal

---

## Common Issues

**Extension not making requests to localhost?**
- Make sure you ran the console command to set `apiBaseUrl`
- Reload both the extension AND the X.com page
- Check console for "Using custom API URL" message

**CORS errors?**
- Fresh should handle CORS automatically
- Check your API handler has proper CORS headers

**Extension not loading?**
- Go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the `extension/` folder
- Check for any errors in the extension card

---

## Testing Onchain Features Locally

To test onchain signal saving with your local server:

1. Set up local mode (see above)
2. Ensure your `.env` has:
   ```bash
   ENABLE_ONCHAIN_SIGNALS=true
   PRIVATE_KEY=0x...
   BASE_RPC_URL=https://sepolia.base.org  # Use testnet for local testing!
   SIGNALS_CONTRACT_ADDRESS=0x...          # Your testnet contract
   ```
3. Save a signal via the extension
4. Check the "View Onchain" link appears
5. Verify on Base Sepolia testnet (free!)

---

## Reset Everything

To completely reset the extension:

```javascript
chrome.storage.sync.clear(() => {
  console.log('🧹 All extension settings cleared');
  console.log('🔄 Reload to use default production settings');
});
```

