# Price Caching Strategy

## Overview
To avoid abusing third-party APIs (DefiLlama, Moralis, Reservoir, CoinGecko), we implement a tiered caching strategy with different expiration times based on data volatility.

## Cache Duration Strategy

### Historical Prices (24 hour cache)
Historical prices don't change, so we cache them for 24 hours:
- `getDefiLlamaTokenPriceAt()` - Daily token prices
- `getDefiLlamaTokenPriceAtTimestamp()` - Precise timestamp prices
- `getCoinGeckoPriceAtTimestamp()` - CoinGecko historical prices
- `getMoralisNFTFloorAt()` - Historical NFT floor prices
- `getReservoirHistoricalFloor()` - Reservoir historical floor prices

### Current/Live Prices (5 minute cache)
Live prices change frequently but we cache for 5 minutes to prevent API abuse:
- `getDefiLlamaTokenPriceNow()` - Current token prices
- `getMoralisNFTFloorNow()` - Current NFT floor prices
- Current prices via CoinGecko API endpoint

## Cache Keys

### Token Prices
- Historical: `llama:token:daily:{chain}_{address}:{date}`
- Timestamp: `llama:token:timestamp:{chain}:{address}:{timestamp}`
- Current: `llama:token:current:{chain}_{address}`
- CoinGecko: `coingecko:timestamp:{coinGeckoId}:{timestamp}`

### NFT Floor Prices
- Historical: `hybrid:nft:daily:{chain}:{address}:{date}`
- Current: `nft:floor:current:{chain}:{address}`
- Reservoir: `reservoir:historical:{chain}:{address}:{date}`

## Implementation Details

### Database Storage
Prices are cached in the `price_cache` table with:
- `cache_key` (TEXT) - Unique identifier
- `price` (NUMERIC) - The cached price value
- `cached_at` (TIMESTAMPTZ) - When it was cached
- `expires_at` (TIMESTAMPTZ) - When it expires

### Cache Functions
```typescript
getCachedPrice(cacheKey: string): Promise<number | null>
setCachedPrice(cacheKey: string, price: number, expirationHours: number): Promise<boolean>
```

## Benefits

1. **Reduced API Calls**: Same price requests within 5 minutes return cached data
2. **Cost Savings**: Fewer API calls means lower costs (if using paid tiers)
3. **Performance**: Database reads are faster than external API calls
4. **Reliability**: Cached data available even if external APIs are down
5. **Rate Limit Protection**: Prevents hitting API rate limits

## Cache Expiration

The cache automatically expires based on the `expires_at` timestamp. A cleanup function can periodically remove expired entries:

```typescript
cleanupExpiredPriceCache(): Promise<void>
```

## Example Cache Lifecycle

1. User views signal with Aster token (BSC)
2. System checks cache: `llama:token:current:bsc_0x000ae314e2a2172a039b26378814c252734f556a`
3. Cache miss → Fetch from DefiLlama API
4. Store in cache with 5 minute expiration
5. Next 5 minutes: All requests return cached value (no API calls)
6. After 5 minutes: Cache expires, next request fetches fresh data

## Monitoring

Consider adding metrics to track:
- Cache hit rate
- API call frequency
- Cache size growth
- Most frequently requested prices
