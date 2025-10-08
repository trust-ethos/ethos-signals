# Chrome Web Store Submission Guide

## 📋 Pre-Submission Checklist

### ✅ Required Assets

#### 1. Icons (PNG format - REQUIRED)
The Chrome Web Store requires PNG icons in specific sizes:

- [x] **16x16** - Favicon size
- [x] **48x48** - Extension management page
- [x] **128x128** - Chrome Web Store listing & installation

**Current Status**: ⚠️ Only have SVG - need to create PNGs

**Action Required**:
```bash
# Convert SVG to PNG icons (requires ImageMagick or similar)
# Or use an online converter like cloudconvert.com

# Required sizes:
- extension/icons/icon-16.png
- extension/icons/icon-48.png
- extension/icons/icon-128.png
```

#### 2. Store Listing Images

**Small Promotional Tile** (REQUIRED)
- Size: 440x280 pixels
- Format: PNG or JPEG
- Shows in search results and category pages

**Screenshots** (REQUIRED - at least 1, max 5)
- Size: 1280x800 or 640x400 pixels
- Format: PNG or JPEG
- Shows the extension in action

**Large Promotional Tile** (OPTIONAL but recommended)
- Size: 920x680 pixels
- Format: PNG or JPEG
- Featured on Chrome Web Store homepage (if selected)

**Marquee Promotional Tile** (OPTIONAL)
- Size: 1400x560 pixels
- Format: PNG or JPEG
- Used for special promotions

---

## 📝 Store Listing Content

### Short Description (REQUIRED)
**Max 132 characters** - Shows in search results

```
Track crypto trading signals from Twitter/X with blockchain-verified accountability. Save bullish/bearish calls instantly.
```
*(130 characters)*

### Detailed Description (REQUIRED)
**Max 16,384 characters** - Full store page description

```markdown
# Track Trading Signals with Accountability

Signals is a Chrome extension that lets you track and save trading signals from Twitter/X posts, powered by Ethos Network's reputation system.

## 🎯 Key Features

• **Save Signals Instantly**: Click to save any tweet as a bullish or bearish signal
• **Track Performance**: Automatically track price performance of saved signals
• **Reputation System**: Leverages Ethos Network scores for accountability
• **Blockchain Verified**: Optional on-chain attestation for permanent records
• **Multi-Wallet Support**: Works with MetaMask, Rabby, Coinbase Wallet, and more
• **Rate Performance**: See which traders have the best track records

## 💡 How It Works

1. **Browse Twitter/X**: Look for crypto trading calls (e.g., "BTC going to $100k!")
2. **Save the Signal**: Hover over any tweet and click "Save Signal"
3. **Mark Sentiment**: Choose Bullish 📈 or Bearish 📉
4. **Track Performance**: View historical performance at signals.ethos.network
5. **Build Reputation**: Your successful calls build your Ethos score

## 🔐 Authentication & Security

• Wallet-based authentication using cryptographic signatures
• No password required - your wallet is your identity
• 256-bit secure tokens with 90-day expiration
• Rate limiting to prevent spam (50 signals/hour)
• Optional blockchain attestation on Base network

## 🌟 Perfect For

• Crypto traders tracking market sentiment
• Researchers analyzing trading performance
• Communities holding traders accountable
• Anyone building a verifiable track record

## 🔗 Connect Your Wallet

Supported wallets:
• MetaMask
• Rabby
• Coinbase Wallet
• Rainbow
• Brave Wallet
• Frame
• Any Web3-compatible wallet

## 📊 View Your Signals

Visit signals.ethos.network to:
• See all your saved signals
• Track performance over time
• Compare with other traders
• Export your data
• View on-chain attestations

## 🚀 Powered by Ethos Network

Built on Ethos Network's reputation infrastructure:
• Credibility scores for every user
• On-chain verification available
• Community-driven accountability
• Transparent track records

## 🆓 Free to Use

No subscription fees or hidden costs. Optional gas fees for on-chain attestations only.

## 📧 Support

• Website: https://signals.ethos.network
• GitHub: https://github.com/trust-ethos/ethos-signals
• Twitter: @ethosnetwork

Track your trading calls. Build your reputation. Stay accountable.
```

