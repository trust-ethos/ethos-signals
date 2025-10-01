# Signals Chrome Extension

Track bullish and bearish trading signals directly from X.com tweets.

## 🛠️ Local Development Mode

The extension can point at your local development server with **one click**!

### Quick Setup

1. **Start your local server**:
   ```bash
   deno task start
   # Runs on http://localhost:8000
   ```

2. **Toggle local mode**:
   - Click the extension icon (in Chrome toolbar)
   - Toggle "Local Dev Mode" switch **ON**
   - Badge changes from `PROD` to `LOCAL` 🎉

3. **Reload X.com** and start testing!

4. **To go back to production**: Toggle switch **OFF**

That's it! See [LOCAL_DEV.md](./LOCAL_DEV.md) for advanced options and troubleshooting.

---

## Installation

### For Users (Easy Method)

1. Download the extension zip file
2. Extract the zip file to a folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the extracted extension folder
7. The extension should appear in your toolbar

### What the Extension Does

- **Adds a purple "+" button** to tweets on X.com/Twitter
- **Track signals**: Click the button to mark a tweet as bullish or bearish on a project
- **Auto-saves**: Signals are automatically saved to your Signals dashboard at signals.deno.dev
- **View dashboard**: Click the extension icon to open your dashboard

## Usage

1. **Browse X.com**: Visit any tweet on x.com or twitter.com
2. **Click the + button**: Purple button appears next to tweet actions (like, retweet, etc.)
3. **Choose sentiment**: Select Bullish 🚀 or Bearish 📉
4. **Pick project**: Choose from verified projects dropdown
5. **Save**: Click "Save Signal" to store in Signals app
6. **Track performance**: View your signals dashboard to see how they performed over time

## Features

- ✅ Auto-detection of tweets
- ✅ Verified projects only
- ✅ Real-time sync with Signals dashboard
- ✅ Performance tracking with price data
- ✅ Works on both x.com and twitter.com

## Need Help?

Visit [signals.deno.dev](https://signals.deno.dev) for more information.