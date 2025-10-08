# Chart Historical Data Updates

## Changes Made

Extended the price chart to show more historical context around signals.

### Before
- Only showed data from earliest signal to now
- DefiLlama capped at 90 days
- No padding/context before or after signals

### After
- Shows up to **1 year** of historical data
- Adds **60 days padding before** earliest signal
- Adds **30 days padding after** latest signal (or extends to now)
- Better visualization context for trends

### Date Range Logic

```
Start Time = MAX(1 year ago, earliest signal - 60 days)
End Time = MAX(now, latest signal + 30 days)
```

This ensures:
- ✅ You see trends before the first call
- ✅ You see continuation after the last call
- ✅ Maximum 1 year of data (performance)
- ✅ CoinGecko: Full historical support
- ✅ DefiLlama: Increased from 90 to 365 days

### Examples

**Scenario 1: Recent signals**
- First signal: 30 days ago
- Shows: 90 days before first signal → now
- Total: ~120 days of context

**Scenario 2: Old signals**
- First signal: 6 months ago
- Shows: 1 year of data (max cap)
- Total: 365 days

**Scenario 3: Very old signals**
- First signal: 2 years ago
- Shows: Last 1 year only
- Total: 365 days (capped for performance)

### Benefits

1. **Better Context**: See price trends before signals
2. **Continuation**: See what happened after the last signal
3. **Performance**: Capped at 1 year to avoid slow loads
4. **Flexibility**: Adapts to signal timing automatically
