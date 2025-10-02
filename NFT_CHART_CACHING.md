# NFT Chart Data Caching Strategy

## Overview

Our NFT chart data system uses **aggressive caching** to minimize OpenSea API calls and provide fast response times.

## Performance

### Without Cache (Cold Start)
- **Time**: ~3-4 seconds
- **OpenSea API calls**: 1-50 requests (depending on sales volume)
- **Events fetched**: Up to 10,000

### With Cache (Warm)
- **Time**: ~1ms
- **OpenSea API calls**: 0
- **Speedup**: **3000x faster!**

## Caching Strategy

### Three-Level Cache System

```
1. Full Chart Data Cache
   Duration: 6 hours
   Key: opensea:chart:{chain}:{address}:{startDate}:{endDate}
   Size: Array of {date, floorPrice} objects
   
2. Individual Day Cache
   Duration: 24 hours
   Key: opensea:floor:historical:{chain}:{address}:{date}
   Size: Single number (floor price)
   
3. Current Price Cache
   Duration: 5 minutes
   Key: opensea:floor:current:{chain}:{address}
   Size: Single number (floor price)
```

### Why These Durations?

**6 hours for chart data:**
- Historical data rarely changes
- Charts don't need real-time updates
- Reduces API load dramatically
- Can request chart 1440x per day with only 4 API fetches

**24 hours for individual days:**
- Past days never change
- Perfect for historical queries
- Extremely efficient

**5 minutes for current price:**
- Balances freshness with API efficiency
- NFT floors don't change every second
- Good enough for user experience

## Fetch Limits

### Old Limits (Too Conservative)
- ❌ Max events: 1,000
- ❌ Max pages: 5
- ❌ Often incomplete data

### New Limits (Optimized)
- ✅ Max events: 10,000
- ✅ Max pages: 50
- ✅ Comprehensive data
- ✅ Still safe from runaway API calls

### Why 10,000 Events?

For most NFT collections:
- **Low volume**: 10-100 sales/month → Full history in 1 request
- **Medium volume**: 100-1,000 sales/month → Full 30 days
- **High volume**: 1,000+ sales/month → Representative sample

**Hypurr example:**
- Last 30 days: ~200 events
- Fetched in: 1 page (~2 seconds)
- Cached for: 6 hours
- Result: 4 data points for charting

## Storage Backend

### Deno KV (Production)
- **Type**: Distributed key-value store
- **Location**: Edge locations worldwide
- **Persistence**: Permanent
- **Speed**: Sub-millisecond reads
- **Limit**: 10 GB total

### In-Memory (Development)
- **Type**: JavaScript Map
- **Location**: Local process
- **Persistence**: Lost on restart
- **Speed**: Nanoseconds
- **Limit**: Available RAM

## API Response Format

### Chart Endpoint
```typescript
GET /api/price/nft-chart?chain=hyperliquid&address=0x...&days=30

Response:
{
  "chain": "hyperliquid",
  "address": "0x9125e2d6827a00b0f8330d6ef7bef07730bac685",
  "days": 30,              // Days requested
  "dataPoints": 4,         // Days with actual sales data
  "data": [
    { "date": "2025-09-29", "floorPrice": 1113 },
    { "date": "2025-10-01", "floorPrice": 1025 },
    { "date": "2025-10-02", "floorPrice": 1371 }
  ]
}
```

## Cache Keys Explained

### Chart Data Key
```
opensea:chart:hyperliquid:0x9125...:2025-09-01:2025-10-02
         ↓         ↓          ↓              ↓          ↓
      prefix    chain    contract      start date  end date
```

**Benefits:**
- Different date ranges cached separately
- 7-day chart and 30-day chart both cached
- Chain-specific (Ethereum chart ≠ Base chart)

### Individual Day Key
```
opensea:floor:historical:ethereum:0xbc4c...:2025-10-01
        ↓       ↓          ↓         ↓          ↓
     prefix  type       chain    contract    date
```

**Benefits:**
- Can fetch individual days without full chart
- Used by single-day historical endpoint
- Populated by chart function as side effect

## Cache Invalidation

### Automatic
- ✅ Time-based expiration (6 hours for charts)
- ✅ LRU eviction when storage full

### Manual (Future)
- [ ] Admin endpoint to clear cache
- [ ] Clear on-demand for specific collections
- [ ] Webhook from OpenSea for new sales

## Rate Limiting Considerations

### OpenSea API Limits
- **Free tier**: ~4 requests/second
- **Paid tier**: Higher limits

### Our Protection
1. **Caching**: Reduces requests by 99%+
2. **Page limit**: Max 50 pages per chart request
3. **No concurrent fetches**: Same chart only fetched once
4. **Exponential backoff**: On errors (future)

## Monitoring

### Key Metrics
- Cache hit rate
- Average response time
- OpenSea API call count
- Cache size/growth

### Logs to Watch
```bash
# Cache hit (good!)
✅ Using cached OpenSea chart data (4 days)

# API fetch (normal on first request)
📊 Fetching OpenSea sales events for hypurr-hyperevm from 2025-09-01 to 2025-10-02...
  Page 1: 200 events (total: 200)
✅ Fetched 200 total events from 1 pages
📈 Calculated floor prices for 4 days

# Rate limit (bad - need to slow down)
⚠️ OpenSea API error on page 3: 429
```

## Best Practices

### For Developers
1. **Always use the chart endpoint** for multi-day data
2. **Don't loop individual day requests** - very inefficient
3. **Request reasonable date ranges** (7, 30, 90 days)
4. **Monitor cache hit rates** in production

### For Users
1. Charts load instantly on refresh (cached)
2. New data appears within 6 hours
3. Current price always <5 minutes old

## Future Improvements

### Short Term
- [ ] Add cache warmup for popular collections
- [ ] Implement proper cache key namespacing
- [ ] Add cache statistics endpoint

### Long Term
- [ ] Store chart data in PostgreSQL for persistence
- [ ] Implement background refresh for active charts
- [ ] Add WebSocket support for real-time updates
- [ ] Build chart data pre-computation for top collections

## Example: Complete Flow

```typescript
// User requests Hypurr chart for last 30 days

// 1. Check cache
const cacheKey = "opensea:chart:hyperliquid:0x9125...:2025-09-01:2025-10-02"
const cached = await kv.get(cacheKey)

if (cached) {
  return cached  // ⚡ 1ms response
}

// 2. Fetch from OpenSea (cache miss)
const events = []
for (let page = 1; page <= 50; page++) {
  const pageEvents = await fetchOpenSeaPage(page)
  events.push(...pageEvents)
  if (pageEvents.length < 200) break  // Last page
}

// 3. Calculate floor prices
const chartData = groupByDayAndFindMinPrice(events)

// 4. Store in cache (6 hours TTL)
await kv.set(cacheKey, chartData, { expiresIn: 6 * 60 * 60 })

// 5. Return to user
return chartData  // First call: ~3 seconds
```

---

**Result**: Fast charts, minimal API calls, happy users! 📊✨