### Category (REQUIRED)
Choose: **"Productivity"** or **"Shopping"** or **"Social & Communication"**

Recommended: **"Productivity"**

### Language (REQUIRED)
**English**

---

## 🔒 Privacy Policy (REQUIRED)

Chrome Web Store requires a publicly accessible privacy policy URL.

**Action Required**: Create `PRIVACY_POLICY.md` and host it at:
`https://signals.ethos.network/privacy` or similar

**Template provided below** ⬇️

---

## 🛡️ Permissions Justification

You'll need to justify each permission request:

### 1. `activeTab`
**Justification**: "Required to inject the signal-saving UI on Twitter/X pages when users click the extension icon"

### 2. `storage`
**Justification**: "Stores authentication tokens locally and caches recent signals for offline access"

### 3. `alarms`
**Justification**: "Schedules periodic cleanup of expired authentication tokens"

### 4. `scripting`
**Justification**: "Injects content scripts to add signal-saving buttons to Twitter/X tweets"

### 5. Host Permissions
**`https://x.com/*` and `https://twitter.com/*`**
**Justification**: "Required to display signal-saving UI on Twitter/X and detect tweets about crypto projects"

**`https://signals.deno.dev/*`**
**Justification**: "Connects to our backend API to save signals and authenticate users"

**`http://localhost:8000/*`**
**Justification**: "Development and testing only - can be removed for production"

---

## 📸 Screenshot Recommendations

Create 3-5 screenshots showing:

1. **Tweet with Save Button** (1280x800)
   - Show a crypto tweet with the "Save Signal" button visible
   - Caption: "Save any tweet as a trading signal"

2. **Sentiment Selection** (1280x800)
   - Show the bullish/bearish selection modal
   - Caption: "Choose signal sentiment"

3. **Extension Popup** (640x400 or 1280x800)
   - Show the extension popup with recent signals
   - Caption: "View your recent signals"

4. **Dashboard View** (1280x800)
   - Screenshot of signals.ethos.network dashboard
   - Caption: "Track performance on the web dashboard"

5. **Wallet Connection** (1280x800)
   - Show the wallet connection page
   - Caption: "Secure wallet-based authentication"

---

## 🎨 Promotional Images

### Small Promotional Tile (440x280) - REQUIRED

**Design Elements**:
- Extension icon/logo
- Text: "Signals" or "Track Trading Signals"
- Tagline: "Blockchain-Verified Accountability"
- Background: Match the extension's dark theme
- Keep it simple and recognizable

