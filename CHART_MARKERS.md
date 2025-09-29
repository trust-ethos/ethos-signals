# Chart Markers Update

## Changes Made

Updated the trading view graphs to show personalized signal markers instead of generic emojis.

### Before:
- 🚀 Rocket emoji for bullish signals
- 📉 Down chart emoji for bearish signals

### After:
- **Bullish signals**: User's profile picture + 🐂 Bull emoji
- **Bearish signals**: User's profile picture + 🐻 Bear emoji

## Implementation Details

### 1. Badge Updates (`SignalsForm.tsx`)
Changed the signal badges from:
- "🚀 Bullish" → "🐂 Bullish"
- "📉 Bearish" → "🐻 Bearish"

### 2. Chart Markers (`PriceChart.tsx`)

#### Data Flow:
1. Fetch the trader's profile information from Ethos API
2. Create base markers with bull/bear emojis using lightweight-charts API
3. Overlay custom HTML markers showing avatar + emoji

#### Custom Marker Features:
- **Avatar Display**: 24x24px circular profile picture
- **Border Color**: Green (#22c55e) for bullish, Red (#ef4444) for bearish
- **Position**: Bulls below the price line, Bears above
- **Layout**: Avatar image followed by animal emoji
- **Shadow**: Drop shadow on emoji for better visibility

### 3. User Info Fetching
The component now:
- Fetches **each unique tweeter's** profile data from Ethos API v2
- Supports multiple different users on the same chart
- Uses `getUserByTwitterUsername()` helper function
- API endpoint: `https://api.ethos.network/api/v2/user/by/x/{username}`
- Includes required `X-Ethos-Client` header
- Extracts avatar URL and display name for each user
- Deduplicates usernames before fetching (performance optimization)

## Visual Result

Each signal marker on the chart now shows:
```
[Profile Picture] 🐂  (for bullish)
[Profile Picture] 🐻  (for bearish)
```

The profile picture has a colored border (green/red) matching the signal sentiment.

## Technical Notes

- Uses custom HTML overlays positioned absolutely on the chart
- Markers are repositioned on data updates
- Falls back to emoji-only markers if user info unavailable
- Uses lightweight-charts' native marker system as base layer
- Custom markers overlay with proper z-indexing

## Current Features

✅ **Multi-user support**: Different avatars for different users on same chart
✅ **Smart fetching**: Deduplicates usernames and fetches in parallel
✅ **Fallback handling**: Shows emoji-only if avatar unavailable
✅ **Responsive**: Markers reposition when chart is resized or data changes

## Future Enhancements

Potential improvements:
- Add tooltip showing full signal details on hover
- Animate marker appearance
- Add click handlers to navigate to tweet
- Support hover effects on avatars
