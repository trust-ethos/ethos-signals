# Fix for Plasma Token Price Display

## The Problem
Your saved signal for @PlasmaFDN isn't showing price data because:
1. PlasmaFDN is not in the verified_projects table
2. The SignalsForm component was only checking for `link` (contract address) but not `coinGeckoId`

## What I Fixed

### 1. Updated SignalsForm Component
- Modified to check for both `link` (contract address) AND `coinGeckoId`
- Added `CoinGeckoPriceDelta` component for Layer 1 tokens without contracts
- This supports tokens like Plasma that use CoinGecko IDs instead of contract addresses

### 2. API Endpoint Already Works
The `/api/price/coingecko?id=plasma` endpoint works correctly and returns:
```json
{"price":1.25}
```

## To Fix Your Plasma Signal

### Option 1: Use the Admin Panel
1. Go to http://localhost:8000/admin/verified
2. Search for "plasmafdn"
3. If found, click "Auto-populate from CoinGecko" 
4. Set Type to "Token"
5. Leave Contract Address empty
6. Set CoinGecko ID to "plasma"
7. Click Save

### Option 2: Manual Database Insert
Run this SQL in your database:
```sql
INSERT INTO verified_projects (
    id, ethos_user_id, twitter_username, display_name, avatar_url, 
    type, chain, coingecko_id, created_at
) VALUES (
    '01JH1ZQMR8XHBQVPW5K7N8DQ2F',
    999999,
    'plasmafdn',
    'Plasma',
    'https://pbs.twimg.com/profile_images/placeholder.jpg',
    'token',
    'ethereum',
    'plasma',
    NOW()
);
```

## After Adding PlasmaFDN
Once PlasmaFDN is added as a verified project with `coinGeckoId: "plasma"`, your saved signal will automatically show:
- Call price
- +1d, +7d, +28d performance 
- Current price and total performance

The price data will use DefiLlama's API with the CoinGecko ID format.


