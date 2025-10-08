# DexScreener Integration for New Tokens

## Problem
Newly launched tokens aren't tracked by CoinGecko or DefiLlama until they reach certain volume/age thresholds. This creates a gap where we can't show price data for brand new tokens, even though they're actively trading on DEXs.

## Solution
**DexScreener** tracks tokens from the moment they launch on any DEX. We now use it as a fallback data source!

## How It Works

### Price Data Waterfall

```
1. Try CoinGecko (if coinGeckoId exists)
   ↓ (if not available)
2. Try DefiLlama (chain + contract address)
   ↓ (if not available)
3. Try DexScreener (contract address)
   ✅ Returns real-time DEX price
```

### Architecture

**New Files:**
- `utils/dexscreener-api.ts` - Core integration
- `routes/api/price/dexscreener.ts` - API endpoint

**Updated Files:**
- `routes/api/price/token.ts` - Added DexScreener fallback

## API Endpoints

### 1. Direct DexScreener Endpoint

```bash
GET /api/price/dexscreener?address={CONTRACT_ADDRESS}
```

**Response:**
```json
{
  "price": 0.3617
}
```

### 2. Main Token Endpoint (with automatic fallback)

```bash
GET /api/price/token?chain=solana&address={CONTRACT_ADDRESS}
```

This automatically tries:
1. DefiLlama → 
2. DexScreener (if DefiLlama fails)

### 3. Full Token Info

```bash
GET /api/price/dexscreener?address={CONTRACT_ADDRESS}&info=true
```

**Response includes:**
- All trading pairs
- Liquidity per DEX
- 24h volume
- Price changes (5m, 1h, 6h, 24h)
- DEX names (Raydium, Orca, Meteora, etc.)

## Supported Chains

DexScreener supports:
- ✅ Solana
- ✅ Ethereum
- ✅ Base
- ✅ BSC
- ✅ Arbitrum
- ✅ Polygon
- ✅ 100+ other chains

## Example: Addicted Token

**Contract:** `E2gLkTXSbbTMmJM19xkquawun2ShJSi7G59A8c2PtbFa`

This token is:
- ❌ Not on CoinGecko (too new)
- ⚠️ Limited on DefiLlama
- ✅ Fully tracked on DexScreener

**DexScreener provides:**
- Real-time price: $0.36
- Liquidity: $1.6M
- 24h Volume: $6.4M
- Main DEX: Meteora
- Pair: WEED/SOL

## Benefits

### 1. **Support New Tokens Immediately**
- Track tokens from day 1 of launch
- Don't wait for CoinGecko/DefiLlama listing

### 2. **Real-Time DEX Prices**
- DexScreener aggregates from all DEXs
- Updates every minute
- Shows actual trading prices

### 3. **Better Price Discovery**
- See which DEX has best liquidity
- Compare prices across pairs
- Identify best trading venue

### 4. **Reliability**
- If one data source fails, fallback to another
- Always show *some* price data
- Graceful degradation

## Limitations

### Historical Data
DexScreener API **does not provide historical price data** via their public API. For historical prices, we still need:
- CoinGecko (preferred - has 5-min data)
- DefiLlama (daily data only)

**Workaround:** For brand new tokens without historical data:
- Show "No historical data available" message
- Display only current price
- Wait for CoinGecko/DefiLlama to pick up the token

### Rate Limits
DexScreener API is free but has rate limits:
- **Public API**: ~300 requests/minute
- **Caching**: We cache for 1 minute to stay within limits

## When to Use Each Source

| Source | Best For | Data Granularity | Historical Data |
|--------|----------|------------------|-----------------|
| **CoinGecko** | Established tokens | 5 minutes | ✅ Yes |
| **DefiLlama** | Cross-chain tokens | Daily | ✅ Yes |
| **DexScreener** | New/DEX tokens | Real-time | ❌ No |

## Configuration

No configuration needed! The fallback is automatic.

**Optional:** To force DexScreener usage:
```typescript
import { getDexScreenerPriceNow } from "./utils/dexscreener-api.ts";

const price = await getDexScreenerPriceNow("solana", contractAddress);
```

## Monitoring

Server logs will show when DexScreener is used:
```
⚠️ DefiLlama has no price for solana:E2g..., trying DexScreener...
✅ Found price on DexScreener: $0.3617
```

## Future Enhancements

Potential improvements:
- [ ] Integrate DexScreener websocket for real-time updates
- [ ] Store DexScreener data periodically to build our own history
- [ ] Show DEX liquidity and volume on token pages
- [ ] Add "Best DEX to trade" recommendations
- [ ] Track price impact for different trade sizes

## Testing

```bash
# Test with Addicted token (new, not on CoinGecko)
curl "http://localhost:8000/api/price/token?chain=solana&address=E2gLkTXSbbTMmJM19xkquawun2ShJSi7G59A8c2PtbFa"

# Should return price from DexScreener if DefiLlama doesn't have it
```

---

**Result:** We can now track ANY token that's trading on a DEX, even if it launched 5 minutes ago! 🚀