### Color Scheme
Match your existing design:
- Background: Dark navy/black (#1a1a2e or similar)
- Primary: Blue/purple gradient
- Accent: Green (for bullish) / Red (for bearish)

---

## 📋 Manifest Updates Needed

### 1. Add Icons to Manifest

Update `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Signals - Trading Signal Tracker",
  "version": "1.3.0",
  "description": "Track bullish and bearish trading signals on X.com with Ethos Network accountability",
  
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "Signals",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
  
  // ... rest of manifest
}
```

### 2. Remove Localhost Permissions (Production)

For the production submission, remove localhost from host_permissions:

```json
"host_permissions": [
  "https://x.com/*",
  "https://twitter.com/*",
  "https://signals.deno.dev/*"
  // Remove: "http://localhost:8000/*"
],
```

### 3. Add Homepage URL (Recommended)

```json
"homepage_url": "https://signals.ethos.network"
```

---

## 🔍 Chrome Web Store Review Checklist

Chrome will review for:

### ✅ Single Purpose
- [ ] Extension has ONE clear purpose: tracking trading signals
- [ ] All features relate to this purpose
- [ ] No unrelated functionality

### ✅ Permissions
- [ ] Only requests necessary permissions
- [ ] Each permission is justified
- [ ] No excessive data collection

### ✅ User Experience
- [ ] Clear what the extension does
- [ ] Easy to use
- [ ] Good error handling
- [ ] No intrusive behavior

### ✅ Security & Privacy
- [ ] No malicious code
- [ ] Secure authentication
- [ ] Privacy policy provided
- [ ] User data protected

### ✅ Content Policy
- [ ] No prohibited content
- [ ] No spam/misleading information
- [ ] Proper attribution
- [ ] No copyright violations

### ✅ Monetization (if applicable)
- [ ] Clear about any costs
- [ ] No misleading "free" claims
- [ ] Proper payment processing

---

## 📤 Submission Steps

### 1. Create Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with Google account
3. Pay one-time $5 registration fee
4. Accept developer agreement

### 2. Prepare All Assets

Before submission, have ready:
- [ ] Extension ZIP file (signals-extension-v1.3.0.zip)
- [ ] PNG icons (16x16, 48x48, 128x128)
- [ ] Small promotional tile (440x280)
- [ ] At least 1 screenshot (1280x800)
- [ ] Privacy policy URL
- [ ] Store listing descriptions

### 3. Upload Extension

1. Click "New Item" in developer dashboard
2. Upload `signals-extension-v1.3.0.zip`
3. Wait for automatic processing (checks for errors)

### 4. Complete Store Listing

Fill out all fields:
- **Product details**: Name, description, category
- **Graphic assets**: Icons, screenshots, promotional images
- **Privacy**: Privacy policy URL, permission justifications
- **Distribution**: Visibility (public/unlisted), regions, pricing

### 5. Submit for Review

1. Click "Submit for review"
2. Review typically takes 1-3 business days
3. You'll receive email notification

### 6. After Approval

Once approved:
- Extension goes live on Chrome Web Store
- Users can install with one click
- You get a unique store URL to share
- Can publish updates anytime

---

## 🚫 Common Rejection Reasons (Avoid These!)

### 1. Missing Privacy Policy
**Solution**: Create and link a privacy policy

### 2. Excessive Permissions
**Solution**: Only request necessary permissions, provide justification

### 3. Poor Quality Screenshots
**Solution**: Use high-resolution, clear screenshots

### 4. Misleading Description
**Solution**: Accurate description, no exaggerated claims

### 5. Broken Functionality
**Solution**: Test thoroughly before submission

### 6. Localhost URLs in Manifest
**Solution**: Remove dev URLs from production build

---

## 🔄 Publishing Updates

After initial approval, updates are easier:

1. Update version in `manifest.json`
2. Bundle new version: `./bundle-extension.sh`
3. Upload to Chrome Web Store dashboard
4. Submit for review (faster than initial review)
5. Updates roll out to users automatically

---

## 📊 Post-Launch

### Analytics
Chrome Web Store provides:
- Install count
- Weekly active users
- Rating and reviews
- Crash reports

### User Reviews
- Respond to reviews promptly
- Address issues quickly
- Build community trust

### Marketing
Share your Chrome Web Store URL:
- On your website
- Social media
- Documentation
- Email signatures

---

## 🎯 Estimated Timeline

| Step | Time |
|------|------|
| Create assets | 2-4 hours |
| Write store listing | 1 hour |
| Create privacy policy | 1 hour |
| Developer account setup | 15 minutes |
| Upload and submit | 30 minutes |
| **Chrome review** | **1-3 business days** |
| **Total** | **1-4 days** |

---

## 📞 Need Help?

- [Chrome Web Store Help](https://support.google.com/chrome_webstore/)
- [Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Best Practices](https://developer.chrome.com/docs/webstore/best-practices/)

---

## ✅ Ready to Submit

Once you have:
1. ✅ PNG icons created
2. ✅ Screenshots taken
3. ✅ Promotional tile designed
4. ✅ Privacy policy hosted
5. ✅ Manifest updated
6. ✅ Testing complete

You're ready to submit to the Chrome Web Store! 🚀

