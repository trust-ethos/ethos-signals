# Signals v1.5.0 - Paid Promo Disclosure Status

## 🎉 What's New

This release adds **disclosure status tracking** for paid promotion reports, helping the community identify undisclosed paid promotions.

### Paid Promo Disclosure Status

When reporting a tweet as a paid promo, users can now specify:
- ✅ **Disclosed** - Content clearly states it's a paid partnership
- ⚠️ **Undisclosed** - Content doesn't mention it's paid

### Why This Matters

Undisclosed paid promotions can mislead investors. By tracking disclosure status, the Signals community can identify content that may not be fully transparent and promote better practices in the crypto space.

## ✨ Key Features

### 🎯 Disclosure Status Selection
- Easy-to-use toggle buttons in the extension dialog
- "Disclosed" is pre-selected by default
- Visual feedback with color-coded buttons (green/red)

### 📊 Enhanced Tweet Indicators
Orange text appears on tweets with paid promo reports:
- "3 reported as paid promo (disclosed)"
- "5 reported as paid promo (undisclosed)"  
- "8 reported as paid promo (disclosed and undisclosed)"

### 💎 Profile Page Badges
- Color-coded badges on each report
- Green badge for "Disclosed"
- Red badge for "Undisclosed"
- Separate tabs for Signals and Paid Promo Reports

## 🔧 Technical Changes

### Database
- Added `disclosure_status` column to `paid_promo_reports` table
- New migration: `008_add_disclosure_status.sql`
- Optimized with indexed queries

### API
- Updated POST `/api/paid-promos/[username]` to accept `disclosureStatus`
- Modified GET `/api/paid-promos/count` to return `{total, disclosed, undisclosed}`

### Extension
- Version bumped to 1.5.0
- Added disclosure status buttons in dialog
- Enhanced tweet indicators with disclosure info
- Removed debug logging for production

## 📦 Installation Instructions

### Chrome / Brave Browser Installation

#### Step 1: Download the Extension
- Click the **"signals-extension-v1.5.0.zip"** file below (in the Assets section)
- Or use this direct link: [Download signals-extension-v1.5.0.zip](https://github.com/trust-ethos/ethos-signals/releases/download/v1.5.0/signals-extension-v1.5.0.zip)
- Save it to your Downloads folder

#### Step 2: Extract the ZIP File
- Locate the downloaded `signals-extension-v1.5.0.zip` file
- **Right-click** on it and select **"Extract All..."** (Windows) or double-click (Mac)
- Extract to a permanent location (e.g., `Documents/Extensions/signals-v1.5.0`)
- ⚠️ **Important**: Don't delete this folder - the extension needs it to run!

#### Step 3: Open Extensions Page
- Open Chrome or Brave browser
- Type `chrome://extensions/` in the address bar and press Enter
- Or click the puzzle icon (🧩) in the toolbar → "Manage Extensions"

#### Step 4: Enable Developer Mode
- Look for the **"Developer mode"** toggle in the top-right corner
- Click it to turn it **ON** (it should turn blue)

#### Step 5: Remove Old Version (If Installed)
- If you see an older version of Signals extension:
  - Click the **"Remove"** button
  - Confirm removal when prompted

#### Step 6: Load the New Extension
- Click the **"Load unpacked"** button (appears after enabling Developer mode)
- Navigate to the folder where you extracted the files
- Select the `signals-extension-v1.5.0` folder and click **"Select Folder"**
- The extension should now appear in your extensions list

#### Step 7: Verify Installation
- Look for the Signals icon in your browser toolbar
- If you don't see it, click the puzzle icon (🧩) and pin Signals
- Navigate to [x.com](https://x.com) or [twitter.com](https://twitter.com)
- Refresh the page (press F5)
- You should see a "Save to Signals" button on tweets

### Troubleshooting

**Extension doesn't appear?**
- Make sure you selected the correct folder (should contain `manifest.json`)
- Check that Developer mode is enabled
- Try reloading the extension from `chrome://extensions/`

**"Save to Signals" button not showing?**
- Refresh the X.com/Twitter page (F5)
- Clear your browser cache and reload
- Check that the extension is enabled (toggle should be blue)

**Getting errors?**
- Make sure you extracted all files from the ZIP
- Verify the folder wasn't moved or deleted
- Try removing and re-adding the extension

### For Developers

```bash
# Pull latest changes
git pull origin main

# Run migration 008
deno run -A scripts/run-migration-008.ts

# Verify migration
deno run -A scripts/verify-migration-008.ts
```

## 🚀 Deployment

See [DEPLOYMENT_INSTRUCTIONS.md](https://github.com/trust-ethos/ethos-signals/blob/main/DEPLOYMENT_INSTRUCTIONS.md) for complete deployment guide.

**Important**: Run migration 008 on production database before users install the new extension.

## 📝 Full Changelog

### Added
- Disclosure status selection for paid promo reports
- Enhanced tweet indicators with disclosure information
- Color-coded badges in profile UI
- Database column `disclosure_status` with validation
- Migration 008 and verification scripts
- Comprehensive launch documentation

### Changed
- API count endpoint returns structured object instead of number
- Extension dialog UI with new disclosure buttons
- Profile page layout with tabs for better organization

### Fixed
- "undefined" text appearing on tweets without reports
- Excessive console logging in production
- URL matching for paid promo count queries

### Removed
- Debug logging from production extension build
- Unnecessary console output

## 📊 Metrics to Monitor

After deployment, track:
- Number of reports by disclosure status
- Ratio of disclosed vs undisclosed
- Most reported Twitter accounts
- API performance metrics

See [LAUNCH_CHECKLIST_v1.5.0.md](https://github.com/trust-ethos/ethos-signals/blob/main/LAUNCH_CHECKLIST_v1.5.0.md) for monitoring queries.

## 🔄 Migration Required

**Before deploying**, run migration 008:

```bash
deno run -A scripts/run-migration-008.ts
```

This adds the `disclosure_status` column to the database. All existing reports default to "disclosed".

## 🐛 Known Issues

None at this time. Please report issues via GitHub Issues.

## 📚 Documentation

- [Launch Checklist](https://github.com/trust-ethos/ethos-signals/blob/main/LAUNCH_CHECKLIST_v1.5.0.md)
- [Deployment Instructions](https://github.com/trust-ethos/ethos-signals/blob/main/DEPLOYMENT_INSTRUCTIONS.md)
- [Full Release Notes](https://github.com/trust-ethos/ethos-signals/blob/main/RELEASE_NOTES_v1.5.0.md)

## 🙏 Thank You

Thanks to the Signals community for helping identify transparency issues in the crypto space and testing this feature!

---

**Full Diff**: https://github.com/trust-ethos/ethos-signals/compare/0251a44...5649079

