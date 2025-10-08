# Trading View Chart Enhancements

## New Features

### 1. **Configurable Date Ranges**
Users can now select different date ranges to view price data:
- **30d**: Last 30 days
- **90d**: Last 90 days (default)
- **180d**: Last 6 months  
- **1y**: Last year
- **All**: From earliest signal or 1 year, whichever is earlier

### 2. **Time Interval Controls** (CoinGecko only)
For assets with CoinGecko data, users can aggregate price data by different intervals:
- **1h**: Hourly candles (averaged from 5-minute CoinGecko data)
- **4h**: 4-hour candles
- **1d**: Daily candles (default)

**Note**: DefiLlama-based tokens only support daily data, so interval selection is not available for them.

### 3. **Data Aggregation**
- CoinGecko provides 5-minute granular data through `market_chart/range` API
- The chart automatically aggregates this data based on the selected time interval
- Aggregation uses time-weighted averaging for accurate representation

### 4. **Performance Improvements**
- Parallel fetching of daily price data for DefiLlama tokens
- Loading indicators during data fetches
- Efficient data caching (5-minute cache on price endpoints)

## UI Changes

### Chart Controls Bar
The chart now includes a control bar above the graph with:
1. **Time Interval Pills** (for CoinGecko only): 1h | 4h | 1d
2. **Date Range Pills**: 30D | 90D | 180D | 1Y | ALL

Active selections are highlighted in blue, inactive in gray. Controls are disabled during loading.

## Technical Details

### Data Sources
- **CoinGecko**: Minute-level data via `/api/price/chart` (uses Pro API)
- **DefiLlama**: Daily data via `/api/price/token` (hourly not supported)

### Aggregation Algorithm
```typescript
// For 1h interval: bucket = floor(timestamp / 3600) * 3600
// For 4h interval: bucket = floor(timestamp / 14400) * 14400  
// For 1d interval: bucket by calendar day (YYYY-MM-DD)
```

Prices within each bucket are averaged to create smooth candles.

## User Experience

### Before
- Chart only showed data from earliest signal to now
- No control over time range or granularity
- Limited historical context

### After
- Flexible date ranges (30d, 90d, 180d, 1y, all)
- Adjustable time intervals for detailed analysis
- More historical context beyond just signals
- Responsive controls that adapt to loading states

## Examples

### Example 1: Recent Performance
Select **30d** + **1h** to see detailed hourly price movements over the last month

### Example 2: Long-term Trends
Select **1y** + **1d** to see daily trends over the entire year

### Example 3: Signal Context
Select **All** to see all signals in context from the beginning

## Future Enhancements (Ideas)
- [ ] Custom date range picker
- [ ] Volume overlay (if available)
- [ ] Candlestick charts (OHLC data)
- [ ] Export chart data as CSV
- [ ] Zoom and pan controls
- [ ] Additional indicators (MA, RSI, etc.)
