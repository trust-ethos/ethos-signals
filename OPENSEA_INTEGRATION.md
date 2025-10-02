# OpenSea API Integration for NFT Floor Prices

## Overview

We've integrated **OpenSea API** to get NFT floor prices for collections on **any blockchain**, including newly launched chains like **Hyperliquid**!

This solves the problem of tracking NFT prices on chains that aren't yet supported by Reservoir or Moralis.

## Why OpenSea?

### Coverage
- ✅ **All major chains**: Ethereum, Base, Polygon, Arbitrum, Optimism, BSC, Avalanche
- ✅ **New chains**: Hyperliquid and others
- ✅ **Largest NFT marketplace**: Most comprehensive data

### Use Case: Hypurr NFTs
**Problem:** Hypurr is a highly valuable NFT collection (floor ~$62k-$68k) on Hyperliquid chain, but:
- ❌ Reservoir doesn't index Hyperliquid yet
- ❌ Moralis doesn't support Hyperliquid
- ❌ DexScreener only tracks fungible tokens

**Solution:** OpenSea tracks Hypurr and we can now fetch its floor price!

## Data Source Priority

Our NFT floor price system uses a multi-source waterfall:

```
1. Reservoir (Ethereum/Base only)
   ↓ (if not available)
2. Moralis (Ethereum/Base/BSC)
   ↓ (if not available)
3. OpenSea (ALL CHAINS including Hyperliquid)
   ✅ Fallback that works for everything
```

## Setup

### 1. Get OpenSea API Key

1. Go to [OpenSea API Keys](https://docs.opensea.io/reference/api-keys)
2. Sign up / Log in
3. Create a new API key
4. Copy your key

### 2. Add to Environment

Add to your `.env` file:

```bash
OPENSEA_API_KEY=your_opensea_api_key_here
```

### 3. Deploy to Production

Update your Deno Deploy environment variables:
- Variable name: `OPENSEA_API_KEY`
- Value: Your OpenSea API key

## API Endpoints

### Get NFT Floor Price

```bash
GET /api/price/nft?chain=hyperliquid&address=0x9125e2d6827a00b0f8330d6ef7bef07730bac685
```

**Supported Chains:**
- `ethereum`
- `base`
- `bsc`
- `hyperliquid` ✨
- `polygon`
- `arbitrum`
- `optimism`

**Response:**
```json
{
  "floorPrice": 62.5
}
```

### Example: Hypurr NFT

```bash
# Get current Hypurr floor price
curl "http://localhost:8000/api/price/nft?chain=hyperliquid&address=0x9125e2d6827a00b0f8330d6ef7bef07730bac685"

# Returns something like:
{
  "floorPrice": 68.7
}
```

## How It Works

### Automatic Fallback

When you request an NFT floor price:

1. **If chain is Ethereum or Base:**
   - Try Reservoir first (best historical data)
   - Fall back to Moralis if Reservoir fails
   - Fall back to OpenSea if both fail

2. **If chain is BSC:**
   - Try Moralis first
   - Fall back to OpenSea if Moralis fails

3. **If chain is Hyperliquid (or any other):**
   - **Only OpenSea works** → Direct to OpenSea API

Server logs show the fallback:
```
⚠️ Reservoir/Moralis has no price for hyperliquid:0x9125..., trying OpenSea...
✅ Found floor price on OpenSea: 68.7 ETH
```

### Caching

- **Cache duration**: 5 minutes
- **Why**: Balance freshness vs API rate limits
- **Storage**: Deno KV (production) or in-memory (local dev)

## OpenSea API Details

### Collection Stats Endpoint

```
GET https://api.opensea.io/api/v2/collections/{CONTRACT_ADDRESS}/stats
```

**Response includes:**
- `total.floor_price` - Current floor price in native currency
- `total.volume` - Total trading volume
- `total.sales` - Number of sales
- `total.num_owners` - Number of unique owners
- `total.market_cap` - Total market cap

### Rate Limits

OpenSea API has generous rate limits for basic tier:
- **Free tier**: ~4 requests/second
- **Caching**: We cache for 5 minutes, so actual API calls are minimal

## Benefits

### 1. **Universal Chain Support**
Track NFTs on ANY chain that OpenSea supports, including:
- Established chains (Ethereum, Polygon, Base)
- New L2s (Arbitrum, Optimism, Base)
- Cutting-edge L1s (Hyperliquid)

### 2. **High-Value NFTs**
Track extremely valuable collections like:
- Hypurr (~$68k floor)
- Bored Apes
- CryptoPunks
- New launches

### 3. **Reliability**
OpenSea is:
- The largest NFT marketplace
- Battle-tested infrastructure
- Always up-to-date

### 4. **Graceful Degradation**
If one data source fails, automatically fallback to the next:
- Reservoir fails → try Moralis
- Moralis fails → try OpenSea
- **Always show some price data!**

## Limitations

### Historical Data

OpenSea API v2 **does not provide historical floor prices** directly. For historical data:
- ✅ Use Reservoir (Ethereum/Base, up to 2 years)
- ✅ Use Moralis (Ethereum/Base/BSC, up to 30 days)
- ⚠️ OpenSea current price only

**Workaround for new chains:**
- Store OpenSea floor price snapshots ourselves
- Use current price as fallback for historical queries
- Wait for chain to be added to Reservoir/Moralis

### Chain Detection

OpenSea API v2 identifies collections by contract address, not by chain. This means:
- **Pro**: Simple API (just need contract address)
- **Con**: Can't explicitly filter by chain in API

For now, we assume the contract address is unique enough to identify the collection.

## Testing

### Local Testing

```bash
# 1. Add OPENSEA_API_KEY to your .env file
echo "OPENSEA_API_KEY=your_key_here" >> .env

# 2. Start dev server
deno task start

# 3. Test Hypurr NFT (Hyperliquid chain)
curl "http://localhost:8000/api/price/nft?chain=hyperliquid&address=0x9125e2d6827a00b0f8330d6ef7bef07730bac685"

# Expected: { "floorPrice": 68.7 }
```

### Production Testing

```bash
# Test on deployed site
curl "https://signals.ethos.network/api/price/nft?chain=hyperliquid&address=0x9125e2d6827a00b0f8330d6ef7bef07730bac685"
```

## Monitoring

Check server logs for OpenSea usage:
```
⚠️ Reservoir/Moralis has no price for hyperliquid:0x9125..., trying OpenSea...
✅ Found floor price on OpenSea: 68.7 ETH
```

If you see many OpenSea fallbacks for Ethereum/Base NFTs, it might indicate:
- Reservoir/Moralis API issues
- Need to check API keys
- Rate limiting on primary sources

## Future Enhancements

Potential improvements:
- [ ] Store OpenSea snapshots to build our own historical data
- [ ] Integrate OpenSea Events API for sale tracking
- [ ] Show marketplace volume alongside floor price
- [ ] Track rarity data for individual NFTs
- [ ] Multi-marketplace comparison (OpenSea vs others)

## Related Files

**New files:**
- `utils/opensea-api.ts` - OpenSea API integration
- `OPENSEA_INTEGRATION.md` - This documentation

**Updated files:**
- `utils/nft-price.ts` - Added OpenSea fallback
- `routes/api/price/nft.ts` - Support for more chains
- `env.example` - Added OPENSEA_API_KEY

---

**Result:** We can now track NFT floor prices on ANY chain, including brand new ones like Hyperliquid! 🚀

