# Signals Chrome Extension

Track bullish and bearish trading signals directly from X.com tweets.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/Users/trevorthompson/dev/signals/extension/` folder
5. The extension should appear in your toolbar

## Usage

1. **Browse X.com**: Visit any tweet on x.com or twitter.com
2. **Save Signal**: Click the purple "+" button next to tweet actions
3. **Choose Type**: Select Bullish 🚀 or Bearish 📉
4. **Pick Project**: Choose from verified projects dropdown
5. **Save**: Click "Save Signal" to store in Signals app

## Features

- **Auto-detection**: Finds tweets and injects save buttons
- **Verified Projects**: Only shows pre-verified projects for consistency
- **Real-time Sync**: Saves directly to your Signals dashboard
- **Performance Tracking**: Signals show price changes over time

## Development

Update the API base URL in:
- `content.js` (line 4)
- `popup.js` (line 3)

Change from `http://localhost:8000` to your production URL when deploying.



