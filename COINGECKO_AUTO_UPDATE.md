# Automatic CoinGecko ID Updates

## Problem

Tokens without CoinGecko IDs only show **daily price data** (from DefiLlama). To get **hourly/minute price data**, we need CoinGecko IDs.

## Solution

### ✨ Automatic (NEW!)

When saving a new token project via `/api/verified`, the system now **automatically looks up the CoinGecko ID** using the contract address! No manual work needed.

**How it works:**
1. You save a token with a contract address
2. System automatically calls CoinGecko API to find the ID
3. CoinGecko ID is saved with the project
4. Token immediately gets hourly price data! 📊

This happens in real-time when projects are saved through the admin interface.

### 🔧 Manual Script (For Existing Tokens)

For tokens already in the database without CoinGecko IDs, use `scripts/update-coingecko-ids.ts`:
1. Finds all tokens without CoinGecko IDs
2. Looks them up on CoinGecko using their contract addresses
3. Updates the database with the correct CoinGecko ID

## Usage

```bash
deno run -A scripts/update-coingecko-ids.ts
```

## Rate Limits

CoinGecko's free tier has strict rate limits (50 calls/minute). The script automatically:
- Waits 6 seconds between each token lookup
- For 17 tokens, this takes ~2 minutes

### Faster Option (CoinGecko Pro)

If you have a CoinGecko Pro API key:
1. Set `COINGECKO_API_KEY` in `.env`
2. Update the script to include `&x_cg_pro_api_key=${Deno.env.get("COINGECKO_API_KEY")}` in API URLs
3. Reduce delays to 1-2 seconds

## What Gets Updated

The script looks for tokens in `verified_projects` where:
- `type = 'token'`
- `coingecko_id IS NULL`
- `link IS NOT NULL` (contract address exists)

## Supported Chains

- ✅ Ethereum
- ✅ Base
- ✅ Solana
- ✅ BSC (Binance Smart Chain)
- ❌ Plasma (not on CoinGecko)
- ❌ Hyperliquid (not on CoinGecko)

## Manual Updates

If the script fails to find a token, you can manually update it:

```sql
UPDATE verified_projects
SET coingecko_id = 'token-id-here'
WHERE twitter_username = 'username_here';
```

To find the CoinGecko ID:
1. Search on https://www.coingecko.com/
2. Open the token page
3. The ID is in the URL: `coingecko.com/en/coins/[this-is-the-id]`

## Maintenance Schedule

Run this script:
- **Whenever you add new tokens** to the database
- **Weekly** to catch any newly-listed tokens on CoinGecko
- **After CoinGecko lists** previously unlisted tokens

## Example Output

```
🔍 Finding tokens without CoinGecko IDs...

Found 2 tokens without CoinGecko IDs:

🔎 @zora ($zora) on base
   Contract: 0x...
   ✅ Found CoinGecko ID: zora

⏳ Waiting 6 seconds to respect rate limits...

🔎 @bankrbot (Bankr) on base
   Contract: 0x...
   ✅ Found CoinGecko ID: bankercoin-2

📊 Summary:
   ✅ Updated: 2
   ❌ Not found: 0
   📈 Total processed: 2

🎉 Updated tokens will now have hourly price data!
```

## Troubleshooting

### "429 Too Many Requests"
- Wait 1 minute and try again
- The script will resume from where it left off
- Consider getting a CoinGecko Pro API key

### "No CoinGecko ID found"
- Token might not be listed on CoinGecko yet
- Contract address might be incorrect
- Chain might not be supported by CoinGecko
- Manually verify on coingecko.com

