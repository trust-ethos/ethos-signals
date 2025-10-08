# CoinGecko API Key Setup

## Overview
The application now supports CoinGecko paid plans (Demo/Pro/Enterprise) to avoid rate limiting issues.

## Getting Your API Key

1. Visit https://www.coingecko.com/en/api/pricing
2. Choose a plan:
   - **Demo**: $129/month (500 calls/minute)
   - **Pro**: $399/month (unlimited calls)
   - **Enterprise**: Custom pricing
3. After purchase, get your API key from the dashboard

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Add your API key to `.env`:
   ```
   COINGECKO_API_KEY=CG-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Restart your development server

## How It Works

The `utils/coingecko-api.ts` helper automatically:
- Detects if an API key is present
- **Switches to Pro API URL** (`pro-api.coingecko.com`) when key is detected
- Adds `x_cg_pro_api_key` parameter to all CoinGecko requests
- Adjusts rate limiting based on plan (faster with paid plans)
- Works seamlessly with or without an API key

### Important: Pro vs Free URLs
- **Free tier**: `api.coingecko.com` (no API key)
- **Pro plan**: `pro-api.coingecko.com` (with API key)

The helper automatically uses the correct URL based on whether an API key is configured.

## Where API Key is Used

The API key is automatically applied to all CoinGecko calls in:

### Core Price Functions
- `utils/price.ts` - Historical price lookups
- `routes/api/price/chart.ts` - Chart data proxy
- `routes/api/price/coingecko.ts` - Price API endpoint

### Token Metadata & Import Scripts
- `utils/coin-data.ts` - Token search and metadata
- `scripts/import-top-tokens.ts` - Bulk token imports
- `scripts/import-top-1000.ts` - Top 1000 tokens import
- `scripts/import-moralis.ts` - Moralis + CoinGecko hybrid
- `scripts/import-fast-1000.ts` - Fast import script
- `scripts/import-moralis-fast.ts` - Fast Moralis import
- `scripts/import-sample.ts` - Sample data import
- `scripts/import-test.ts` - Test imports

## Rate Limits

### Free Tier (No API Key)
- 10-50 calls/minute
- Slower delays between requests (1-2 seconds)
- May encounter 429 errors during heavy usage

### Demo Plan ($129/month)
- 500 calls/minute
- Faster delays (200ms)
- Stable API access
- 10,000 monthly credits

### Pro Plan ($399/month)
- Unlimited calls
- No rate limiting
- Priority support
- 50,000+ monthly credits

## Testing

To verify your API key is working:

```bash
# Check if key is loaded
deno eval "console.log(Deno.env.get('COINGECKO_API_KEY'))"

# Test a CoinGecko call
deno run -A --env scripts/import-test.ts
```

You should see faster response times and no 429 errors.

## Fallback Behavior

If no API key is provided:
- Free tier rate limits apply
- Automatic delays between requests
- May experience 429 errors during bulk operations
- All functionality still works, just slower

## Best Practices

1. **Import Scripts**: Run during off-peak hours
2. **Caching**: We cache all price data to minimize API calls
3. **Monitoring**: Watch for 429 errors in logs
4. **Rotation**: For high-volume apps, consider multiple API keys

## Troubleshooting

### Still Getting 429 Errors?
- Verify API key is in `.env` file
- Restart the server
- Check key hasn't expired
- Verify plan limits

### API Key Not Working?
- Ensure key starts with `CG-`
- No spaces in `.env` file
- Key is on same line as `COINGECKO_API_KEY=`
- File has no BOM or special characters

## Cost Optimization

Even with a paid plan, we optimize costs by:
- **5-minute cache** for current prices
- **24-hour cache** for historical prices
- **DefiLlama fallback** for most price queries
- **Moralis API** for NFT data

Most price requests hit our cache, not CoinGecko!
